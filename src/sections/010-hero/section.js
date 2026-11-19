/* 010 hero: the approved "Hero A · App leans back" (design canvas HeroA + StudioApp), in plain JS.
   Intro: once per page load, then never again until a reload. Timings are the canvas's (ms after the type and the sky are ready,
   1200 at most): 120 the words pull into focus, 1500 the head moves up and the nav, button, composer and app arrive, 3300 the
   prompt loop starts. The loop types a prompt (46 ms a character), then +420 tap, +640 working, +1300 the app opens the screen
   that answers it, +5600 the composer clears, +6200 the next prompt. After the last prompt it goes back to Home and starts again.
   It only runs while the hero is in view. With reduced motion the hero is shown settled and nothing moves. */
var hero = document.getElementById("hero");
if (!hero) return;
var html = document.documentElement;
var cp = hero.querySelector(".cp"), ask = hero.querySelector(".cp-t"), app = hero.querySelector(".sa"), stage = hero.querySelector(".hx-stage"), sky = hero.querySelector(".hx-sky");
var DESK = matchMedia("(min-width: 861px) and (min-aspect-ratio: 5/4)"); /* the same query as section.css and base.css */
function phone() { return !DESK.matches; }

/* each prompt opens the screen that answers it: editor, editor with the note, Aesthetic, Social, Ask Claude */
var PROMPTS = ["Make me a launch commercial for my company", "Make the ending hit harder", "Give my brand a look people remember", "Post all my content across all my channels", "What should I post this week?"];
var PROMPTS_M = ["Make my launch commercial", "Make the ending hit harder", "Give my brand a look", "Post everywhere this month", "What should I post this week?"];
var VIEW = ["sa v-home", "sa v-edit s1", "sa v-edit s1 s2", "sa v-aes", "sa v-social", "sa v-ask"];
var ASK = "What should we make?", CHAR_MS = 46;

/* ---------- Social: November 2026, weeks start Monday (Oct 26 to Nov 29). Two posts on busy days, one on the rest. ---------- */
(function () {
  var grid = hero.querySelector(".so-grid"), TIMES = ["10a", "4p", "6p", "9a", "12p", "11a", "4p", "10a"], BUSY = [3, 6, 10, 13, 16, 18, 20, 24, 27], k = 0, h = "";
  for (var c = 0; c < 35; c++) {
    var n = c < 6 ? 26 + c : c - 5, out = c < 6;
    h += '<div class="so-d' + (out ? " out" : "") + (!out && n === 17 ? " today" : "") + '"><span class="n">' + n + '</span><div class="so-ps">';
    if (!out) for (var j = 0; j < (BUSY.indexOf(n) >= 0 ? 2 : 1); j++, k++) {
      h += '<div class="so-p" style="--i: ' + k + '"><img data-src="assets/hero/cal/t' + ("0" + ((k % 28) + 1)).slice(-2) + '.jpg" alt=""><b class="' + (n < 17 ? "dot-p" : "dot-s") + '"></b><span>' + TIMES[(n + j) % TIMES.length] + "</span></div>";
    }
    h += "</div></div>";
  }
  grid.innerHTML = h;
})();

/* ---------- scale: --k is the artboard scale as a plain number, read from the length --hx-u (base.css) ----------
   section.css already sets it with trig; this sets it only in browsers without it (their scale() comes out as none). In a window taller than the artboard the app
   grows just enough to keep running past the bottom edge, as it does on the artboard. */
var probe = document.createElement("i"), board = hero.querySelector(".hx-fit"), fitQ = 0, noTrig = false;
probe.className = "hx-u";
hero.appendChild(probe);
function fit() {
  fitQ = 0;
  var k = probe.getBoundingClientRect().width / 1000;
  if (!(k > 0)) return;
  var base = phone() ? 0.5 : 0.8194, need = ((hero.clientHeight - board.offsetTop) / k - stage.offsetTop) / 884; /* 884 of the app's 900: where its glass panels end */
  if (!noTrig && getComputedStyle(board).transform === "none") noTrig = true;
  if (noTrig) hero.style.setProperty("--k", k.toFixed(5));
  if (need > base) { need += 0.012; stage.style.setProperty("--as", need.toFixed(4)); stage.style.width = (1440 * need).toFixed(1) + "px"; stage.style.height = (900 * need).toFixed(1) + "px"; }
  else if (stage.style.width) { stage.style.removeProperty("--as"); stage.style.width = ""; stage.style.height = ""; }
}
fit();
window.addEventListener("resize", function () { if (!fitQ) fitQ = requestAnimationFrame(fit); });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);

/* ---------- beams: the composer's is the intense one (md, boost 3.2); its corner radius is 26 on desktop, 22 on phones ---------- */
var beamM = SK.beam(cp, { size: "md", variant: "mirra", radius: 22, boost: 3.2, glow: 1.5, width: 1.5 }).getAttribute("data-beam");
var beamD = SK.beam(cp, { size: "md", variant: "mirra", radius: 26, boost: 3.2, glow: 1.5, width: 1.5 }).getAttribute("data-beam");
function branch() { if (beamM && beamD) cp.setAttribute("data-beam", phone() ? beamM : beamD); if (!fitQ) fitQ = requestAnimationFrame(fit); }
branch();
if (DESK.addEventListener) DESK.addEventListener("change", branch); else if (DESK.addListener) DESK.addListener(branch);

/* ---------- pictures of the screens that are not open yet ---------- */
function warm() {
  hero.querySelectorAll("img[data-src]").forEach(function (im) { im.decoding = "async"; im.src = im.getAttribute("data-src"); im.removeAttribute("data-src"); });
}

/* ---------- the composer and the app ---------- */
function compose(state, text) {
  cp.className = "cp" + (state ? " " + state : "") + (text ? " has" : "");
  ask.textContent = text || ASK;
  ask.className = text ? "cp-t" : "cp-t ph";
}
function show(n) { app.className = VIEW[n]; }

var tm = [], iv = 0, next = 0, started = false, inView = false;
function at(ms, f) { tm.push(setTimeout(f, ms)); }
function halt() { tm.forEach(clearTimeout); tm = []; clearInterval(iv); }
function loop(i) {
  var list = phone() ? PROMPTS_M : PROMPTS, k = i % list.length, text = list[k], n = 0;
  next = i;
  if (k === 0 && i > 0) show(0);
  compose("typing", "");
  clearInterval(iv);
  iv = setInterval(function () {
    n++;
    compose("typing", text.slice(0, n));
    if (n < text.length) return;
    clearInterval(iv);
    at(420, function () { compose("tap", text); });
    at(640, function () { compose("working", text); });
    at(1300, function () { show(k + 1); next = i + 1; });
    at(5600, function () { compose("", ""); });
    at(6200, function () { loop(i + 1); });
  }, CHAR_MS);
}

function settled() { clearTimeout(window.__hxSafe); hero.classList.remove("pre", "w0"); html.classList.remove("hx-pre", "hx-intro"); }
/* ---------- the app's glass: line each panel's pre-blurred sky up with the sky behind it (see section.css, "Safari") ----------
   The sky is object-fit: cover at 50% 32% and slowly pushes in, the panels are scaled and tilted, so this is measured, not fixed:
   on every frame of the intro, then once a second while in view (a few rects, no layout writes besides two custom properties). */
var glassPanels = [].slice.call(hero.querySelectorAll(".sa-side, .sa-home")), IW = 2560, IH = 1429;
function syncGlass() {
  var r = sky.getBoundingClientRect();
  if (!r.width) return;
  var m = sky.currentSrc && /sky-m\.jpg/.test(sky.currentSrc), iw = m ? 1072 : IW, ih = IH;
  var sc = Math.max(r.width / iw, r.height / ih), w = iw * sc, h = ih * sc, x = r.left + (r.width - w) * 0.5, y = r.top + (r.height - h) * 0.32;
  glassPanels.forEach(function (p) {
    var q = p.getBoundingClientRect();
    if (!p.offsetWidth || !q.width) return;
    var ex = q.width / p.offsetWidth, ey = q.height / p.offsetHeight;
    p.style.setProperty("--gb-size", (w / ex).toFixed(1) + "px " + (h / ey).toFixed(1) + "px");
    p.style.setProperty("--gb-pos", ((x - q.left) / ex).toFixed(1) + "px " + ((y - q.top) / ey).toFixed(1) + "px");
  });
}
var glassT = 0;
function glassFor(ms) { var end = performance.now() + ms; (function f() { syncGlass(); if (performance.now() < end) requestAnimationFrame(f); })(); }
SK.onView(hero, function () { syncGlass(); clearInterval(glassT); glassT = setInterval(syncGlass, 1000); }, function () { clearInterval(glassT); });
window.addEventListener("resize", function () { requestAnimationFrame(syncGlass); });
window.addEventListener("load", function () { glassFor(5200); });
glassFor(5200);

/* ---------- Enter site: the first visit in a browser session holds the intro once the words are sharp, until the visitor enters.
   "Enter site" plays Kayla's intro inside the click (that click is what lets Chrome and Safari play sound); "Enter without sound" just
   goes on. Later visits in the session keep the plain intro and the start-on-first-click fallback (kit.js). ---------- */
var gate = hero.querySelector(".hx-gate"), GATE_KEY = "studio-entered", needGate = false;
try { needGate = !!gate && sessionStorage.getItem(GATE_KEY) !== "1"; } catch (e) { needGate = !!gate; }
if (/[#&]invite=/.test(location.hash)) needGate = false; /* a link sent from a phone: straight to the download */
if (needGate) SK.holdSound = true;
function showGate(next) {
  html.classList.add("hx-hold");
  if (SK.reduced) hero.classList.add("hold");
  gate.hidden = false;
  requestAnimationFrame(function () { gate.classList.add("on"); var b = gate.querySelector(".hx-enter"); b && b.focus({ preventScroll: true, focusVisible: false }); });
  var done = false;
  gate.querySelectorAll("[data-enter]").forEach(function (b) {
    b.addEventListener("click", function () {
      if (done) return; done = true;
      if (b.getAttribute("data-enter") === "sound") {
        var a = SK.kayla && SK.kayla.audio;
        if (a && a.paused) { try { a.currentTime = 0; } catch (e) {} var q = a.play(); q && q.catch(function () {}); }
      }
      try { sessionStorage.setItem(GATE_KEY, "1"); } catch (e) {}
      gate.classList.remove("on");
      setTimeout(function () { gate.hidden = true; }, SK.reduced ? 0 : 600);
      html.classList.remove("hx-hold");
      hero.classList.remove("hold");
      next();
    });
  });
}

if (SK.reduced) { settled(); if (needGate) showGate(function () {}); return; }

/* in view: the loop runs. Out of view: timers stop, CSS animations pause (.off), and it picks up at the next prompt on return. */
SK.onView(hero, function () {
  inView = true;
  hero.classList.remove("off");
  if (started) { halt(); at(600, function () { loop(next); }); }
}, function () {
  inView = false;
  hero.classList.add("off");
  if (started) { halt(); compose("", ""); }
});
function begin() { html.classList.remove("hx-intro"); warm(); started = true; if (inView) loop(0); setTimeout(parallax, 400); }

/* ---------- the intro, once ---------- */
function intro() {
  clearTimeout(window.__hxSafe);
  var ready = Promise.all([document.fonts ? document.fonts.ready : null, sky.decode ? sky.decode().catch(function () {}) : null]);
  Promise.race([ready, SK.sleep(1200)]).then(function () {
    fit();
    setTimeout(function () { hero.classList.remove("w0"); }, 120);
    if (needGate) { setTimeout(function () { showGate(function () { rise(0); }); }, 1300); return; }
    rise(1500);
  });
}
function rise(d) {
  setTimeout(function () { hero.classList.remove("pre"); hero.classList.add("go"); html.classList.remove("hx-pre"); }, d);
  setTimeout(begin, d + 1800);
}
/* the opening state was put on before the first paint (shell.html, section.html). If it is not there (the 7 s safety net already
   showed the hero because this script was slow to arrive), there is no intro to play: just start the prompts. */
if (!hero.classList.contains("pre")) { settled(); if (needGate) showGate(function () { setTimeout(begin, 600); }); else setTimeout(begin, 900); }
else if (document.visibilityState === "hidden") document.addEventListener("visibilitychange", function once() { if (document.visibilityState !== "visible") return; document.removeEventListener("visibilitychange", once); intro(); });
else intro();

/* ---------- parallax: as the page scrolls past the hero, each layer moves at its own rate, scrubbed by the scroll and fully undone
   when it scrolls back. p = scrollY / (0.9 x the window's height), eased toward its target at 0.14 a frame. Only individual transform
   properties (translate, rotate, scale) are set, so they add to the intro's own transforms instead of fighting them. It starts after
   the intro (and Enter site); never with reduced motion. The app's glass panels are re-lined up with the sky on every frame.
     Desktop: sky +60px and 6% larger; lockup and headline -110px, fading to .35; Download -80px; composer -50px;
              the app flattens from 16deg to about 5deg, rises 70px and grows 4%.
     Phone:   the app slides left until its right edge sits 16px inside the screen, and flattens 4deg; text -40px, composer -24px. ---------- */
function parallax() {
  if (SK.reduced || parallax.on) return;
  parallax.on = true;
  var pic = sky.parentNode && sky.parentNode.tagName === "PICTURE" ? sky.parentNode : sky;
  var head = hero.querySelector(".hx-head"), dlb = hero.querySelector(".hx-dl"), app3d = hero.querySelector(".hx-app3d");
  var cur = 0, target = 0, raf = 0, slide = 0;
  pic.style.position = "absolute"; pic.style.inset = "0"; pic.style.display = "block";
  function measure() {
    slide = 0;
    if (!phone()) return;
    var saved = app3d.style.translate; app3d.style.translate = "";
    var r = stage.getBoundingClientRect(), k = r.width / (stage.offsetWidth || 1) || 1, dx = (window.innerWidth - 16) - r.right;
    app3d.style.translate = saved;
    slide = dx < 0 ? dx / k : 0;
  }
  function apply(p) {
    var m = phone();
    pic.style.translate = m ? "" : "0 " + (60 * p).toFixed(2) + "px";
    pic.style.scale = m ? "" : (1 + 0.06 * p).toFixed(4);
    head.style.translate = "0 " + ((m ? -40 : -110) * p).toFixed(2) + "px";
    head.style.opacity = m ? "" : (1 - 0.65 * p).toFixed(3);
    if (dlb) dlb.style.translate = "0 " + ((m ? -32 : -80) * p).toFixed(2) + "px";
    cp.style.translate = "0 " + ((m ? -24 : -50) * p).toFixed(2) + "px";
    app3d.style.rotate = "x " + ((m ? -4 : -11) * p).toFixed(3) + "deg";
    app3d.style.translate = m ? (slide * p).toFixed(2) + "px 0" : "0 " + (-70 * p).toFixed(2) + "px";
    app3d.style.scale = m ? "" : (1 + 0.04 * p).toFixed(4);
    syncGlass();
  }
  function frame() {
    raf = 0;
    cur += (target - cur) * 0.14;
    if (Math.abs(target - cur) < 0.0005) cur = target;
    apply(cur);
    if (cur !== target) raf = requestAnimationFrame(frame);
  }
  function onScroll() {
    target = Math.min(1, Math.max(0, window.scrollY / (0.9 * (window.innerHeight || 1))));
    if (!raf && target !== cur) raf = requestAnimationFrame(frame);
  }
  measure();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", function () { measure(); apply(cur); onScroll(); });
  onScroll();
}
