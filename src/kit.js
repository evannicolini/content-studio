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
     [data-gx] (+ data-gx="hot" / "paper")                                               the glass button with the composer's border beam (SK.gx)
     [data-download]                                                                    scrolls to pricing and focuses the invite code (phones: Send to my Mac)
     [data-vo-play="kayla-pricing"]                                                     on click, plays that section's Kayla clip from the top
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
      strokeOpacity: cap(o.stroke != null ? o.stroke : tp.strokeOpacity * k), innerOpacity: cap(o.inner != null ? o.inner : tp.innerOpacity * k), bloomOpacity: cap(o.bloom != null ? o.bloom : tp.bloomOpacity * k),
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

  /* ---------- .gx: the glass button with the composer's border beam (base.css). The beam runs only while the button is on screen. ---------- */
  SK.gx = function (el, o) {
    if (!el) return el;
    o = o || {};
    el.classList.add("gx");
    if (o.hot) el.classList.add("hot");
    if (o.paper) el.classList.add("paper");
    if (el.querySelector(":scope > .gx-beam")) return el;
    var s = document.createElement("span");
    s.className = "gx-beam"; s.setAttribute("data-beam", "cx"); s.setAttribute("aria-hidden", "true"); s.innerHTML = "<span data-beam-bloom></span>";
    el.insertBefore(s, el.firstChild);
    SK.onView(el, function () { s.setAttribute("data-active", ""); }, function () { s.removeAttribute("data-active"); }, { margin: "60px" });
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
      if (SK.reduced || SK.hushed) return;   /* the early-access sheet is over the page: nothing behind it plays */
      if (!v.src && !v.currentSrc) { var s = (SK.mobile() && v.getAttribute("data-src-m")) || v.getAttribute("data-src"); if (s) v.src = s; }
      var p = v.play(); p && p.catch(function () {});
    }, function () { v.pause(); }, { ratio: 0.2, threshold: [0, 0.2, 0.6] });
  }
  SK.videos = function (root) { (root || document).querySelectorAll("video[data-play]").forEach(armVideo); };
  /* SK.hush(true) while a full-screen sheet covers the page: every video behind it pauses and none starts; SK.hush(false) plays the
     ones that were playing again, if they are still on screen. (900-early: phones ran warm with the page playing behind it.) */
  var hushedVids = [];
  SK.hushed = false;
  SK.hush = function (on) {
    SK.hushed = !!on;
    if (on) {
      document.querySelectorAll("video").forEach(function (v) { if (v.closest("#early-access")) return; if (!v.paused) { v.pause(); hushedVids.push(v); } });
    } else {
      hushedVids.splice(0).forEach(function (v) { var r = v.getBoundingClientRect(); if (r.bottom > 0 && r.top < innerHeight && r.width) { var p = v.play(); p && p.catch(function () {}); } });
    }
  };

  /* ---------- the real Studio Home, drawn at the app's own size (1440 x 900) for the sign-ups' stage (900-early, 910-start).
     Taken from the app (Studio_App web/vista home.js, home.css, shell.css): the full nav with its counts, the greeting, Ask Studio
     (Studio x Claude, mic, send), the brand chips, Set up your Studio, To review, Post next, Crushing it and Going out. Real stills
     from the selects. SK.appHome(host, { name, brand }) -> { name(n), brands(list), typeAsk(text) }. CSS: .ah in 900-early. ---------- */
  SK.appHome = function (host, o) {
    o = o || {};
    var M = "assets/media/selects/", esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
    var I = {
      home: '<path d="M2.5 7.5 8 3l5.5 4.5V13H2.5z"/>', aes: '<circle cx="8" cy="8" r="5.5"/><circle cx="6" cy="6.5" r=".9"/><circle cx="9.8" cy="6" r=".9"/><circle cx="10.5" cy="9.5" r=".9"/>',
      edits: '<rect x="2" y="3.5" width="12" height="9" rx="2"/><path d="M7 6.3v3.4L9.8 8z"/>', con: '<path d="M8 2a4.2 4.2 0 0 0-2.4 7.7V11h4.8V9.7A4.2 4.2 0 0 0 8 2zM6.2 13.5h3.6"/>',
      lib: '<path d="M8 2.2l1.7 3.6 3.9.5-2.9 2.7.7 3.9L8 11l-3.4 1.9.7-3.9-2.9-2.7 3.9-.5z"/>', soc: '<rect x="2" y="2" width="12" height="12" rx="3.5"/><circle cx="8" cy="8" r="2.8"/>',
      ads: '<path d="M5 5.5c-1.6 0-2.6 1.3-2.6 2.6S3.4 10.5 5 10.5c2.2 0 3.6-5 6-5 1.6 0 2.6 1.2 2.6 2.5S12.6 10.5 11 10.5C8.6 10.5 7.2 5.5 5 5.5z"/>',
      lab: '<path d="M6 2.5h4M6.8 2.5v4L3.2 12.6a1 1 0 0 0 .9 1.4h7.8a1 1 0 0 0 .9-1.4L9.2 6.5v-4"/>', cre: '<circle cx="6" cy="5.5" r="2.3"/><path d="M2 13.2c.5-2.3 2.1-3.6 4-3.6s3.5 1.3 4 3.6M10.6 3.4a2.2 2.2 0 0 1 0 4.3M12 9.8c1 .5 1.7 1.6 2 3.2"/>',
      kit: '<rect x="2.5" y="2.5" width="11" height="11" rx="3"/><path d="M2.5 9.5 6 6.5l3 2.5 1.8-1.4 2.7 2.4"/>', ui: '<rect x="4.5" y="1.8" width="7" height="12.4" rx="2"/><path d="M7 12h2"/>',
      ref: '<path d="M4 2.5h8v11l-4-2.8-4 2.8z"/>', mus: '<path d="M6 12.2V3.6l7-1.4v8.6M6 12.2a1.7 1.7 0 1 1-3.4 0 1.7 1.7 0 0 1 3.4 0zM13 10.8a1.7 1.7 0 1 1-3.4 0 1.7 1.7 0 0 1 3.4 0z"/>',
      plus: '<path d="M8 3v10M3 8h10"/>', plug: '<path d="M5.5 2v3.5M10.5 2v3.5M3.5 5.5h9V8a4.5 4.5 0 0 1-9 0zM8 12.5V14"/>', set: '<circle cx="8" cy="8" r="2.2"/><path d="M8 1.8v1.6M8 12.6v1.6M1.8 8h1.6M12.6 8h1.6M3.6 3.6l1.1 1.1M11.3 11.3l1.1 1.1M3.6 12.4l1.1-1.1M11.3 4.7l1.1-1.1"/>',
      dl: '<path d="M8 3v7M4.8 7 8 10.2 11.2 7M3.5 13h9"/>', mic: '<rect x="6" y="2" width="4" height="7.5" rx="2"/><path d="M3.8 7.8a4.2 4.2 0 0 0 8.4 0M8 12v2"/>', up: '<path d="M8 13V3M3.6 7.4 8 3l4.4 4.4"/>',
      chk: '<path d="M3.5 8.4l2.8 2.8 6.2-6.4"/>', l: '<path d="M10 3.5 5.5 8l4.5 4.5"/>', r: '<path d="M6 3.5 10.5 8 6 12.5"/>', cal: '<rect x="2.5" y="3.5" width="11" height="10" rx="2.5"/><path d="M2.5 6.8h11M5.5 2v3M10.5 2v3"/>',
      eye: '<path d="M1.8 8S4 3.8 8 3.8 14.2 8 14.2 8 12 12.2 8 12.2 1.8 8 1.8 8z"/><circle cx="8" cy="8" r="2"/>', full: '<path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10"/>', car: '<path d="M4.5 6.5 8 10l3.5-3.5"/>',
      pin: '<path d="M9.5 2.5l4 4-2 .8-2.6 2.6.2 2.6-1 1-2.3-2.3L3 14l-.5-.5 2.8-2.8L3 8.4l1-1 2.6.2 2.6-2.6z"/>', grid: '<path d="M2.5 2.5h4.5v4.5H2.5zM9 2.5h4.5v4.5H9zM2.5 9h4.5v4.5H2.5zM9 9h4.5v4.5H9z"/>'
    };
    var sv = function (k) { return '<svg viewBox="0 0 16 16" aria-hidden="true">' + I[k] + "</svg>"; };
    var ni = function (k, t, n, on) { return '<p class="ah-ni' + (on ? " on" : "") + '">' + sv(k) + "<span>" + t + "</span>" + (n != null ? "<em>" + n + "</em>" : "") + "</p>"; };
    var MARK = '<svg class="ah-mk" viewBox="36 36 440 440" aria-hidden="true"><use href="#studio-mark"/></svg>';
    var CLA = '<svg class="ah-cl" aria-hidden="true"><use href="#claude"/></svg>';
    var BEAM = '<span class="ah-cb" data-beam="cx" data-active aria-hidden="true"><span data-beam-bloom></span></span>';   /* the composer's border beam */
    var IG = '<i class="ah-p ig"></i>', TT = '<i class="ah-p tt"></i>', YT = '<i class="ah-p yt"></i>', LI = '<i class="ah-p li"></i>';
    var now = new Date(), DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    var hour = now.getHours(), greet = hour < 5 ? "Good evening" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    var date = now.toLocaleDateString("en-US", { weekday: "long" }) + " · " + now.toLocaleDateString("en-US", { month: "long", day: "numeric" });
    var rv = [["dinner-toast", "Review v02"], ["coffee-friend-arrives", "Review v04"], ["cofounder-whiteboard", "Review v03"], ["surfing", "Review v01"]];
    var pk = ["run-club", "coastal-highway", "investor-intro", "tennis-forehand", "yacht", "golf", "house-party", "beach-volleyball"];
    var cr = [["court-dap", "202× avg", "1,210 views", YT + IG], ["get-together", "142× avg", "75,755 views", IG + TT], ["mountain-biking", "33× avg", "17,530 views", IG]];
    var cal = "", sched = { 2: "private-jet", 5: "real-connections", 9: "race-track" };
    for (var d = 0; d < 14; d++) {
      var dt = new Date(now.getTime() + d * 864e5), s = sched[d];
      cal += '<div class="ah-dc' + (d === 0 ? " today" : "") + '"><p class="ah-dlb"><span>' + (d === 0 ? "Today" : DAYS[dt.getDay()]) + "</span><span>" + dt.getDate() + "</span></p>" +
        (s ? '<div class="ah-dps"><img src="' + M + s + '.jpg" alt=""><i class="ah-dot sc"></i></div><p class="ah-dg on">Scheduled</p>' : '<p class="ah-dg">Gap</p><p class="ah-fill">+ Fill</p>') + "</div>";
    }
    host.innerHTML =
      '<div class="ah">' +
      '<aside class="ah-sb" data-frost>' +
        '<p class="ah-sbh">' + MARK + "<span>Studio</span>" + sv("pin") + "</p>" +
        '<p class="ah-allb">' + sv("grid") + '<span data-ah-allb>All brands</span>' + sv("car") + "</p>" +
        ni("home", "Home", null, true) +
        '<p class="ah-ng">Create</p>' + ni("aes", "Aesthetic", 482) + ni("edits", "Full edits", 180) + ni("con", "Concepts", 79) + ni("lib", "AI Library", 460) +
        '<p class="ah-ng">Grow</p>' + ni("soc", "Social", 18) + ni("ads", "Ads", "0 live") + ni("lab", "Viral Lab", 23) + ni("cre", "Creators", 441) +
        '<p class="ah-ng">Library</p>' + ni("kit", "Brand kit", 46) + ni("ui", "App UI", 35) + ni("ref", "References", 20) + ni("mus", "Music", 345) +
        '<div class="ah-sbf">' + ni("plus", "Build a tab") +
        '<p class="ah-ask"><span class="ah-cb" data-beam="cx" data-active aria-hidden="true"><span data-beam-bloom></span></span><span class="ah-lk">' + MARK + "<em>×</em>" + CLA + "</span><span>Ask Studio…</span>" + sv("mic") + '<b>2</b></p>' +
        ni("plug", "Integrations") + ni("set", "Settings") + "</div>" +
      "</aside>" +
      '<div class="ah-main" data-frost>' +
        '<div class="ah-top"><p class="ah-coord">37.6800° N · 97.7600° W · ELEV 1324 M</p><span class="ah-tools"><b class="ah-tl">' + sv("l") + '</b><b class="ah-wp"><img src="assets/su/dune-chip.jpg" alt="">Orange dune, blue sky' + sv("car") + '</b><b class="ah-tl">' + sv("r") + '</b><b class="ah-wp f">' + sv("eye") + 'Focus</b><b class="ah-tl sq">' + sv("full") + "</b></span></div>" +
        '<div class="ah-hi"><p class="ah-date">' + esc(date) + '</p><p class="ah-hello" data-ah-hello>' + greet + '</p><p class="ah-line">Today is a good day to make something great.</p>' +
          '<div class="ah-comp"><span class="ah-cb" data-beam="cx" data-active aria-hidden="true"><span data-beam-bloom></span></span><span class="ah-drop">Drop to add to Studio</span><div class="ah-att" data-ah-att></div><p class="ah-cq"><span data-ah-ask>Post my newest videos on every channel this week</span><i></i></p><div class="ah-crow"><span class="ah-lk">' + MARK + "Studio <em>×</em> " + CLA + 'Claude</span><span class="ah-fl"></span><b class="ah-mic">' + sv("mic") + '</b><b class="ah-send">' + sv("up") + "</b></div></div>" +
          '<div class="ah-chips" data-ah-chips></div></div>' +
        '<div class="ah-band">' +
          '<div class="ah-wk" data-ah-wk hidden><b>Working now</b><span class="ah-wn">1</span><span class="ah-card"><i class="ah-spin"></i>' + MARK + '<span data-ah-wkt>Studio · Launch film</span><em data-ah-wks>Cutting 3 clips…</em></span><span class="ah-fl"></span><b class="ah-pill">All chats</b></div>' +
          '<div class="ah-setup"><b>Set up your Studio</b><span class="ah-wn">11 of 12</span><i class="ah-bar"><i></i></i><span class="ah-fl"></span><span class="ah-nx">Next: Bring in your business folder</span><b class="ah-pill">Show' + sv("car") + "</b></div>" +
          '<div class="ah-row">' +
            '<section class="ah-w"><header class="ah-wh"><b>To review</b><span class="ah-wn" data-ah-rvn>20</span><span class="ah-fl"></span><b class="ah-pill">' + sv("chk") + 'Mark all read</b><span class="ah-arr">' + sv("l") + sv("r") + '</span></header><div class="ah-strip" data-ah-rv>' +
              rv.map(function (x) { return '<span class="ah-vt"><img src="' + M + x[0] + '.jpg" alt=""><span class="ah-st"><i class="ah-dot"></i>' + x[1] + "</span></span>"; }).join("") + "</div></section>" +
            '<section class="ah-w"><header class="ah-wh"><b>Post next</b><span class="ah-ws">Studio\'s picks</span><span class="ah-fl"></span><b class="ah-pill">See all</b></header><div class="ah-strip" data-ah-pk>' +
              pk.map(function (x) { return '<span class="ah-vt"><img src="' + M + x + '.jpg" alt=""><span class="ah-bl">' + MARK + "</span></span>"; }).join("") + "</div></section>" +
            '<section class="ah-w"><header class="ah-wh"><b>Crushing it</b><span class="ah-fl"></span><b class="ah-pill">See all</b></header><div class="ah-crl">' +
              cr.map(function (x) { return '<div class="ah-crr"><img src="' + M + x[0] + '.jpg" alt=""><div class="ah-crb"><p class="ah-crx">' + x[3] + "<span>" + x[1] + '</span></p><p class="ah-crn">' + x[2] + '</p></div><b class="ah-ad"><i class="ah-p mt"></i>Create</b></div>'; }).join("") + "</div></section>" +
          "</div>" +
          '<section class="ah-calw"><header class="ah-wh"><b>Going out</b><span class="ah-ws">Next 14 days</span><span class="ah-wn">3 going out · 11 empty days</span><span class="ah-fl"></span><b class="ah-pill">' + sv("cal") + 'Calendar</b></header><div class="ah-days">' + cal + "</div></section>" +
        "</div>" +
        /* the full editor: the preview, and the timeline filling as Studio cuts (SK.appStory) */
        '<div class="ah-ed" aria-hidden="true"><div class="ah-edh">' + sv("l") + '<span class="ah-edt"><b>Launch commercial</b><em data-ed-v>v01 · Cutting…</em></span><span class="ah-fl"></span><span class="ah-edb">16:9</span><span class="ah-edb">0:30</span><b class="ah-pill on">Export</b></div>' +
          '<div class="ah-pv"><img alt="" data-ed-pv><p class="ah-cap" data-ed-cap></p><span class="ah-pvl">' + MARK + 'Studio</span><span class="ah-pvt" data-ed-t>0:00</span></div>' +
          '<div class="ah-tln"><p class="ah-trk"><em>Video</em><span data-ed-trk="v"></span></p><p class="ah-trk"><em>Captions</em><span data-ed-trk="c"></span></p><p class="ah-trk"><em>Music</em><span data-ed-trk="m"></span></p><p class="ah-trk"><em>Brand</em><span data-ed-trk="b"></span></p><i class="ah-ph" data-ed-ph></i></div>' +
        "</div>" +
      "</div>" +
      /* Ask Studio, the chat that slides in from the right */
      '<aside class="ah-ap" data-frost aria-hidden="true"><header class="ah-aph"><span class="ah-lk">' + MARK + "<em>×</em>" + CLA + '</span><b>Ask Studio</b><span class="ah-fl"></span><b class="ah-pill">New chat</b></header><div class="ah-msgs" data-ap-m></div>' +
        '<div class="ah-apc">' + BEAM + '<span>Reply to Studio…</span><span class="ah-fl"></span><b class="ah-mic">' + sv("mic") + '</b><b class="ah-send">' + sv("up") + "</b></div></aside>" +
      /* the footage you drag in */
      '<div class="ah-drag" aria-hidden="true"><span class="ah-dst" data-ah-dst></span><svg class="ah-cur" viewBox="0 0 24 24"><path d="M5 3l14 8.2-6.3 1.4L9.6 19z"/></svg></div>' +
      "</div>";
    /* the composer's beam moves only while a request is being typed; Ask Studio's while its panel is open (each moving beam costs a style pass a frame) */
    var cbs = host.querySelectorAll(".ah-cb"); for (var ci = 0; ci < cbs.length; ci++) cbs[ci].setAttribute("data-paused", "");
    var beamRun = function (sel, on) { var b = host.querySelector(sel); if (b) { if (on) b.removeAttribute("data-paused"); else b.setAttribute("data-paused", ""); } };
    var hello = host.querySelector("[data-ah-hello]"), chips = host.querySelector("[data-ah-chips]"), ask = host.querySelector("[data-ah-ask]"), pkEl = host.querySelector("[data-ah-pk]"), pkWs = pkEl.parentNode.querySelector(".ah-ws");
    var ctl = {
      name: function (n, typing) { hello.innerHTML = esc(greet) + (n ? ", " + esc(n) : "") + (typing ? '<i class="ah-caret"></i>' : ""); },
      /* Post next, made for who you are: [{ img, kicker, title, fresh }] lead the strip, labelled; label replaces "Studio's picks" */
      picks: function (items, label) {
        pkWs.textContent = label || "Studio's picks";
        var tiles = (items || []).map(function (x, i) { return '<span class="ah-vt ah-mf' + (x.fresh ? " wl-in-a" : "") + '" style="--i:' + i + '"><img src="' + esc(x.img) + '" alt=""><span class="ah-bl">' + MARK + '</span><span class="ah-mfl"><em>' + esc(x.kicker) + "</em><b>" + esc(x.title) + "</b></span></span>"; });
        pkEl.innerHTML = tiles.concat(pk.slice(0, Math.max(0, 8 - tiles.length)).map(function (x) { return '<span class="ah-vt"><img src="' + M + x + '.jpg" alt=""><span class="ah-bl">' + MARK + "</span></span>"; })).join("");
      },
      brands: function (list) {
        chips.innerHTML = (list || []).map(function (b, i) { return '<span class="ah-chip" style="--i:' + i + '">' + (b.img ? '<img class="ah-bm" src="' + esc(b.img) + '" alt="">' : '<span class="ah-bm" style="background:' + (b.bg || "#1a1a1a") + ";color:" + (b.ink || "#fff") + '">' + esc(b.m || (b.n || "?").charAt(0)) + "</span>") + esc(b.n) + "</span>"; }).join("");
      },
      allBrands: function (t) { host.querySelector("[data-ah-allb]").textContent = t; },
      typeAsk: function (t, caret) { ask.textContent = t; host.querySelector(".ah-comp").classList.toggle("live", !!caret); beamRun(".ah-comp > .ah-cb", !!caret); },
      attach: function (imgs) { host.querySelector("[data-ah-att]").innerHTML = (imgs || []).map(function (u, i) { return '<span class="wl-in-a" style="--i:' + i + '"><img src="' + esc(u) + '" alt=""></span>'; }).join("") + (imgs && imgs.length ? "<b>" + imgs.length + " clips</b>" : ""); },
      sending: function (on) { host.querySelector(".ah-comp").classList.toggle("send", !!on); },
      working: function (on, title, status) { var wk = host.querySelector("[data-ah-wk]"); wk.hidden = !on; if (title) host.querySelector("[data-ah-wkt]").textContent = title; if (status) host.querySelector("[data-ah-wks]").textContent = status; },
      review: function (item) {
        var rv = host.querySelector("[data-ah-rv]"), old = rv.querySelector(".ah-new"); if (old) old.remove();
        if (!item) return;
        var t = document.createElement("span"); t.className = "ah-vt ah-new"; t.innerHTML = '<img src="' + esc(item.img) + '" alt=""><span class="ah-st"><i class="ah-dot"></i>Review v01</span><span class="ah-mfl"><em>' + esc(item.kicker) + "</em><b>" + esc(item.title) + "</b></span>";
        rv.insertBefore(t, rv.firstChild); host.querySelector("[data-ah-rvn]").textContent = "21";
      }
    };
    ctl.name(o.name || "");
    /* ---- the story pieces (SK.appStory): footage dragged in, the editor, the Ask Studio panel ---- */
    var root = host.querySelector(".ah"), comp = host.querySelector(".ah-comp"), drag = host.querySelector(".ah-drag"), msgs = host.querySelector("[data-ap-m]");
    var ed = host.querySelector(".ah-ed"), trk = function (k) { return host.querySelector('[data-ed-trk="' + k + '"]'); };
    var at = function (el) { var x = 0, y = 0; while (el && el !== root) { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; } return { x: x, y: y }; };
    ctl.drag = function (imgs) {   /* the clips fly in from off the bottom right, on the pointer, and drop into the composer */
      host.querySelector("[data-ah-dst]").innerHTML = imgs.map(function (u, i) { return '<img src="' + esc(u) + '" alt="" style="--i:' + i + '">'; }).join("");
      var c = at(comp), tx = c.x + comp.offsetWidth * .42, ty = c.y + 18;
      drag.style.transition = "none"; drag.style.transform = "translate(1500px, 960px)"; drag.className = "ah-drag on"; void drag.offsetWidth;
      drag.style.transition = ""; drag.style.transform = "translate(" + tx + "px, " + ty + "px)";
      setTimeout(function () { comp.classList.add("over"); }, 700);
      return SK.sleep(SK.reduced ? 0 : 1300).then(function () { drag.classList.add("drop"); comp.classList.remove("over"); ctl.attach(imgs); return SK.sleep(SK.reduced ? 0 : 380); }).then(function () { drag.className = "ah-drag"; });
    };
    /* the app runs off the right edge of the screen: the editor and Ask Studio keep to the part you can see (--cut, app pixels) */
    var fitCut = function () { var r = root.getBoundingClientRect(), k = r.width / 1440 || 1, vis = (window.innerWidth - r.left) / k; root.style.setProperty("--cut", Math.max(0, Math.round(1440 - vis + 28)) + "px"); };
    ctl.editor = function (on) { if (on) fitCut(); root.classList.toggle("editing", !!on); if (SK.frost) SK.frost.nudge(1000); if (!on) { ["v", "c", "m", "b"].forEach(function (k) { trk(k).innerHTML = ""; }); host.querySelector("[data-ed-cap]").textContent = ""; host.querySelector("[data-ed-v]").textContent = "v01 · Cutting…"; root.classList.remove("ed-play"); } };
    ctl.clip = function (u, i) { trk("v").insertAdjacentHTML("beforeend", '<i class="ah-tc wl-in-a" style="--i:0;flex:' + (i === 1 ? 1.5 : 1) + '"><img src="' + esc(u) + '" alt=""></i>'); host.querySelector("[data-ed-pv]").src = u; };
    ctl.music = function () { var w = ""; for (var i = 0; i < 90; i++) w += '<b style="height:' + Math.round(22 + 70 * Math.abs(Math.sin(i * .37) * Math.cos(i * .11))) + '%"></b>'; trk("m").innerHTML = '<i class="ah-tw">' + w + "</i>"; };
    ctl.captions = function (lines) { trk("c").innerHTML = lines.map(function (t, i) { return '<i class="ah-tcp wl-in-a" style="--i:' + i + '">' + esc(t) + "</i>"; }).join(""); };
    ctl.brandTrack = function () { trk("b").innerHTML = '<i class="ah-tb wl-in-a" style="--i:0">' + MARK + 'Logo · end card</i><i class="ah-tb wl-in-a" style="--i:1">Brand colours</i>'; };
    ctl.title = function (t) { host.querySelector(".ah-edt b").textContent = t; };
    ctl.caption = function (t) { host.querySelector("[data-ed-cap]").textContent = t; };
    ctl.play = function (on) { root.classList.toggle("ed-play", !!on); if (on) host.querySelector("[data-ed-v]").textContent = "v01 · Ready to review"; };
    ctl.panel = function (on) { if (on) fitCut(); root.classList.toggle("asking", !!on); beamRun(".ah-apc > .ah-cb", !!on); beamRun(".ah-ask > .ah-cb", !!on); if (SK.frost) SK.frost.nudge(1000); if (!on) setTimeout(function () { if (!root.classList.contains("asking")) msgs.innerHTML = ""; }, 600); };
    ctl.msg = function (who, html, imgs) {   /* who: "you" | "studio" | "step" (a line that turns from a spinner to a tick) */
      var m = document.createElement("div"); m.className = "ah-m " + who + " wl-in-a";
      m.innerHTML = who === "studio" ? '<span class="ah-av">' + MARK + "</span><p>" + html + "</p>" : who === "step" ? '<i class="ah-spin"></i><span>' + html + "</span>" :
        (imgs && imgs.length ? '<span class="ah-mi">' + imgs.map(function (u) { return '<img src="' + esc(u) + '" alt="">'; }).join("") + "</span>" : "") + "<p>" + html + "</p>";
      msgs.appendChild(m); return { done: function () { m.classList.add("ok"); } };
    };
    ctl.brands(o.brands || SK.BRANDS);
    return ctl;
  };


  /* the three brands every Studio on the site shows: Studio, MIRRA, Custom Esignature (their own logos, assets/brands/) */
  SK.BRANDS = [{ n: "Studio", img: "assets/brands/studio.svg" }, { n: "MIRRA", img: "assets/brands/mirra.png" }, { n: "Custom Esignature", img: "assets/brands/ces.png" }];

  /* SK.appStory(ctl, o): the Home at work, on a loop. Your footage is dragged into the composer, the request types itself and goes,
     Ask Studio opens on the right and answers while the full editor cuts it (clips land on the timeline, music, captions, the brand),
     the film plays, then it lands at the front of To review and it all starts again. o.sfx(name) for the app's own sounds, o.prompts
     (the requests it cycles), o.clips (sets of three images). Returns { stop() }. Reduced motion: nothing moves. */
  SK.appStory = function (ctl, o) {
    o = o || {}; var tok = { on: true }, sfx = o.sfx || function () {}, M = "assets/media/selects/";
    var prompts = o.prompts || ["Create a new launch commercial for my company", "Cut a 15-second ad from my newest clips", "Make this week's reel for every channel"];
    var sets = o.clips || [["cofounder-whiteboard", "coffee-friend-arrives", "dinner-toast"], ["tennis-forehand", "run-club", "golf"], ["surfing", "yacht", "coastal-highway"]];
    var caps = o.captions || [["Meet Studio.", "One prompt.", "A finished film."], ["Built to move.", "Made in minutes."], ["Every channel.", "One request."]];
    var titles = ["Launch commercial", "15-second ad", "This week's reel"];
    var w = function (ms) { return SK.sleep(ms).then(function () { if (!tok.on) throw 0; }); };
    if (SK.reduced) { ctl.typeAsk(prompts[0]); return { stop: function () {} }; }
    (async function () {
      try {
        for (var r = 0; ; r++) {
          var text = prompts[r % prompts.length], imgs = sets[r % sets.length].map(function (x) { return M + x + ".jpg"; }), cp = caps[r % caps.length];
          ctl.editor(false); ctl.panel(false); ctl.working(false); ctl.sending(false); ctl.attach([]); ctl.typeAsk("", true);
          await w(r ? 900 : 1400);
          sfx("tick"); await ctl.drag(imgs); if (!tok.on) throw 0; sfx("land");
          await w(450);
          for (var i = 1; i <= text.length; i++) { ctl.typeAsk(text.slice(0, i), true); if (i % 3 === 0) sfx("key"); await w(30 + Math.random() * 28); }
          await w(420); ctl.sending(true); sfx("send");
          await w(300); ctl.sending(false); ctl.typeAsk("", false); ctl.attach([]);
          ctl.panel(true); ctl.msg("you", text, imgs);
          await w(700); ctl.title(titles[r % titles.length]); ctl.editor(true);
          var m1 = ctl.msg("studio", "On it. A 30-second film from your 3 clips, in your brand.");
          await w(900);
          var s1 = ctl.msg("step", "Picking the best moments");
          for (var k = 0; k < imgs.length; k++) { await w(420); ctl.clip(imgs[k], k); sfx("tick"); }
          s1.done(); var s2 = ctl.msg("step", "Cutting to the music"); await w(500); ctl.music(); await w(700); s2.done();
          var s3 = ctl.msg("step", "Captions and your logo"); await w(400); ctl.captions(cp); ctl.caption(cp[0]); await w(500); ctl.brandTrack(); await w(500); s3.done();
          ctl.play(true); sfx("done");
          for (var c = 1; c <= cp.length; c++) { await w(900); ctl.caption(cp[c % cp.length]); }
          ctl.msg("studio", "Done. <b>v01</b> is in To review. Want a 15-second cut too?");
          await w(2200);
          ctl.panel(false); ctl.editor(false);
          ctl.review({ img: imgs[0], kicker: "Film", title: titles[r % titles.length] }); sfx("land");
          await w(3600);
        }
      } catch (e) {}
    })();
    return { stop: function () { tok.on = false; ctl.editor(false); ctl.panel(false); } };
  };

  /* ---------- the edges (iPhone): the page runs under the status bar and the home indicator (viewport-fit=cover, no theme-color).
     What shows when you pull past the top or bottom (and what Safari tints its bars from) is the root's background, so it is kept
     the colour of the page at that edge: the hero's sky near the top, the page's ink further down. On the waitlist and the
     sign-up it is the colour of the top of the current wallpaper (SK.edgeTint, sampled from the image itself). ---------- */
  SK.edgeTint = function (src) {
    if (!src) return;
    var im = new Image(); im.onload = function () {
      try {
        var c = document.createElement("canvas"); c.width = 16; c.height = 4; var g = c.getContext("2d");
        g.drawImage(im, 0, 0, im.naturalWidth, im.naturalHeight * .06, 0, 0, 16, 4);
        var d = g.getImageData(0, 0, 16, 4).data, r = 0, gg = 0, b = 0, n = d.length / 4;
        for (var i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; }
        document.documentElement.style.backgroundColor = "rgb(" + Math.round(r / n) + "," + Math.round(gg / n) + "," + Math.round(b / n) + ")";
      } catch (e) {}
    };
    im.src = src;
  };
  function edges() {
    if (window.SK_PAGE) return;   /* the sheets set their own (SK.edgeTint) */
    var hero = document.getElementById("hero"); if (!hero) return;
    var root = document.documentElement, top = "#18436a", ink = "", on = null;
    var set = function () { var near = window.scrollY < (hero.offsetHeight || innerHeight) * .6; if (near === on) return; on = near; root.style.backgroundColor = near ? top : ink; };
    set(); window.addEventListener("scroll", set, { passive: true });
  }

  /* ---------- frost that works on every device: the glass over the wallpaper ([data-frost]) gets a pre-blurred copy of the current
     wallpaper (assets/.../*-frost.jpg, 360 px, blurred) as its background, lined up with where the wallpaper sits on the screen, under
     its tint and rim. iPhone's WebKit draws no live backdrop blur inside a masked or faded box, and it costs a phone far less than a
     live 30 px blur. SK.frost(src) on a wallpaper change; it re-aligns on resize and while things move (SK.frost.nudge()). ---------- */
  SK.frost = (function () {
    var src = "", t = 0, until = 0;
    function place() {
      var els = document.querySelectorAll("[data-frost]"); if (!src || !els.length) return;
      var sky = document.querySelector(".wl.open .wl-sky:not(.nx)") || document.querySelector(".wl-sky"), vw = innerWidth, vh = innerHeight;
      var a = sky && sky.naturalWidth ? sky.naturalWidth / sky.naturalHeight : 16 / 9, dw = vw / vh > a ? vw : vh * a, dh = vw / vh > a ? vw / a : vh, dx = (vw - dw) * .5, dy = (vh - dh) * .4;
      for (var i = 0; i < els.length; i++) {
        var el = els[i], r = el.getBoundingClientRect(); if (!r.width || !el.offsetWidth) continue;
        var k = r.width / el.offsetWidth;
        el.style.setProperty("--fz-img", 'url("' + src + '")');
        el.style.setProperty("--fz-w", (dw / k).toFixed(1) + "px"); el.style.setProperty("--fz-h", (dh / k).toFixed(1) + "px");
        el.style.setProperty("--fz-x", ((dx - r.left) / k).toFixed(1) + "px"); el.style.setProperty("--fz-y", ((dy - r.top) / k).toFixed(1) + "px");
      }
    }
    function loop() { place(); if (performance.now() < until) t = requestAnimationFrame(loop); else t = 0; }
    function nudge(ms) { until = Math.max(until, performance.now() + (ms || 1800)); if (!t) t = requestAnimationFrame(loop); }
    window.addEventListener("resize", function () { nudge(400); });
    var f = function (wall) { if (!wall) return; src = new URL(wall.replace(/(-m)?\.jpg$/, function (m, mm) { return (mm || "") + "-frost.jpg"; }), document.baseURI).href;   /* absolute: a url() in a custom property resolves against the stylesheet that uses it */ var im = new Image(); im.src = src; nudge(2600); };
    f.nudge = nudge; f.place = place;
    return f;
  })();

  /* ---------- Chapters (review only: this Mac): a glass pill at the top, like Fresh Studio's in the app (Studio_App web/fresh/fresh.js).
     Every step of the page in order, the one on screen marked, any one a press away with sample answers filled in (no real email, no
     code, no card); Back and Next beside it; and the background, from the app's own wallpapers, kept on this browser.
     SK.chapters({ list: [[id, name]], now: () => id, go: (id) => {}, walls: true, wall: (src or "") => {}, wallDefault: "Orange dune" })
     SK.wallPick() is the background picked here ("" = the page's own). ---------- */
  SK.WALLS = [["su/done", "Orange dune"], ["wl/name", "Lone tree"], ["wl/in", "Peach dawn"], ["wl/roles", "Dune grass"], ["wl/claude", "Coast pine"], ["wl/you", "Pebble Beach"], ["su/code", "Tahoe morning"], ["su/plan", "Tahoe turquoise"], ["su/pay", "Open ocean"], ["su/in", "Clouds"]];
  SK.wallPick = function () { try { return localStorage.getItem("studio-wall-" + (window.SK_PAGE || "site")) || ""; } catch (e) { return ""; } };
  SK.chapters = function (o) {
    var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
    var el = document.createElement("div"); el.className = "sk-ch"; el.setAttribute("data-sfx", "off");
    var CHEV = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4.5 6.5 3.5 3.5 3.5-3.5"/></svg>';
    el.innerHTML = '<button type="button" class="sk-chb" data-n="-1" aria-label="The chapter before"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m9.5 4-4 4 4 4"/></svg></button>' +
      '<button type="button" class="sk-chp" aria-haspopup="menu" aria-expanded="false"><i class="dot"></i><span class="k">Chapters</span><span class="c"></span>' + CHEV + "</button>" +
      '<button type="button" class="sk-chb" data-n="1" aria-label="The chapter after"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6.5 4 4 4-4 4"/></svg></button>' +
      '<div class="sk-chm" role="menu" hidden></div>';
    document.body.appendChild(el);
    var pill = el.querySelector(".sk-chp"), menu = el.querySelector(".sk-chm");
    var idx = function () { var n = o.now(); for (var i = 0; i < o.list.length; i++) if (o.list[i][0] === n) return i; return 0; };
    function paint() { el.querySelector(".c").textContent = (o.list[idx()] || [])[1] || ""; el.querySelector('[data-n="-1"]').disabled = idx() === 0; el.querySelector('[data-n="1"]').disabled = idx() === o.list.length - 1; }
    function paintMenu() {
      var c = idx(), pick = SK.wallPick();
      var h = '<p class="h">Chapters</p>' + o.list.map(function (x, i) { return '<button type="button" class="i' + (i === c ? " on" : "") + '" role="menuitem" data-to="' + esc(x[0]) + '"><span class="n">' + (i < 9 ? "0" : "") + (i + 1) + '</span><b>' + esc(x[1]) + "</b><em>" + (i === c ? "Now" : "") + "</em></button>"; }).join("");
      if (o.walls) h += '<p class="h">Background</p><div class="w">' + '<button type="button" class="t' + (pick ? "" : " on") + '" data-wall=""><span class="d">' + esc(o.wallDefault || "Each step") + "</span><b>Default</b></button>" +
        SK.WALLS.map(function (w) { return '<button type="button" class="t' + (pick === w[0] ? " on" : "") + '" data-wall="' + w[0] + '"><img src="assets/' + w[0] + '.jpg" alt="" loading="lazy"><b>' + esc(w[1]) + "</b></button>"; }).join("") + "</div>";
      menu.innerHTML = h;
    }
    function open(on) { menu.hidden = !on; pill.setAttribute("aria-expanded", on ? "true" : "false"); if (on) paintMenu(); }
    pill.addEventListener("click", function (e) { e.stopPropagation(); open(menu.hidden); });
    el.querySelectorAll(".sk-chb").forEach(function (b) { b.addEventListener("click", function () { var i = idx() + +b.getAttribute("data-n"); if (o.list[i]) { o.go(o.list[i][0]); setTimeout(paint, 60); } }); });
    menu.addEventListener("click", function (e) {
      e.stopPropagation();
      var t = e.target.closest("[data-to]"), w = e.target.closest("[data-wall]");
      if (t) { open(false); o.go(t.getAttribute("data-to")); setTimeout(paint, 60); }
      if (w) { var v = w.getAttribute("data-wall"); try { if (v) localStorage.setItem("studio-wall-" + (window.SK_PAGE || "site"), v); else localStorage.removeItem("studio-wall-" + (window.SK_PAGE || "site")); } catch (x) {} if (o.wall) o.wall(v ? "assets/" + v + ".jpg" : ""); paintMenu(); }
    });
    document.addEventListener("click", function () { if (!menu.hidden) open(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !menu.hidden) open(false); });
    paint();
    return { paint: paint };
  };

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

  /* ---------- Send to my Mac: on phones every Download button (the nav, the hero, the steps, the unlocked Private beta card) becomes
     "Send to my Mac" and opens the phone's share sheet (AirDrop on an iPhone) with this page's #pricing link. When the invite code is
     unlocked on the phone, the code rides along in the hash only (#pricing&invite=CODE), never in the query, and the Mac lands
     unlocked (160-pricing). Without a share sheet, or when it fails, the link is copied instead. Desktop is unchanged. ---------- */
  var SEND_ICON = '<svg class="send-ic" viewBox="0 0 18 18" aria-hidden="true" style="fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round"><path d="M6.2 7.4H5.1A1.6 1.6 0 0 0 3.5 9v5.4A1.6 1.6 0 0 0 5.1 16h7.8a1.6 1.6 0 0 0 1.6-1.6V9a1.6 1.6 0 0 0-1.6-1.6h-1.1"/><path d="M9 10.6V2.4M6.2 5.2 9 2.4l2.8 2.8"/></svg>';
  var SEND = "Send to my Mac", SEND_HELP = "Studio runs on your Mac. Send this page there to download it.";
  function sendLabel(b) { return b.querySelector(":scope > span:not([data-beam-bloom])"); }
  function sendLabels() {
    var m = SK.mobile();
    document.querySelectorAll("[data-download], [data-dl]").forEach(function (b) {
      var svg = b.querySelector(":scope > svg"), sp = sendLabel(b);
      if (!sp) return;
      if (m && !b._send) {
        b._send = { svg: svg ? svg.outerHTML : "", txt: sp.textContent };
        if (svg) svg.outerHTML = SEND_ICON; else b.insertAdjacentHTML("afterbegin", SEND_ICON);
        sp.textContent = SEND; b.setAttribute("data-send", "");
      } else if (!m && b._send) {
        var ic = b.querySelector(":scope > svg.send-ic");
        if (ic) { if (b._send.svg) ic.outerHTML = b._send.svg; else ic.remove(); }
        sp.textContent = b._send.txt; b._send = null; b.removeAttribute("data-send");
      }
    });
  }
  SK.shareURL = function () {
    var code = null;
    try { code = localStorage.getItem("studio-invite"); } catch (e) {}
    return location.origin + location.pathname + "#pricing" + (code ? "&invite=" + encodeURIComponent(code) : "");
  };
  function sendToMac(btn) {
    var url = SK.shareURL();
    if (navigator.share) {
      try {
        var q = navigator.share({ title: "Studio", text: "Open this on your Mac to download Studio.", url: url });
        if (q && q.catch) q.catch(function (err) { if (!err || err.name !== "AbortError") copyLink(btn, url); });
        return;
      } catch (err) { /* fall through to copying the link */ }
    }
    copyLink(btn, url);
  }
  function copyLink(btn, url) {
    var done = function () {
      var sp = sendLabel(btn), h = btn.parentNode && btn.parentNode.querySelector("[data-send-help]");
      if (sp) sp.textContent = "Link copied";
      if (h) h.textContent = "Open it on your Mac to download.";
      clearTimeout(btn._ct);
      btn._ct = setTimeout(function () { if (sp && btn._send) sp.textContent = SEND; if (h) h.textContent = SEND_HELP; }, 2400);
    };
    var old = function () { var t = document.createElement("textarea"); t.value = url; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0"; document.body.appendChild(t); t.select(); try { document.execCommand("copy"); } catch (e) {} t.remove(); done(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, old); else old();
  }

  /* ---------- Kayla: the listen pill (fixed, .kp) and inline clips (.vo[data-src]) ----------
     Waveform bars and the length come from <audio file name>.json next to the mp3. Only one clip plays at a time. */
  var audios = []; SK.audios = audios; /* a section with its own players adds them here so only one clip plays at a time */
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
    var heard = false;
    try { heard = sessionStorage.getItem("vo-heard") === "1"; } catch (e) {}
    if (heard) document.documentElement.classList.add("vo-heard");
    if (kp) {
      var a = player(kp, kp.getAttribute("data-src"), SK.mobile() ? 26 : 46);
      SK.kayla = { audio: a, pause: function () { audios.forEach(function (o) { o.pause(); }); } };
      /* Kayla starts by herself, from the beginning. Browsers only allow sound without a gesture on some visits, so when the
         first try is refused she starts on the reader's first click, tap or key press anywhere (unless they chose a clip themselves). */
      a.preload = "auto";
      SK.beam(kp.querySelector(".kp-pill"), { size: "sm", variant: "mirra", boost: 2, radius: 22 });
      var started = false, tryPlay = function () { if (started) return; var q = a.play(); if (q && q.then) q.then(function () { started = true; off(); }).catch(function () {}); };
      var onGesture = function (e) {
        if (started) return off();
        if (e.target && e.target.closest && e.target.closest(".wl, [data-early]")) return; /* early access sign-up: not a reason to start her (900-early) */
        if (e.target && e.target.closest && e.target.closest(".vo, .kp, .fm, [data-vo-play], [data-enter], [data-note]")) { started = true; return off(); }
        if (audios.some(function (o) { return !o.paused; })) { started = true; return off(); }
        tryPlay();
      };
      var EV = ["pointerdown", "keydown", "touchend"], off = function () { EV.forEach(function (t) { window.removeEventListener(t, onGesture, true); }); };
      a.addEventListener("play", function () { started = true; off(); });
      /* she can be closed (the x on her pill), and stays closed on later visits until someone asks for her sound again (Enter site) */
      var OFFK = "studio-kayla-off", root = document.documentElement, isOff = false;
      try { isOff = localStorage.getItem(OFFK) === "1"; } catch (e) {}
      SK.kaylaOff = function () { audios.forEach(function (o) { o.pause(); }); root.classList.add("kp-off"); started = true; off(); try { localStorage.setItem(OFFK, "1"); } catch (e) {} };
      SK.kaylaOn = function () { root.classList.remove("kp-off"); try { localStorage.removeItem(OFFK); } catch (e) {} };
      var kx = kp.querySelector("[data-kp-x]");
      if (kx) kx.addEventListener("click", function (e) { e.stopPropagation(); SK.kaylaOff(); });
      if (isOff) { root.classList.add("kp-off"); started = true; }
      else {
        EV.forEach(function (t) { window.addEventListener(t, onGesture, true); });
        if (!SK.reduced && !SK.holdSound) (document.readyState === "complete" ? tryPlay() : window.addEventListener("load", tryPlay)); /* holdSound: the hero's Enter site starts her */
      }
    }
    document.querySelectorAll(".vo[data-src]").forEach(function (box) {
      if (box._vo) return; box._vo = true;
      box.setAttribute("role", "group"); box.setAttribute("aria-label", box.getAttribute("data-label") || "Kayla explains");
      box.innerHTML = '<span class="vo-pill"><span class="vo-face"><img src="assets/kayla.jpg" alt="Kayla" width="88" height="88" loading="lazy"></span>' +
        '<button class="vo-play" data-play aria-label="Play">' + PLAY + '</button>' +
        '<span class="vo-wave" data-wave></span><span class="vo-time" data-time></span></span>' +
        '<span class="vo-nudge" aria-hidden="true"><svg viewBox="0 0 12 12"><path d="M4.2 2.6v6.8L9.4 6z"/></svg>Tap to listen</span>';
      var va = player(box, box.getAttribute("data-src"), 34), paper = !!box.closest(".on-paper");
      /* on paper the beam has to be drawn much stronger to read: the colour run, on the light preset, with its stroke and bloom set by hand */
      SK.beam(box.querySelector(".vo-pill"), paper ? { size: "sm", variant: "mirra", theme: "light", stroke: 1, inner: 0.34, bloom: 0.75, width: 1.5, radius: 50 } : { size: "sm", variant: "mirra", boost: 2, radius: 50 });
      va.addEventListener("play", function () { document.documentElement.classList.add("vo-heard"); try { sessionStorage.setItem("vo-heard", "1"); } catch (e) {} });
      box._audio = va;
    });
    /* a link with data-vo-play="<clip name>" starts that section's clip from the top as it scrolls there (the Pricing links).
       It plays inside the click so Safari and iOS count it as the visitor's gesture, even with reduced motion; a clip already
       playing is left alone. Everything after is the clip's own play: wave, time, vo-heard, and Kayla's intro stays quiet. */
    document.querySelectorAll("[data-vo-play]").forEach(function (link) {
      link.addEventListener("click", function () {
        var box = document.querySelector('.vo[data-src*="' + link.getAttribute("data-vo-play") + '"]'), va = box && box._audio;
        if (!va || !va.paused) return;
        SK.kayla && SK.kayla.pause();
        try { va.currentTime = 0; } catch (e) {}
        var p = va.play(); p && p.catch(function () {});
      });
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
    document.querySelectorAll("[data-gx]").forEach(function (el) { var v = el.getAttribute("data-gx"); SK.gx(el, { hot: /hot/.test(v), paper: /paper/.test(v) }); });
    document.querySelectorAll("[data-beam-auto]").forEach(function (el) {
      var r = el.getAttribute("data-beam-radius");
      SK.beam(el, { size: el.getAttribute("data-beam-auto") || "md", boost: parseFloat(el.getAttribute("data-beam-boost")) || 1, radius: r != null ? parseFloat(r) : undefined, variant: el.getAttribute("data-beam-variant") || "mono" });
    });
    sendLabels();
    var mq = matchMedia("(max-width: 700px)");
    if (mq.addEventListener) mq.addEventListener("change", sendLabels); else if (mq.addListener) mq.addListener(sendLabels);
    document.addEventListener("click", function (e) {
      var snd = SK.mobile() && e.target.closest("[data-send]");
      if (snd) { e.preventDefault(); sendToMac(snd); return; }
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
    if (nav || kpEl) { var on = function () { var y = window.scrollY; nav && nav.classList.toggle("solid", y > 40); kpEl && kpEl.classList.toggle("mini", y > window.innerHeight * 0.7);
      if (kpEl) { var pr = kpEl.getBoundingClientRect(), stack = document.elementsFromPoint ? document.elementsFromPoint(window.innerWidth / 2, Math.min(window.innerHeight - 2, pr.bottom - 30)) : [], hit = null;
        for (var hi = 0; hi < stack.length; hi++) { if (!kpEl.contains(stack[hi])) { hit = stack[hi]; break; } }
        var sec = hit && hit.closest ? hit.closest("section, footer") : null, fr = hit && hit.closest ? hit.closest(".frame") : null;
        kpEl.classList.toggle("light", !!(sec && sec.classList.contains("on-paper") && !(fr && fr !== sec))); } }; on(); window.addEventListener("scroll", on, { passive: true }); }
    /* the nav slides away while scrolling down and returns only on a deliberate scroll up: the upward travel has to add up to
       14% of the screen (at least 110px) with no downward movement in between. Always shown near the top. */
    if (nav) (function () {
      var lastY = window.scrollY, up = 0, raf = 0;
      window.addEventListener("scroll", function () {
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = 0;
          var y = Math.max(0, window.scrollY), dy = y - lastY;
          lastY = y;
          if (y < 80) { up = 0; nav.classList.remove("away"); }
          else if (dy > 0) { up = 0; if (dy > 2) nav.classList.add("away"); }
          else if (dy < 0) { up -= dy; if (up > Math.max(110, window.innerHeight * 0.14)) nav.classList.remove("away"); }
        });
      }, { passive: true });
      nav.addEventListener("focusin", function () { nav.classList.remove("away"); });
    })();
    if (!window.SK_PAGE) kayla();
    edges();   /* the site's narrator; a page of its own (the waitlist, the sign-up) has its own voice */
    growFrames();
    focusSections();
    restLoops();
  };

  /* ---------- endless loops rest far off screen: a section more than a screen away pauses its endless CSS loops (beams, dots,
     rings, drifts) and they carry on before it is a screen away again, so nothing on screen changes; the browser just stops
     recomputing them every frame. Only endless loops are paused: a box that also runs a one-off animation (which JS may be timing)
     is left alone. The hero pauses its own (.off, 010-hero). CSS: [data-sk-rest] in base.css. ---------- */
  function restLoops() {
    if (!("IntersectionObserver" in window) || !document.documentElement.getAnimations) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) wakeLoops(e.target); else restSection(e.target); });
    }, { rootMargin: "100% 0px" });
    document.querySelectorAll("main > section:not(#hero)").forEach(function (s) { io.observe(s); });
    /* a jump (a link, a restored scroll) can land on a resting section before the observer reports it: wake it in the same frame */
    window.addEventListener("scroll", function () {
      if (!rested.length) return;
      var vh = window.innerHeight || 1;
      rested.slice().forEach(function (s) { var r = s.getBoundingClientRect(); if (r.bottom > -vh && r.top < 2 * vh) wakeLoops(s); });
    }, { passive: true });
  }
  var rested = [];
  var REST_KEY = { "": "e", "::before": "b", "::after": "a" };
  function restSection(sec) {
    var boxes = [];
    if (rested.indexOf(sec) < 0) rested.push(sec);
    sec.getAnimations({ subtree: true }).forEach(function (a) {
      var ef = a.effect, t = ef && ef.target, k = ef && REST_KEY[ef.pseudoElement || ""];
      if (!t || !k || a.playState !== "running") return;
      var b = null;
      for (var i = 0; i < boxes.length; i++) if (boxes[i].t === t && boxes[i].k === k) { b = boxes[i]; break; }
      if (!b) boxes.push((b = { t: t, k: k, loop: false, once: false }));
      if (ef.getTiming().iterations === Infinity) b.loop = true; else b.once = true;
    });
    boxes.forEach(function (b) {
      if (!b.loop || b.once) return;
      var v = (b.t.getAttribute("data-sk-rest") || "").split(" ");
      if (v.indexOf(b.k) < 0) b.t.setAttribute("data-sk-rest", (v.join(" ") + " " + b.k).trim());
    });
  }
  function wakeLoops(sec) {
    var i = rested.indexOf(sec);
    if (i < 0) return;
    rested.splice(i, 1);
    sec.querySelectorAll("[data-sk-rest]").forEach(function (el) { el.removeAttribute("data-sk-rest"); });
  }

  /* ---------- scroll focus (as on the Custom Esignature site): a section is dim and soft at the edge of the screen and comes to
     full strength as it enters; it fades again as it leaves. Opacity floor 15%, up to 8px blur (blur on desktop only). ---------- */
  function focusSections() {
    if (SK.reduced) return;
    var els = [].slice.call(document.querySelectorAll("main > section:not([data-own-focus])")), /* [data-own-focus]: the section dims its own groups (pricing) */ blur = !SK.mobile() && matchMedia("(pointer: fine)").matches, queued = false;
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
