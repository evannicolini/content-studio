/* Studio site kit: window.SK. Shared behaviour every section builds on.
   SK.beam(el, opts)            live border beam on any element (the app's beam engine)
   SK.orb(canvas, opts)         the thinking orb; returns { set(state) }
   SK.promptField(host, opts)   the app's AI input field, live: orb, typing, send, processing
   SK.chat(host, script, opts)  plays a short chat between "you" and Claude
   SK.type(el, text, opts)      human-speed typing into any element
   SK.onView(el, enter, leave)  run when a thing enters / leaves the viewport
   SK.film(slugOrObj)           opens a film with sound in the modal
   SK.sleep(ms), SK.reduced, SK.mobile(), SK.media (the media manifest)
   Markup hooks handled for you:
     <video data-play data-src="…" [data-src-m="…"] poster="…" muted playsinline loop>   loads near the viewport, plays only in view
     [data-reveal] (+ style="--i:2")                                                    fades up once in view
     [data-beam-auto="md|sm|line"] [data-beam-boost="1.8"] [data-beam-radius="999"]      gets a beam
     [data-download]                                                                    scrolls to pricing and focuses the invite code
     [data-film="slug"]                                                                 opens that film from the manifest on click */
(function () {
  "use strict";
  var SK = (window.SK = window.SK || {});
  var BS = window.BeamStyles, OE = window.OrbEngine;
  SK.media = window.SK_MEDIA || {};
  SK.reduced = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  SK.mobile = function () { return matchMedia("(max-width: 700px)").matches; };
  SK.sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  SK.CLAUDE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z"/></svg>';
  SK.APPLE = '<svg class="apple" viewBox="0 0 24 24" aria-hidden="true"><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/></svg>';

  /* ---------- in-view ---------- */
  SK.onView = function (el, enter, leave, opts) {
    opts = opts || {};
    if (!("IntersectionObserver" in window)) { enter && enter(); return { disconnect: function () {} }; }
    var inside = false;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var now = e.isIntersecting && e.intersectionRatio >= (opts.ratio || 0);
        if (now && !inside) { inside = true; enter && enter(e); if (opts.once) io.disconnect(); }
        else if (!now && inside) { inside = false; leave && leave(e); }
      });
    }, { rootMargin: opts.margin || "0px", threshold: opts.threshold || [0, opts.ratio || 0.01, 0.5] });
    io.observe(el);
    return io;
  };

  /* ---------- border beam ---------- */
  var beamN = 0;
  SK.beam = function (el, o) {
    if (!el || !BS) return el;
    o = Object.assign({ size: "md", variant: "mono", theme: "dark", strength: 1, boost: 1 }, o || {});
    var id = "sb" + ++beamN, tp = BS.sizeThemePresets[o.size][o.theme], sp = BS.sizePresets[o.size], k = o.boost;
    var cap = function (v) { return Math.max(0, Math.min(1, v)); };
    var css = BS.generateBeamCSS({
      id: id, borderRadius: o.radius != null ? o.radius : sp.borderRadius, borderWidth: o.width || sp.borderWidth,
      duration: o.duration || (o.size === "line" ? 3.1 : 1.96),
      strokeOpacity: cap(tp.strokeOpacity * k), innerOpacity: cap(tp.innerOpacity * k), bloomOpacity: cap(tp.bloomOpacity * k),
      innerShadow: tp.innerShadow, size: o.size, colorVariant: o.variant, staticColors: o.variant === "mono",
      brightness: o.brightness || (tp.brightness || 1.3), saturation: tp.saturation, hueRange: /^mirra/.test(o.variant) ? 6 : 30, theme: o.theme,
      hairlineOpacity: tp.hairlineOpacity, glowSize: o.glow || 1
    });
    var st = document.createElement("style");
    st.textContent = css;
    document.head.appendChild(st);
    el.setAttribute("data-beam", id);
    if (!el.querySelector(":scope > [data-beam-bloom]")) { var b = document.createElement("span"); b.setAttribute("data-beam-bloom", ""); el.appendChild(b); }
    el.style.setProperty("--beam-strength", String(o.strength));
    SK.onView(el, function () { el.setAttribute("data-active", ""); }, function () { el.removeAttribute("data-active"); }, { margin: "80px" });
    return el;
  };

  /* ---------- thinking orb ---------- */
  var orbs = [], orbRAF = 0;
  function orbTick(now) {
    orbRAF = 0;
    var any = false, t = now / 1000;
    for (var i = 0; i < orbs.length; i++) {
      var o = orbs[i];
      if (!o.vis) continue;
      any = true;
      var p = OE.resolvePreset(o.state, o.size), k = (o.dpr * o.display) / o.size;
      o.ctx.setTransform(k, 0, 0, k, 0, 0);
      o.ctx.clearRect(0, 0, o.size, o.size);
      OE.MODE_DRAWS[p.mode](o.ctx, o.size, (t + 7) * p.speed, o.dark, p.opts);
    }
    if (any && !SK.reduced) orbRAF = requestAnimationFrame(orbTick);
  }
  SK.orb = function (canvas, o) {
    o = Object.assign({ size: 20, display: 24, state: "breathing", dark: true }, o || {});
    if (!OE || !canvas.getContext) return { set: function () {} };
    var dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
    canvas.width = canvas.height = Math.round(o.display * dpr);
    var rec = { ctx: canvas.getContext("2d"), size: o.size, display: o.display, dpr: dpr, state: o.state, dark: o.dark, vis: false };
    orbs.push(rec);
    SK.onView(canvas, function () { rec.vis = true; if (!orbRAF) orbRAF = requestAnimationFrame(orbTick); }, function () { rec.vis = false; }, { margin: "60px" });
    return { set: function (s) { rec.state = s; if (SK.reduced && !orbRAF) orbRAF = requestAnimationFrame(orbTick); } };
  };

  /* ---------- typing ---------- */
  SK.type = function (el, text, o) {
    o = o || {};
    var token = (el._skType = (el._skType || 0) + 1), i = o.append ? 0 : 0, base = o.append ? el.textContent : "";
    return new Promise(function (done) {
      if (SK.reduced || o.instant) { el.textContent = base + text; return done(true); }
      (function step() {
        if (el._skType !== token) return done(false);
        if (i >= text.length) return done(true);
        i++;
        el.textContent = base + text.slice(0, i);
        o.onChar && o.onChar(i);
        var ch = text[i - 1], d = (o.ms || 46) * (0.55 + Math.random() * 0.9);
        if (ch === " ") d *= 1.25; if (ch === "," || ch === ".") d *= 3.2;
        setTimeout(step, d);
      })();
    });
  };
  SK.erase = function (el, o) {
    o = o || {};
    var token = (el._skType = (el._skType || 0) + 1);
    return new Promise(function (done) {
      if (SK.reduced) { el.textContent = ""; return done(true); }
      (function step() {
        if (el._skType !== token) return done(false);
        var s = el.textContent;
        if (!s) return done(true);
        el.textContent = s.slice(0, Math.max(0, s.length - Math.ceil(s.length / 9)));
        setTimeout(step, o.ms || 22);
      })();
    });
  };

  /* ---------- the prompt field ----------
     host: an empty element. opts: { placeholder, scale (1 = the kit's 54px field; default 1.3) or height (px), prompts: [..], loop, hold (ms), beam: {..}|false, onSend(text, ctl, i), auto: true }
     ctl: { el, state(s), set(text), type(text), clear(), send(), run(), stop() }  states: idle | focus | processing */
  SK.promptField = function (host, o) {
    o = Object.assign({ placeholder: "What should we make?", scale: 1.3, prompts: [], loop: true, hold: 1500, auto: true }, o || {});
    if (o.height) o.scale = o.height / 54;
    host.classList.add("pf");
    host.style.setProperty("--k", String(o.scale));
    host.setAttribute("data-state", "idle");
    host.innerHTML =
      '<div class="pf-field"><canvas class="pf-orb" aria-hidden="true"></canvas>' +
      '<div class="pf-input"><div class="pf-run"><span class="pf-text ph"></span><i class="pf-caret"></i></div></div>' +
      '<span class="pf-trail" aria-hidden="true"><svg viewBox="0 0 22 22"><path d="M14.4865 14.4865L19.25 19.25M16.5 9.625C16.5 13.422 13.422 16.5 9.625 16.5C5.82804 16.5 2.75 13.422 2.75 9.625C2.75 5.82804 5.82804 2.75 9.625 2.75C13.422 2.75 16.5 5.82804 16.5 9.625Z"/></svg><i></i><i></i><i></i></span></div>';
    var text = host.querySelector(".pf-text"), run = host.querySelector(".pf-run"), input = host.querySelector(".pf-input"), sendB = host.querySelector(".pf-trail");
    var orb = SK.orb(host.querySelector(".pf-orb"), { size: 20, display: Math.round(20 * o.scale), state: "breathing" });
    if (o.beam !== false) SK.beam(host, Object.assign({ size: "md", variant: "mirra", radius: Math.round(16 * o.scale), boost: 1 }, o.beam || {}));
    var typed = "", alive = false, runId = 0;
    function paint() {
      text.textContent = typed || o.placeholder;
      text.classList.toggle("ph", !typed);
      run.style.flexDirection = typed ? "row" : "row-reverse";
      var over = run.scrollWidth - input.clientWidth;
      run.style.transform = "translateY(-50%) translateX(" + (typed && over > 0 ? -over : 0) + "px)";
    }
    var ctl = {
      el: host,
      state: function (s) {
        host.setAttribute("data-state", s);
        orb.set(s === "focus" ? "listening" : s === "processing" ? "searching" : "breathing");
        host.style.setProperty("--beam-strength", s === "processing" ? "1" : String((o.beam && o.beam.strength) || 1));
        return ctl;
      },
      set: function (t) { typed = t; paint(); return ctl; },
      clear: function () { typed = ""; paint(); return ctl; },
      type: function (t, ms) {
        var my = runId;
        ctl.state("focus");
        host.setAttribute("data-typing", "");
        return new Promise(function (done) {
          if (SK.reduced) { typed = t; paint(); host.removeAttribute("data-typing"); return done(true); }
          var i = 0;
          (function step() {
            if (my !== runId) return done(false);
            if (i >= t.length) { host.removeAttribute("data-typing"); return done(true); }
            i++; typed = t.slice(0, i); paint();
            var ch = t[i - 1], d = (ms || 44) * (0.55 + Math.random() * 0.9);
            if (ch === " ") d *= 1.2; if (ch === ",") d *= 3;
            setTimeout(step, d);
          })();
        });
      },
      send: function () {
        sendB.classList.add("tap");
        setTimeout(function () { sendB.classList.remove("tap"); }, 180);
        ctl.state("processing");
        return ctl;
      },
      stop: function () { runId++; alive = false; host.removeAttribute("data-typing"); return ctl; },
      /* types each prompt, taps send, calls onSend (may return a promise), then moves on */
      run: async function () {
        if (alive || !o.prompts.length) return;
        alive = true;
        var my = ++runId, i = 0;
        while (alive && my === runId) {
          var p = o.prompts[i % o.prompts.length];
          await SK.sleep(i ? 500 : 700);
          if (my !== runId) break;
          if (!(await ctl.type(p))) break;
          await SK.sleep(420);
          if (my !== runId) break;
          ctl.send();
          if (o.onSend) await o.onSend(p, ctl, i % o.prompts.length); else await SK.sleep(o.hold);
          if (my !== runId) break;
          ctl.state("idle").clear();
          i++;
          if (!o.loop && i >= o.prompts.length) break;
        }
        alive = false;
      }
    };
    paint();
    if (o.auto && o.prompts.length) SK.onView(host, function () { ctl.run(); }, function () { ctl.stop(); ctl.state("idle").clear(); }, { ratio: 0.4, threshold: [0, 0.4, 0.8] });
    window.addEventListener("resize", paint);
    return ctl;
  };

  /* ---------- chat ----------
     script: [{ who: "you" | "claude", text, html, wait (ms before), think (ms of dots) }]   opts: { loop, gap, onStep(i, el) } */
  SK.chat = function (host, script, o) {
    o = o || {};
    host.classList.add("chat");
    var id = 0;
    async function play() {
      var my = ++id;
      host.innerHTML = "";
      for (var i = 0; i < script.length; i++) {
        var s = script[i];
        await SK.sleep(SK.reduced ? 0 : s.wait != null ? s.wait : o.gap || 700);
        if (my !== id) return;
        var m = document.createElement("div");
        m.className = "msg " + (s.who === "you" ? "you" : "claude");
        var head = s.who === "you" ? "" : '<div class="who">' + SK.CLAUDE + "Claude</div>";
        if (s.who !== "you" && !SK.reduced) {
          m.innerHTML = head + '<span class="typing"><i></i><i></i><i></i></span>';
          host.appendChild(m);
          requestAnimationFrame(function (mm) { return function () { mm.classList.add("in"); }; }(m));
          await SK.sleep(s.think || 900);
          if (my !== id) return;
        } else host.appendChild(m);
        m.innerHTML = head + (s.html || "<span></span>");
        if (!s.html) m.querySelector("span").textContent = s.text;
        requestAnimationFrame(function (mm) { return function () { mm.classList.add("in"); }; }(m));
        o.onStep && o.onStep(i, m);
      }
      if (o.loop) { await SK.sleep(o.loopHold || 4200); if (my === id) play(); }
    }
    SK.onView(host, play, function () { id++; }, { ratio: 0.35, threshold: [0, 0.35, 0.7] });
    return { replay: play };
  };

  /* ---------- videos: load near the viewport, play only in view ---------- */
  function armVideo(v) {
    if (v._sk) return;
    v._sk = true;
    v.muted = true; v.playsInline = true;
    v.setAttribute("muted", ""); v.setAttribute("playsinline", "");
    if (!v.hasAttribute("preload")) v.preload = "none";
    SK.onView(v, function () {
      if (!v.src && !v.currentSrc) { var s = (SK.mobile() && v.getAttribute("data-src-m")) || v.getAttribute("data-src"); if (s) v.src = s; }
    }, null, { margin: "500px 0px", once: true });
    SK.onView(v, function () {
      if (SK.reduced) return;
      if (!v.src && !v.currentSrc) { var s = (SK.mobile() && v.getAttribute("data-src-m")) || v.getAttribute("data-src"); if (s) v.src = s; }
      var p = v.play(); p && p.catch(function () {});
    }, function () { v.pause(); }, { ratio: 0.2, threshold: [0, 0.2, 0.6] });
  }
  SK.videos = function (root) { (root || document).querySelectorAll("video[data-play]").forEach(armVideo); };

  /* ---------- film modal ---------- */
  var fm;
  SK.film = function (x) {
    var f = typeof x === "string" ? ((SK.media.films || []).filter(function (a) { return a.slug === x; })[0] || null) : x;
    if (!f) return;
    if (!fm) {
      fm = document.createElement("div");
      fm.className = "fm";
      fm.innerHTML = '<button class="fm-x" aria-label="Close"><svg viewBox="0 0 16 16"><path d="M3 3l10 10M13 3 3 13"/></svg></button><video controls playsinline></video><p class="fm-cap mono"></p>';
      document.body.appendChild(fm);
      var close = function () { fm.classList.remove("open"); var v = fm.querySelector("video"); v.pause(); v.removeAttribute("src"); v.load(); };
      fm.addEventListener("click", function (e) { if (e.target === fm || e.target.closest(".fm-x")) close(); });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape" && fm.classList.contains("open")) close(); });
    }
    var v = fm.querySelector("video");
    v.poster = f.poster || "";
    v.src = f.full || f.src;
    fm.querySelector(".fm-cap").textContent = f.title ? f.title + (f.brand ? "  ·  " + f.brand : "") : "";
    fm.classList.add("open");
    SK.kayla && SK.kayla.pause();
    var p = v.play(); p && p.catch(function () {});
  };

  /* ---------- Kayla: the listen pill (fixed, .kp) and inline clips (.vo[data-src]) ----------
     Waveform bars and the length come from <audio file name>.json next to the mp3. Only one clip plays at a time. */
  var audios = [];
  var fmt = function (s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2); };
  function player(box, src, bars) {
    var a = new Audio(), wave = box.querySelector("[data-wave]"), time = box.querySelector("[data-time]"), rateB = box.querySelector("[data-rate]"), els = [], dur = 0;
    a.preload = "none"; a.src = src; audios.push(a);
    function draw(peaks) {
      wave.innerHTML = ""; els = [];
      for (var i = 0; i < bars; i++) {
        var el = document.createElement("i"), pk = peaks && peaks.length ? peaks[Math.floor((i / bars) * peaks.length)] : 0.3 + 0.6 * Math.abs(Math.sin(i * 1.7));
        el.style.height = Math.round(16 + pk * 84) + "%"; wave.appendChild(el); els.push(el);
      }
      paint();
    }
    function paint() {
      var d = a.duration || dur || 0, p = d ? a.currentTime / d : 0;
      els.forEach(function (el, i) { el.classList.toggle("on", i / bars < p); });
      if (time) time.textContent = fmt(a.paused && !a.currentTime ? d : d - a.currentTime);
    }
    draw(null);
    fetch(src.replace(/\.mp3$/, ".json")).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { if (j) { dur = j.duration || 0; draw(j.peaks); } }).catch(function () {});
    a.addEventListener("timeupdate", paint);
    a.addEventListener("loadedmetadata", paint);
    a.addEventListener("play", function () { audios.forEach(function (o) { if (o !== a) o.pause(); }); box.classList.add("playing", "used"); });
    a.addEventListener("pause", function () { box.classList.remove("playing"); });
    a.addEventListener("ended", function () { a.currentTime = 0; paint(); });
    box.querySelector("[data-play]").addEventListener("click", function () { if (a.paused) { var p = a.play(); p && p.catch(function () {}); } else a.pause(); });
    wave.addEventListener("click", function (e) { var r = wave.getBoundingClientRect(), d = a.duration || dur; if (d) a.currentTime = ((e.clientX - r.left) / r.width) * d; if (a.paused) { var p = a.play(); p && p.catch(function () {}); } });
    var rates = [1, 1.25, 1.5], ri = 0;
    rateB && rateB.addEventListener("click", function () { ri = (ri + 1) % rates.length; a.playbackRate = rates[ri]; rateB.textContent = rates[ri] + "x"; });
    return a;
  }
  var PLAY = '<svg class="pl" viewBox="0 0 16 16"><path d="M4 2.5v11l9.5-5.5z"/></svg><svg class="pa" viewBox="0 0 16 16"><path d="M3.5 2.5h3v11h-3zM9.5 2.5h3v11h-3z"/></svg>';
  function kayla() {
    var kp = document.querySelector(".kp");
    if (kp) { var a = player(kp, kp.getAttribute("data-src"), SK.mobile() ? 26 : 46); SK.kayla = { audio: a, pause: function () { audios.forEach(function (o) { o.pause(); }); } }; }
    document.querySelectorAll(".vo[data-src]").forEach(function (box) {
      if (box._vo) return; box._vo = true;
      box.innerHTML = '<span class="vo-face"><img src="assets/kayla.jpg" alt="" width="88" height="88" loading="lazy"></span>' +
        '<span class="vo-mid"><span class="vo-label"></span><span class="vo-wave" data-wave></span></span><span class="vo-time" data-time></span>' +
        '<button class="vo-play" data-play aria-label="Play">' + PLAY + "</button>";
      box.querySelector(".vo-label").textContent = box.getAttribute("data-label") || "Listen";
      player(box, box.getAttribute("data-src"), 40);
    });
  }

  /* ---------- frames grow into place as they scroll in: size and corner radius ease to rest ---------- */
  function growFrames() {
    if (SK.reduced) return;
    var frames = [].slice.call(document.querySelectorAll(".frame:not(.hero):not([data-nogrow])")).map(function (f) {
      return { el: f, r: parseFloat(getComputedStyle(f).borderTopLeftRadius) || 28, done: false };
    });
    if (!frames.length) return;
    var queued = false;
    function upd() {
      queued = false;
      var vh = window.innerHeight;
      frames.forEach(function (f) {
        var r = f.el.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        var p = Math.max(0, Math.min(1, (vh - r.top) / (vh * 0.62))), e = 1 - Math.pow(1 - p, 3);
        if (e >= 0.999) { if (!f.done) { f.done = true; f.el.style.transform = ""; f.el.style.borderRadius = ""; } return; }
        f.done = false;
        f.el.style.transformOrigin = "50% 0";
        f.el.style.transform = "scale(" + (0.9 + 0.1 * e).toFixed(4) + ")";
        f.el.style.borderRadius = (f.r + 44 * (1 - e)).toFixed(1) + "px";
      });
    }
    function req() { if (!queued) { queued = true; requestAnimationFrame(upd); } }
    window.addEventListener("scroll", req, { passive: true });
    window.addEventListener("resize", req);
    upd();
  }

  /* ---------- headings: split into words, reveal left to right from blurred to sharp ---------- */
  function blurHeads() {
    if (SK.reduced) return;
    document.querySelectorAll(".h-xl, .h-lg, .h-md, [data-blur]").forEach(function (h) {
      if (h.hasAttribute("data-noblur") || h._bl) return;
      h._bl = true;
      h.removeAttribute("data-reveal");
      h.setAttribute("aria-label", h.textContent.replace(/\s+/g, " ").trim());
      var n = 0;
      (function walk(node) {
        [].slice.call(node.childNodes).forEach(function (c) {
          if (c.nodeType === 3) {
            var frag = document.createDocumentFragment();
            c.textContent.split(/(\s+)/).forEach(function (tok) {
              if (!tok) return;
              if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(" ")); return; }
              var w = document.createElement("span");
              w.className = "bw"; w.textContent = tok; w.setAttribute("aria-hidden", "true"); w.style.setProperty("--n", String(n++));
              frag.appendChild(w);
            });
            node.replaceChild(frag, c);
          } else if (c.nodeType === 1 && c.tagName !== "BR" && c.tagName !== "SVG") walk(c);
        });
      })(h);
      h.style.setProperty("--step", (n > 12 ? 45 : 75) + "ms");
      h.classList.add("bl");
      SK.onView(h, function () { h.classList.add("bl-in"); }, null, { once: true, margin: "0px 0px -8% 0px" });
    });
  }

  /* ---------- start ---------- */
  SK.start = function () {
    document.documentElement.classList.remove("no-js");
    blurHeads();
    document.querySelectorAll("[data-reveal]").forEach(function (el) {
      SK.onView(el, function () { el.classList.add("in"); }, null, { once: true, margin: "0px 0px -8% 0px" });
    });
    SK.videos();
    document.querySelectorAll("[data-beam-auto]").forEach(function (el) {
      var r = el.getAttribute("data-beam-radius");
      SK.beam(el, { size: el.getAttribute("data-beam-auto") || "md", boost: parseFloat(el.getAttribute("data-beam-boost")) || 1, radius: r != null ? parseFloat(r) : undefined, variant: el.getAttribute("data-beam-variant") || "mono" });
    });
    document.addEventListener("click", function (e) {
      var d = e.target.closest("[data-download]");
      if (d) {
        e.preventDefault();
        if (SK.dl && !SK.mobile()) { window.location.href = SK.dl; return; }
        var pr = document.getElementById("pricing");
        if (pr) { pr.scrollIntoView({ behavior: SK.reduced ? "auto" : "smooth", block: "start" }); setTimeout(function () { var i = pr.querySelector("input[data-code]"); if (i && !SK.mobile()) i.focus({ preventScroll: true }); }, 900); }
        return;
      }
      var f = e.target.closest("[data-film]");
      if (f) { e.preventDefault(); SK.film(f.getAttribute("data-film")); }
    });
    var nav = document.querySelector(".nav");
    var kpEl = document.querySelector(".kp");
    if (nav || kpEl) { var on = function () { var y = window.scrollY; nav && nav.classList.toggle("solid", y > 40); kpEl && kpEl.classList.toggle("mini", y > window.innerHeight * 0.7); }; on(); window.addEventListener("scroll", on, { passive: true }); }
    kayla();
    growFrames();
    focusSections();
  };

  /* ---------- scroll focus (as on the Custom Esignature site): a section is dim and soft at the edge of the screen and comes to
     full strength as it enters; it fades again as it leaves. Opacity floor 15%, up to 8px blur (blur on desktop only). ---------- */
  function focusSections() {
    if (SK.reduced) return;
    var els = [].slice.call(document.querySelectorAll("main > section")), blur = !SK.mobile() && matchMedia("(pointer: fine)").matches, queued = false;
    if (!els.length) return;
    var clamp = function (x) { return Math.min(1, Math.max(0, x)); };
    function paint() {
      queued = false;
      var vh = window.innerHeight || 1;
      els.forEach(function (el, i) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -vh || r.top > vh * 2) return;
        var enter = i === 0 ? 1 : clamp((vh - r.top) / (0.45 * vh)), leave = clamp((0.45 * vh - r.bottom) / (0.45 * vh)), v = Math.min(enter, 1 - leave);
        if (v >= 0.999) { if (el._dim) { el._dim = false; el.style.opacity = ""; el.style.filter = ""; } return; }
        el._dim = true;
        el.style.opacity = (0.15 + 0.85 * v).toFixed(3);
        if (blur) el.style.filter = "blur(" + ((1 - v) * 8).toFixed(2) + "px)";
      });
    }
    function req() { if (!queued) { queued = true; requestAnimationFrame(paint); } }
    window.addEventListener("scroll", req, { passive: true });
    window.addEventListener("resize", req);
    paint();
  }
})();
