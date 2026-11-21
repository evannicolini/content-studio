/* SK.interview: "Your dream outcome", Kayla's live voice interview. One component, hosted by the sign-up (/start/), the waitlist
   (/early-access/) and, later, the app's onboarding. The server half is worker/src/dream.js (the waitlist Worker).

     var iv = SK.interview({
       host,                        an empty element; the card is drawn into it
       api,                         the Worker's origin, e.g. "https://studio-waitlist.studio-licence.workers.dev"
       kind,                        "signup" | "waitlist"
       token: () => access_token,   (sign-up) the Supabase session; null on the waitlist
       storeKey,                    where this browser remembers the answer's id (localStorage)
       say: (key) => Promise,       Kayla says a line (resolves when she's done); keys: ask nudge thanks back time prior
       talking: () => bool,         is she talking right now (her bars in the card move)
       sfx: (name) => {},           "ask" (the mic opens) | "send" (it stops) | "done" (sent) | "tick"
       duck: (on) => {},            the music bed under the listening
       onChange: () => {},          ready() may have changed: refresh the page's Continue
     });
     iv.open()   the step is on screen: Kayla asks, then the mic opens by itself
     iv.leave()  the step is gone (Back): stop listening; nothing is lost
     iv.ready()  may Continue be pressed
     iv.next()   Continue: the first press while listening stops and shows the words to edit; then it sends.
                 Resolves { text, words, seconds, nudged, at } when it's in, or null when it's not done yet (a nudge, a stop).
     iv.id()     the answer's id (the waitlist sends it with /join)

   Never lose a word: the audio goes up live (Deepgram Nova-3 through the Worker) and every phrase is saved the moment it's heard.
   The audio of the last stretch stays in this page's memory (never on disk) until a saved phrase covers it; if the stream
   drops, that stretch is sent again and transcribed on its own (Whisper). The words are mirrored in localStorage, and the
   answer comes back after a reload. No recording is kept anywhere. */
(function () {
  var SK = (window.SK = window.SK || {});
  var SR = 16000, FRAME = 1600, LIMIT = 180, WARN = 150, MIN_WORDS = 25;
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var wordsOf = function (s) { var m = String(s || "").match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu); return m ? m.length : 0; };
  var mmss = function (s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2); };

  /* the same rules as the server (worker/src/dream.js): phrases in clock order, a repair of a stretch already covered left out;
     then their edit plus the phrases they hadn't seen */
  function stitch(parts, edited, seen) {
    var ps = parts.slice().sort(function (a, b) { return a.t0 - b.t0 || (a.src === "nova" ? -1 : 1); }), acc = [];
    ps.forEach(function (p) {
      var len = Math.max(.01, p.t1 - p.t0), cov = 0;
      acc.forEach(function (a) { cov += Math.max(0, Math.min(a.t1, p.t1) - Math.max(a.t0, p.t0)); });
      if (cov / len <= .5) acc.push(p);
    });
    var had = {}; (seen || []).forEach(function (i) { had[i] = 1; });
    var said = join(acc.filter(function (p) { return p.text && (edited == null || !had[p.id]); }).map(function (p) { return p.text; }));
    var base = edited == null ? "" : String(edited).trim();
    return base && said ? base + " " + said : base || said;
  }
  var bare = function (w) { return String(w || "").toLowerCase().replace(/[^\p{L}\p{N}']/gu, ""); };
  function join(texts) {   /* a word repeated exactly at a seam between two phrases is said once */
    var out = "";
    texts.forEach(function (t0) {
      var t = String(t0 || "").trim(); if (!t) return;
      if (out) { var last = out.split(/\s+/).pop(), first = t.split(/\s+/)[0]; if (bare(last) && bare(last) === bare(first)) t = t.split(/\s+/).slice(1).join(" "); }
      out = out ? (t ? out + " " + t : out) : t;
    });
    return out.replace(/\s+/g, " ").trim();
  }
  function covers(parts) {   /* a live phrase nothing follows covers only up to its last whole word (the repair hears a cut word in full) */
    return parts.map(function (p) {
      if (p.src !== "nova" || p.w1 == null || !(p.w1 < p.t1)) return p;
      var followed = parts.some(function (q) { return q !== p && q.t0 >= p.t1 - .05 && q.t0 <= p.t1 + .3; });
      return followed ? p : { id: p.id, t0: p.t0, t1: p.w1, text: p.text, src: p.src };
    });
  }
  function gaps(parts, t0, t1, min) {
    min = min == null ? .35 : min;
    var cov = covers(parts).map(function (p) { return [Math.max(t0, p.t0), Math.min(t1, p.t1)]; }).filter(function (c) { return c[1] > c[0]; }).sort(function (x, y) { return x[0] - y[0]; });
    var out = [], at = t0;
    cov.forEach(function (c) { if (c[0] - at >= min) out.push([at, c[0]]); at = Math.max(at, c[1]); });
    if (t1 - at >= min) out.push([at, t1]);
    return out;
  }
  SK.dreamStitch = stitch;

  /* the microphone, resampled to 16 kHz PCM16 in an AudioWorklet (100 ms frames) */
  var WORKLET = "class P extends AudioWorkletProcessor{constructor(o){super();this.r=o.processorOptions.rate/16000;this.a=0;this.n=0;this.p=0;this.o=new Int16Array(1600);this.k=0}" +
    "process(i){var c=i[0]&&i[0][0];if(!c)return true;for(var j=0;j<c.length;j++){this.a+=c[j];this.n++;this.p+=1;if(this.p>=this.r){this.p-=this.r;var v=this.a/this.n;this.a=0;this.n=0;" +
    "v=v>1?1:v<-1?-1:v;this.o[this.k++]=v*32767;if(this.k===1600){this.port.postMessage(this.o.slice(0));this.k=0}}}return true}}registerProcessor('sk-pcm',P);";
  function Mic(onFrame, onLost) {
    var stream = null, ac = null, node = null, src = null, an = null, sp = null, sink = null, alive = false;
    function open() {
      var md = navigator.mediaDevices;
      if (!md || !md.getUserMedia) return Promise.reject(new Error("nomic"));
      return md.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } }).then(function (s) {
        stream = s; alive = true;
        var AC = window.AudioContext || window.webkitAudioContext; ac = new AC();
        src = ac.createMediaStreamSource(stream); an = ac.createAnalyser(); an.fftSize = 512; src.connect(an);
        sink = ac.createGain(); sink.gain.value = 0; sink.connect(ac.destination);   /* Safari only runs a node that ends somewhere */
        stream.getAudioTracks().forEach(function (t) { t.addEventListener("ended", function () { if (alive) onLost("ended"); }); });
        var ready = ac.state === "suspended" ? ac.resume() : Promise.resolve();
        return ready.then(function () {
          if (ac.audioWorklet && window.AudioWorkletNode) {
            var url = URL.createObjectURL(new Blob([WORKLET], { type: "application/javascript" }));
            return ac.audioWorklet.addModule(url).then(function () {
              node = new AudioWorkletNode(ac, "sk-pcm", { processorOptions: { rate: ac.sampleRate } });
              node.port.onmessage = function (e) { if (alive) onFrame(e.data); };
              src.connect(node); node.connect(sink);
            });
          }
          /* an old browser: the same, on the main thread */
          var r = ac.sampleRate / SR, a = 0, n = 0, p = 0, o = new Int16Array(FRAME), k = 0;
          sp = ac.createScriptProcessor(4096, 1, 1);
          sp.onaudioprocess = function (e) {
            var c = e.inputBuffer.getChannelData(0);
            for (var j = 0; j < c.length; j++) { a += c[j]; n++; p += 1; if (p >= r) { p -= r; var v = a / n; a = 0; n = 0; v = v > 1 ? 1 : v < -1 ? -1 : v; o[k++] = v * 32767; if (k === FRAME) { if (alive) onFrame(o.slice(0)); k = 0; } } }
          };
          src.connect(sp); sp.connect(sink);
        });
      });
    }
    var lv = new Uint8Array(256);
    function level() { if (!an) return 0; an.getByteTimeDomainData(lv); var s = 0; for (var i = 0; i < lv.length; i++) { var v = (lv[i] - 128) / 128; s += v * v; } return Math.min(1, Math.sqrt(s / lv.length) * 4.2); }
    function close() {
      alive = false;
      try { if (node) { node.port.onmessage = null; node.disconnect(); } if (sp) { sp.onaudioprocess = null; sp.disconnect(); } if (src) src.disconnect(); } catch (e) {}
      if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
      if (ac) { try { ac.close(); } catch (e) {} }
      stream = ac = node = src = an = sp = sink = null;
    }
    return { open: open, close: close, level: level, on: function () { return alive; } };
  }

  SK.interview = function (o) {
    var host = o.host, api = String(o.api || "").replace(/\/+$/, ""), kind = o.kind === "signup" ? "signup" : "waitlist";
    var noop = function () {}, sfx = o.sfx || noop, duck = o.duck || noop, changed = o.onChange || noop;
    var say = o.say || function () { return Promise.resolve(); }, talking = o.talking || function () { return false; };

    /* ---------------- the card ---------------- */
    host.innerHTML =
      '<div class="ivw" data-st="idle">' +
        '<div class="ivw-card">' +
          '<span class="ivw-beam" data-beam="cx" data-active aria-hidden="true"><span data-beam-bloom></span></span>' +
          '<div class="ivw-top">' +
            '<span class="ivw-kay"><img src="assets/kayla.jpg" alt="" width="80" height="80"><span class="ivw-kw" aria-hidden="true">' + new Array(9).join("<i></i>") + "</span></span>" +
            '<span class="ivw-who"><b>Kayla</b><em data-iv-status>is asking</em></span>' +
            '<span class="ivw-saved" data-iv-saved hidden><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7"/></svg><span data-iv-saved-t>Saved</span></span>' +
          "</div>" +
          '<div class="ivw-say" data-iv-say><p class="ivw-words" data-iv-words aria-live="polite"></p><p class="ivw-ph" data-iv-ph>Start whenever you\'re ready. Just talk.</p></div>' +
          '<label class="ivw-edit-l"><span class="sr">Your answer</span><textarea class="ivw-edit" data-iv-edit rows="5" hidden placeholder="Picture Studio working perfectly for you. What does it look like?"></textarea></label>' +
          '<p class="ivw-note" data-iv-note role="status"></p>' +
          '<div class="ivw-bar">' +
            '<button type="button" class="ivw-mic" data-iv-mic aria-label="Start talking">' +
              '<svg class="ivw-ring" viewBox="0 0 64 64" aria-hidden="true"><circle class="bg" cx="32" cy="32" r="29"/><circle class="fg" data-iv-ring cx="32" cy="32" r="29"/></svg>' +
              '<svg class="ivw-mi" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>' +
              '<span class="ivw-sq" aria-hidden="true"></span>' +
            "</button>" +
            '<span class="ivw-lv" data-iv-lv aria-hidden="true">' + new Array(25).join("<i></i>") + "</span>" +
            '<span class="ivw-time" data-iv-time>0:00</span>' +
            '<button type="button" class="ivw-done" data-iv-done data-gx><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7"/></svg><span>That\'s it</span></button>' +
          "</div>" +
          '<div class="ivw-alt"><button type="button" class="ivw-type" data-iv-type>Rather type?</button><span class="ivw-priv">Your voice becomes text. We don\'t keep the recording.</span></div>' +
          '<div class="ivw-tap" data-iv-tap hidden><button type="button" class="ivw-tapb" data-iv-tapb data-gx="hot"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg><span>Tap to talk</span></button>' +
            '<p>Your voice becomes text as you talk. We don\'t keep the recording.</p><button type="button" class="ivw-type" data-iv-type2>Rather type?</button></div>' +
        "</div>" +
      "</div>";
    var root = host.firstChild, q = function (s) { return root.querySelector(s); };
    var wordsEl = q("[data-iv-words]"), ph = q("[data-iv-ph]"), edit = q("[data-iv-edit]"), note = q("[data-iv-note]"), status = q("[data-iv-status]");
    var micB = q("[data-iv-mic]"), doneB = q("[data-iv-done]"), ring = q("[data-iv-ring]"), timeEl = q("[data-iv-time]"), lvEl = q("[data-iv-lv]"), savedEl = q("[data-iv-saved]"), savedT = q("[data-iv-saved-t]");
    var tap = q("[data-iv-tap]"), kayEl = q(".ivw-kay");
    var RING = 2 * Math.PI * 29; ring.style.strokeDasharray = RING.toFixed(2);

    /* ---------------- what we know ---------------- */
    var st = "idle", id = null, parts = [], edited = null, seen = [], nudged = false, final = null, prior = null;
    var clock = 0, startAt = 0;          /* the answer's audio clock: seconds heard in all (across reloads) */
    var frames = [];                     /* { t0, pcm } not yet covered by a saved phrase: memory only */
    var interim = { t0: 0, text: "" }, ws = null, wsBase = 0, wsOpen = false, wsTries = 0, chunkMode = false, liveOn = false;
    var pumping = false, pumpT = 0, failN = 0, offline = false, opened = false, startP = null, userEdited = false;
    var mic = Mic(onFrame, function () { if (st === "listening") stop("lost"); });
    var store = function (v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(o.storeKey) || "null"); localStorage.setItem(o.storeKey, JSON.stringify(v)); } catch (e) { return null; } };
    var mirror = function () { store({ id: id, text: textNow(), at: Date.now() }); };
    function textNow() { return stitch(parts, edited, seen); }
    function setState(s) { st = s; root.setAttribute("data-st", s); paintStatus(); changed(); }
    function paintStatus() {
      status.textContent = st === "asking" ? "is asking" : st === "listening" ? "is listening" : st === "stopping" ? "is catching every word" : st === "review" ? "has it all" : st === "typing" ? "is reading along" : st === "permission" ? "is ready when you are" : st === "nudge" ? "wants a little more" : "";
    }
    function saved(state, t) { savedEl.hidden = !state; savedEl.setAttribute("data-s", state || ""); savedT.textContent = t || ""; }

    /* ---------------- the server ---------------- */
    function post(path, body, raw) {
      return fetch(api + path, raw ? { method: "POST", headers: { "Content-Type": "application/octet-stream" }, body: body } : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || !j.ok) { var e = new Error(j.error || "http" + r.status); e.status = r.status; throw e; } return j; }); });
    }
    function take(j) {   /* the server's view of the answer */
      id = j.id; parts = j.parts || []; if (j.edited != null) edited = j.edited; seen = j.seen || seen; nudged = nudged || !!j.nudged;
      clock = Math.max(clock, j.audio_s || 0, maxT());
      if (j.status === "final") final = { text: j.text, words: j.words };
      mirror();
    }
    function merge(list) { list.forEach(function (p) { var had = null; parts.forEach(function (x) { if (x.id === p.id) had = x; }); if (had) { had.t0 = p.t0; had.t1 = p.t1; had.w1 = p.w1; had.text = p.text; } else parts.push(p); }); }   /* the server's word on each phrase wins (a cut phrase is trimmed) */
    function maxT() { var m = 0; parts.forEach(function (p) { m = Math.max(m, p.t1); }); return m; }
    function begin() {   /* the answer: made, or brought back (retried until the network lets it) */
      if (startP) return startP;
      var mem = store();
      startP = new Promise(function (res) {
        (function tryIt(n) {
          post("/dream/start", { id: mem && mem.id, kind: kind, access_token: o.token ? o.token() : null }).then(function (j) { take(j); if (j.prior) prior = j.prior; offline = false; res(j); })
            .catch(function (e) {   /* offline, busy or a hiccup: keep trying; what they say waits in this page meanwhile */
              offline = true; if (mem && mem.text && !parts.length && edited == null) { edited = mem.text; paintWords(true); }
              saved("off", e.status === 401 ? "Reconnecting your account. Every word stays on this page." : "Offline. Every word stays on this page.");
              setTimeout(function () { tryIt(n + 1); }, Math.min(e.status === 429 ? 20000 : 8000, 1000 * Math.pow(1.6, n)));
            });
        })(0);
      });
      return startP;
    }

    /* ---------------- the words on screen ---------------- */
    var shown = "";
    function paintWords(full) {
      var t = textNow();
      if (st === "review" || st === "typing") {
        if (userEdited) {   /* words that land after they edited: added to the end of their text, so what they see is what's sent */
          var had = {}; seen.forEach(function (i) { had[i] = 1; });
          var late = parts.filter(function (p) { return !had[p.id] && p.text; }).sort(function (a, b) { return a.t0 - b.t0; });
          if (late.length) { edit.value = (edit.value.trim() + " " + late.map(function (p) { return p.text.trim(); }).join(" ")).trim(); edited = edit.value; seen = parts.map(function (p) { return p.id; }); save(); t = textNow(); }
        } else edit.value = t;
      }
      var it = st === "listening" || st === "stopping" ? interim.text : "";
      ph.hidden = !!(t || it);
      if (full || t.indexOf(shown) !== 0 || !shown) {
        wordsEl.innerHTML = t ? t.split(/\s+/).map(function (w) { return '<span class="w">' + esc(w) + "</span>"; }).join(" ") : "";
      } else if (t.length > shown.length) {   /* only the new words, typed in */
        var add = t.slice(shown.length).trim().split(/\s+/).filter(Boolean), base = wordsEl.querySelectorAll(".w").length, frag = document.createDocumentFragment();
        add.forEach(function (w, i) { frag.appendChild(document.createTextNode(" ")); var sp = document.createElement("span"); sp.className = "w nw"; sp.style.setProperty("--d", (i * 45) + "ms"); sp.textContent = w; frag.appendChild(sp); });
        var old = wordsEl.querySelector(".it"); if (old) old.parentNode.removeChild(old);
        wordsEl.appendChild(frag);
        setTimeout(function () { [].forEach.call(wordsEl.querySelectorAll(".nw"), function (s) { s.classList.remove("nw"); }); }, 1600 + add.length * 45);
        void base;
      }
      shown = t;
      var itEl = wordsEl.querySelector(".it");
      if (it) { if (!itEl) { itEl = document.createElement("span"); itEl.className = "it"; wordsEl.appendChild(itEl); } itEl.textContent = (t ? " " : "") + it; }
      else if (itEl) itEl.parentNode.removeChild(itEl);
      var say = q("[data-iv-say]"); say.scrollTop = say.scrollHeight;
      mirror(); changed();
    }

    /* ---------------- listening ---------------- */
    function onFrame(pcm) {
      var f = { t0: clock, pcm: pcm }; frames.push(f); clock += pcm.length / SR;
      if (ws && wsOpen && f.t0 >= wsBase - 1e-6) {
        if (ws.bufferedAmount > 32000 && Date.now() - (ws._heard || 0) > 6000) { try { ws.close(); } catch (e) {} }   /* stalled: audio piling up and nothing back for 6 s. Drop it; memory has it all */
        else { try { ws.send(pcm.buffer); } catch (e) {} }
      }
      if (clock >= LIMIT && st === "listening") stop("limit");
    }
    function quietBase() {   /* a stream that comes back starts at the quietest moment of the last 3 s (a pause), never mid-word; memory re-sends from there */
      var covEnd = maxT(), best = clock, bestE = 1e18;
      frames.forEach(function (f) {
        if (f.t0 < clock - 3 || f.t0 < covEnd) return;
        var e = 0, n = 0; for (var i = 0; i < f.pcm.length; i += 4) { e += Math.abs(f.pcm[i]); n++; } e /= n;
        if (e < bestE) { bestE = e; best = f.t0 + f.pcm.length / SR / 2; }
      });
      return best;
    }
    function connect() {
      if (!id || !liveOn) return;
      var base = frames.length ? quietBase() : clock, url = api.replace(/^http/, "ws") + "/dream/listen?id=" + encodeURIComponent(id) + "&base=" + base.toFixed(3);
      var s; try { s = new WebSocket(url); } catch (e) { fallback(); return; }
      s.binaryType = "arraybuffer"; ws = s; wsBase = base; wsOpen = false;
      var opened2 = false;
      s.onopen = function () {
        if (ws !== s) return; s._heard = Date.now(); opened2 = true; wsOpen = true; wsTries = 0; chunkMode = false; offline = false; saved("ok", "Saving as you talk"); schedule(5000);
        frames.forEach(function (f) { if (f.t0 >= wsBase - 1e-6) { try { s.send(f.pcm.buffer); } catch (e) {} } });   /* what was heard while it connected */
      };
      s.onmessage = function (m) {
        s._heard = Date.now();
        var x; try { x = JSON.parse(m.data); } catch (e) { return; }
        if (x.type === "interim") { interim = { t0: x.t0, text: x.text }; paintWords(); }
        else if (x.type === "final") { if (!parts.some(function (p) { return p.id === x.id; })) parts.push({ id: x.id, t0: x.t0, t1: x.t1, w1: x.w1, text: x.text, src: "nova" }); if (interim.t0 <= x.t0 + .01) interim = { t0: x.t1, text: "" }; prune(); paintWords(); saved("ok", "Saved"); }
        else if (x.type === "limit") { if (st === "listening") stop("limit"); }
        else if (x.type === "closed") { if (s._closed) s._closed(x); }
      };
      s.onclose = function () {
        if (ws !== s) return; ws = null; wsOpen = false;
        if (s._closed) s._closed(null);
        if (!liveOn) return;
        /* dropped while they talk: keep listening; the gap is sent again from memory, and the stream comes back */
        wsTries++; saved("work", "Reconnecting. Nothing is lost.");
        if (!opened2 && wsTries >= 3) chunkMode = true;   /* the live stream won't open here: pieces, cut at pauses, until it does */
        schedule(opened2 ? 5000 : 600);   /* after a drop, the server is still saving what the old stream heard: repair only what that leaves out */
        setTimeout(function () { if (liveOn && !ws) connect(); }, Math.min(5000, 500 * wsTries));
      };
    }
    function prune() {   /* audio a saved phrase covers is dropped (only the last 1.5 s, and 1.2 s around a gap, wait: a repair overlaps its edges) */
      if (!frames.length) return;
      var covered = parts.map(function (p) { return [p.t0, p.t1]; }), covEnd = maxT(), holes = gaps(parts, frames[0].t0, clock, .05);
      frames = frames.filter(function (f) {
        var t1 = f.t0 + f.pcm.length / SR;
        if (t1 > covEnd - 1.5) return true;
        if (holes.some(function (h) { return f.t0 < h[1] + 1.2 && t1 > h[0] - 1.2; })) return true;
        return !covered.some(function (c) { return c[0] <= f.t0 + .02 && c[1] >= t1 - .02; });
      });
    }
    function liveEdge() { return ws ? wsBase : clock; }   /* a stream (open or opening) takes everything from its base on */
    function schedule(ms) { clearTimeout(pumpT); pumpT = setTimeout(pump, ms); }
    /* send again whatever stretch no saved phrase covers (a dropped stream, or the pieces when there's no stream) */
    function pump() {
      if (pumping || !id) { if (!id) schedule(800); return; }
      var end = liveEdge();
      if (liveOn && !ws) end = cutPoint();   /* no stream right now (dropped, or none here): pieces cut at pauses as they talk */
      if (!frames.length || end <= frames[0].t0 + .3) { if (liveOn && !wsOpen) schedule(500); return; }
      var holes = gaps(parts, frames[0].t0, end);
      if (!holes.length) { prune(); if (liveOn && !wsOpen) schedule(500); return; }
      /* the stretch, plus up to 0.8 s either side: a word cut where the live phrase ended is heard whole (the server keeps only the words centred inside) */
      var h = holes[0], a = h[0], b = Math.min(h[1], a + 25), fEnd = frames[frames.length - 1].t0 + frames[frames.length - 1].pcm.length / SR;
      var s0 = Math.max(frames[0].t0, a - .8), s1 = Math.min(fEnd, b + .8), pcm = slice(s0, s1);
      if (!pcm) { frames = frames.filter(function (f) { return f.t0 >= b; }); schedule(50); return; }
      pumping = true; saved("work", "Saving");
      post("/dream/chunk?id=" + encodeURIComponent(id) + "&t0=" + s0.toFixed(3) + "&t1=" + s1.toFixed(3) + "&from=" + a.toFixed(3) + "&to=" + b.toFixed(3), pcm.buffer, true).then(function (j) {
        pumping = false; failN = 0; offline = false;
        merge(j.all || j.parts || []);
        prune(); paintWords(); saved("ok", "Saved"); schedule(30);
      }, function (e) {
        pumping = false; failN++;
        if (e.status === 409) { frames = []; return; }   /* already finished elsewhere */
        offline = true; saved("off", "Offline. Every word stays on this page until you're back.");
        schedule(Math.min(4000, 600 * Math.pow(1.5, failN)));   /* back online: caught up within a few seconds */
      });
    }
    function slice(a, b) {   /* the stretch a..b out of the frames still in memory */
      var n = Math.round((b - a) * SR), out = new Int16Array(n), got = 0;
      frames.forEach(function (f) {
        var f1 = f.t0 + f.pcm.length / SR; if (f1 <= a || f.t0 >= b) return;
        var i0 = Math.max(0, Math.round((a - f.t0) * SR)), i1 = Math.min(f.pcm.length, Math.round((b - f.t0) * SR)), at = Math.round((f.t0 + i0 / SR - a) * SR);
        if (at < 0 || at >= n) return; out.set(f.pcm.subarray(i0, Math.min(i1, i0 + n - at)), at); got += i1 - i0;
      });
      return got ? out : null;
    }
    function cutPoint() {   /* no stream: cut a piece at a pause 2.5–7 s in, so no word is split */
      if (st !== "listening") return clock;
      var s0 = frames.length ? frames[0].t0 : clock, len = clock - s0;
      if (len < 3) return s0;
      var best = null, bestE = 1e18;
      frames.forEach(function (f) {
        var rel = f.t0 - s0; if (rel < 2.5 || rel > 7) return;
        var e = 0, n = 0; for (var i = 0; i < f.pcm.length; i += 4) { e += Math.abs(f.pcm[i]); n++; } e /= n;
        if (e < bestE) { bestE = e; best = f.t0 + f.pcm.length / SR / 2; }
      });
      if (len >= 7) return best || s0 + 7;
      return best && bestE < 250 ? best : s0;   /* wait for a pause (about -42 dBFS) */
    }

    function listen() {
      if (clock >= LIMIT) { toTyping("limit"); return; }
      tap.hidden = true; setState("listening"); interim = { t0: clock, text: "" }; userEdited = false;
      if (edited != null || edit.value) { /* keep talking after an edit: what they say next is appended */ }
      startAt = clock; liveOn = true; chunkMode = false; wsTries = 0;
      duck(true); sfx("ask");
      mic.open().then(function () {
        if (st !== "listening") { mic.close(); return; }
        begin().then(function () { if (liveOn) connect(); });
        meter(); paintWords(true);
      }, function (e) {
        liveOn = false; duck(false);
        var denied = e && (e.name === "NotAllowedError" || e.name === "SecurityError");
        toTyping(denied ? "denied" : "nomic");
      });
    }
    function meter() {   /* their voice, the time, the ring */
      var bars = lvEl.children, hist = [];
      (function tick() {
        if (st !== "listening" && st !== "stopping") { [].forEach.call(bars, function (b) { b.style.transform = ""; }); return; }
        hist.push(mic.level()); if (hist.length > bars.length) hist.shift();
        for (var i = 0; i < bars.length; i++) { var v = hist[hist.length - bars.length + i] || 0; bars[i].style.transform = "scaleY(" + Math.max(.12, v).toFixed(3) + ")"; }
        paintTime(); setTimeout(tick, 70);
      })();
    }
    function paintTime() {
      var used = Math.min(LIMIT, clock);
      ring.style.strokeDashoffset = (RING * (1 - used / LIMIT)).toFixed(2);
      root.classList.toggle("warm", used >= WARN);
      timeEl.innerHTML = mmss(used) + "<em> / 3:00</em>";
      if (used >= WARN && st === "listening" && !root._warned) { root._warned = true; noteOn("30 seconds left. Keep going, everything's saved."); }
    }
    function noteOn(t, kind2) { note.textContent = t || ""; note.setAttribute("data-k", kind2 || ""); }

    /* the first stop: everything heard is flushed and saved, then the words are theirs to edit */
    var stopping = null;
    function stop(why) {
      if (st !== "listening") return stopping || Promise.resolve();
      setState("stopping"); sfx("send"); duck(false);
      liveOn = false; mic.close();
      if (ws && !wsOpen) { var c0 = ws; c0.onopen = null; c0.onmessage = null; c0.onclose = null; ws = null; try { c0.close(); } catch (e) {} }   /* never let it open after the stop and send the same audio again */
      stopping = new Promise(function (res) {
        var s = ws, fin = function () {
          interim = { t0: clock, text: "" };
          pumpUntilDone(why === "lost" ? 4000 : 9000).then(function () { stopping = null; res(); afterStop(why); });
        };
        if (s && wsOpen) {
          var t = setTimeout(function () { s._closed = null; fin(); }, 6000);
          s._closed = function () { clearTimeout(t); s._closed = null; fin(); };
          try { s.send(JSON.stringify({ type: "stop" })); } catch (e) { clearTimeout(t); fin(); }
        } else fin();
      });
      return stopping;
    }
    function pumpUntilDone(max) {   /* every stretch still only in memory goes up now (it keeps trying in the background after max) */
      var t0 = Date.now();
      return new Promise(function (res) {
        (function check() {
          ws = null; wsOpen = false;
          if (!frames.length || !gaps(parts, frames[0].t0, clock).length) { frames = []; res(true); return; }   /* all covered (what's left is a sliver of silence): the audio is dropped */
          if (Date.now() - t0 > max) { res(false); return; }
          if (!pumping) pump(); setTimeout(check, 250);
        })();
      });
    }
    function afterStop(why) {
      var n = wordsOf(textNow());
      if (frames.length) noteOn("Catching the last few seconds. Keep going, they'll appear here.");
      if (why === "limit") { toReview(); noteOn("Saved. Add anything else by typing, or continue."); say("time"); return; }
      if (why === "lost") { toReview(); noteOn("The mic stopped. Everything you said is saved. Tap the mic to keep going."); return; }
      if (n < MIN_WORDS && !nudged) { nudge(); return; }
      toReview();
    }
    function nudge() {   /* once: under about 25 words, Kayla asks for a little more, and the mic opens again */
      nudged = true; save(); setState("nudge"); noteOn("Give me a little more. What would make you say “that's exactly it”?");
      say("nudge").then(function () { if (st === "nudge") { if (clock < LIMIT) listen(); else toReview(); } });
    }
    function toReview() {
      setState("review"); edit.hidden = false; edit.value = textNow(); userEdited = false;
      micB.setAttribute("aria-label", "Keep talking"); paintTime();
      if (!q("[data-iv-note]").textContent) noteOn("Edit anything. Continue when it's right.");
      changed();
    }
    function toTyping(why) {
      setState("typing"); tap.hidden = true; edit.hidden = false; edit.value = textNow();
      noteOn(why === "denied" ? "No mic? No problem. Type it here, it saves as you go." : why === "nomic" ? "This browser can't hear you, so type it here. It saves as you go." : why === "limit" ? "Saved. Add anything else by typing, or continue." : "Type it here. It saves as you go.");
      setTimeout(function () { try { edit.focus({ preventScroll: false }); edit.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (e) {} }, 60);
      changed();
    }
    var saveT = 0;
    function save() {   /* their edit, and which phrases it already holds; mirrored here at once */
      mirror(); clearTimeout(saveT);
      saveT = setTimeout(function () {
        begin().then(function () {
          if (!id) return;
          post("/dream/save", { id: id, edited: edited, seen: seen, nudged: nudged }).then(function () { saved("ok", "Saved"); offline = false; }, function () { saved("off", "Offline. Your words stay on this page."); setTimeout(save, 3000); });
        });
      }, 500);
    }
    edit.addEventListener("input", function () {
      userEdited = true; edited = edit.value; seen = parts.map(function (p) { return p.id; }); shown = ""; save(); changed();
      if (o.key) o.key();
    });
    edit.addEventListener("focus", function () { setTimeout(function () { try { edit.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (e) {} }, 320); });   /* the keyboard never covers it */

    /* ---------------- the controls ---------------- */
    micB.addEventListener("click", function () {
      if (st === "listening") { stop(); return; }
      if (st === "review" || st === "typing" || st === "permission" || st === "idle") {
        if (clock >= LIMIT) { noteOn("That's the 3 minutes. Add anything else by typing."); return; }
        if (st === "review" || st === "typing") { edited = edit.value; seen = parts.map(function (p) { return p.id; }); save(); edit.hidden = true; }
        noteOn(""); listen();
      }
    });
    doneB.addEventListener("click", function () { if (st === "listening") stop(); });
    q("[data-iv-tapb]").addEventListener("click", function () { listen(); });
    [q("[data-iv-type]"), q("[data-iv-type2]")].forEach(function (b) { b.addEventListener("click", function () { if (st === "listening") stop().then(function () { toTyping(); }); else toTyping(); }); });
    root.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey && st === "listening") { e.preventDefault(); stop(); }
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Enter" && st === "listening" && !(e.target && /TEXTAREA|INPUT/.test(e.target.tagName))) { e.preventDefault(); stop(); } }, true);
    /* a phone that locks or switches apps takes the mic away: stop cleanly, keep everything */
    document.addEventListener("visibilitychange", function () { if (document.hidden && st === "listening" && SK.mobile && SK.mobile()) stop("lost"); });
    window.addEventListener("online", function () { if (frames.length) schedule(100); });

    /* Kayla's face in the card moves while she talks */
    (function kay() { kayEl.classList.toggle("talk", !!talking()); setTimeout(kay, 120); })();

    /* ---------------- the page's side ---------------- */
    function permission() {
      if (!navigator.permissions || !navigator.permissions.query) return Promise.resolve("prompt");
      return navigator.permissions.query({ name: "microphone" }).then(function (p) { return p.state; }, function () { return "prompt"; });
    }
    function open() {
      if (opened) {   /* back to the step: as it was */
        if (st === "idle" || st === "asking") return;
        paintWords(true); return;
      }
      opened = true; setState("asking"); paintTime();
      begin().then(function (j) {
        var hasText = !!textNow();
        if (final) { toReview(); noteOn("This is what you told us. Edit it, or continue."); paintWords(true); return; }
        if (prior && !hasText) { edited = prior; seen = parts.map(function (p) { return p.id; }); nudged = true; save(); toReview(); paintWords(true); say("prior"); return; }
        if (hasText) { toReview(); paintWords(true); say("back"); return; }
        say("ask").then(function () {
          if (st !== "asking") return;
          permission().then(function (p) { if (st !== "asking") return; if (p === "granted") listen(); else if (p === "denied") toTyping("denied"); else { setState("permission"); tap.hidden = false; } });
        });
      });
    }
    function leave() { if (st === "listening") stop("leave"); if (st === "asking") setState("idle"), opened = false; }
    function ready() {
      if (st === "listening") return true;                 /* the first press stops, and shows the words */
      if (st !== "review" && st !== "typing") return false;
      return !!(edit.value || textNow()).trim() || nudged;
    }
    function next() {
      if (st === "listening") return stop().then(function () { return null; });
      if (st === "stopping" && stopping) return stopping.then(function () { return null; });
      if (st !== "review" && st !== "typing") return Promise.resolve(null);
      var text = (edit.value || "").trim();
      if (wordsOf(text) < MIN_WORDS && !nudged) {   /* typed (or edited down) to a few words: the one nudge */
        nudged = true; save(); noteOn("Give me a little more. What would make you say “that's exactly it”?"); say("nudge"); changed();
        return Promise.resolve(null);
      }
      edited = text; seen = parts.map(function (p) { return p.id; });
      setState("sending"); saved("work", "Sending");
      return begin().then(function () {
        return new Promise(function (res) {
          (function send(n) {
            post("/dream/finish", { id: id, text: edited, seen: seen, nudged: nudged, access_token: o.token ? o.token() : null }).then(function (j) {
              saved("ok", "Saved"); sfx("done"); setState("done"); store({ id: id, text: j.text, at: Date.now(), done: true }); res(j);
            }, function (e) {
              if (e.status === 409) { setState("done"); res({ text: edited, words: wordsOf(edited), seconds: clock, nudged: nudged, at: new Date().toISOString() }); return; }
              if (n >= 2) {   /* the network won't take it right now: it's in this browser and goes up on the next try; they're not held back */
                saved("off", "Saved on this page. It goes up when you're back online."); setState("done");
                res({ text: edited, words: wordsOf(edited), seconds: clock, nudged: nudged, at: new Date().toISOString(), pending: true });
                setTimeout(function () { post("/dream/finish", { id: id, text: edited, seen: seen, nudged: nudged, access_token: o.token ? o.token() : null }).catch(function () {}); }, 4000);
                return;
              }
              setTimeout(function () { send(n + 1); }, 900 * (n + 1));
            });
          })(0);
        });
      });
    }
    return { open: open, leave: leave, ready: ready, next: next, id: function () { return id; }, state: function () { return st; }, text: textNow };
  };
})();
