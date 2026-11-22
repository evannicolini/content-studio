/* The site's one click sound (window.SKClick): the pass flip's own take (assets/sfx/app/ask-open.mp3), on every button, link and
   [role=button] the main page and the legal pages have. One tiny Web Audio player: fetched and decoded a beat after the page has loaded, the
   context is made and resumed inside that press, presses closer than 70 ms apart play once, nothing plays with reduced motion or
   with the speaker off on the sign-ups (localStorage studio-wl-sound), and a blocked or missing audio stack is simply silent.
   The sign-ups (900-early, 910-start) play the same file through their own mixer; SKClick.own is true there (window.SK_PAGE), so it never doubles.
   build.py puts this file before kit.js on every page; legal.py puts it before legal.js. */
(function () {
  "use strict";
  if (window.SKClick) return;
  var URL_ = "/assets/sfx/app/ask-open.mp3", GAIN = .55, GAP = 70;
  var AC = window.AudioContext || window.webkitAudioContext, ctx = null, buf = null, loading = false, last = 0;
  var reduced = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  function off() { try { return localStorage.getItem("studio-wl-sound") === "off"; } catch (e) { return false; } }
  /* decoded off to the side (an OfflineAudioContext needs no gesture and logs no autoplay warning), once the page has settled */
  function load() {
    if (loading || reduced || !AC || SKClick.own) return; loading = true;
    var OC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    fetch(URL_).then(function (r) { return r.ok ? r.arrayBuffer() : null; }).then(function (d) {
      if (!d) return;
      var dc = OC ? new OC(1, 1, 44100) : (wake(), ctx); if (!dc) return;
      var p = dc.decodeAudioData(d, function (b) { buf = b; }, function () {}); if (p && p.catch) p.catch(function () {});
    }).catch(function () {});
  }
  function wake() {
    if (!AC) return;
    try { if (!ctx || ctx.state === "closed") ctx = new AC(); if (ctx.state !== "running") { var r = ctx.resume(); r && r.catch && r.catch(function () {}); } } catch (e) { ctx = null; return; }
    load();
  }
  if (document.readyState === "complete") setTimeout(load, 1500); else window.addEventListener("load", function () { setTimeout(load, 1500); });
  function play(gain) {
    if (reduced || off() || SKClick.own) return;
    wake();
    var now = performance.now(); if (!ctx || !buf || now - last < GAP) return; last = now;
    try { var s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = buf; g.gain.value = gain || GAIN; s.connect(g); g.connect(ctx.destination); s.start(); } catch (e) {}
  }
  var HIT = "button, a[href], [role=button], summary, input[type=checkbox], input[type=radio], input[type=submit], input[type=button]";
  var SKClick = window.SKClick = { play: play, wake: wake, own: !!window.SK_PAGE };   /* a sign-up page (SK_PAGE) clicks through its own mixer */
  /* the first press only warms it up (fetch + decode take a beat); every press after that clicks */
  document.addEventListener("pointerdown", function (e) {
    if (SKClick.own) return;
    var t = e.target && e.target.closest && e.target.closest(HIT);
    if (!t || t.disabled || t.closest("[data-sfx=off]")) { wake(); return; }
    play();
  }, { capture: true, passive: true });
  document.addEventListener("keydown", function (e) { if (!SKClick.own && (e.key === "Enter" || e.key === " ") && e.target && e.target.closest && e.target.closest(HIT)) play(); }, true);
})();
