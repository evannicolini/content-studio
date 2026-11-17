var root = document.getElementById("why");
if (!root) return;
var screen = document.getElementById("st-screen"), stage = document.getElementById("st-stage");
var greys = [].slice.call(screen.querySelectorAll(".st-grey")), films = [].slice.call(screen.querySelectorAll(".st-film")), veil = screen.querySelector(".st-veil");
var posts = greys.concat(films);
function vid(f) { return f.querySelector("video"); }

/* the footage drifts a little against the scroll (only while on screen, desktop only: on phones the picture sits at the top) */
(function (el) {
  if (!el || SK.reduced) return;
  var y = 0, raf = 0, on = false;
  function step() {
    raf = 0;
    if (!on) return;
    if (SK.mobile()) { el.style.transform = ""; }
    else {
      var r = root.getBoundingClientRect(), vh = window.innerHeight || 1;
      var p = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2)));
      var t = -p * r.height * 0.045;
      y += (t - y) * 0.12;
      if (Math.abs(t - y) < 0.05) y = t;
      el.style.transform = "translate3d(0," + y.toFixed(2) + "px,0)";
    }
    raf = requestAnimationFrame(step);
  }
  SK.onView(root, function () { on = true; if (!raf) raf = requestAnimationFrame(step); }, function () { on = false; });
})(root.querySelector("video.bg"));

/* posters and sources for the films in the feed go on once the section is near (preload is "none": nothing downloads until a film
   is about to land). Setting the source here also means a film can never be asked to play before it has one. */
SK.onView(root, function () {
  films.forEach(function (f) { var v = vid(f); v.poster = v.getAttribute("data-poster"); if (!v.getAttribute("src")) v.src = v.getAttribute("data-src"); });
}, null, { margin: "1200px 0px", once: true });

/* The feed is an endless column of posts. Every fifth one is a Studio film; the rest is grey.
   y = how many posts have gone by. Two grey slots and three film slots are recycled as it moves. */
var EVERY = 5, HOLD = 3300, TA = 380, TC = 1050, TD = 900;
function isFilm(k) { return k % EVERY === EVERY - 1; }
function filmAt(k) { return films[(((k + 1) / EVERY - 1) % films.length + films.length) % films.length]; }
function layout(y) {
  var k = Math.floor(y), frac = y - k;
  posts.forEach(function (p) { p._on = false; });
  [k, k + 1].forEach(function (i, j) {
    if (j === 1 && frac < 0.0005) return;
    var el;
    if (isFilm(i)) el = filmAt(i);
    else { el = greys[i % 2]; if (el._k !== i) { el._k = i; el.setAttribute("data-v", String((i * 3 + 1) % 4)); } }
    el.style.transform = "translate3d(0," + ((j - frac) * 100).toFixed(2) + "%,0)";
    el._on = true;
  });
  posts.forEach(function (p) { if (!p._on && !p._off) p.style.transform = "translate3d(0,105%,0)"; p._off = !p._on; });
}

var y = 0, from = 0, to = EVERY - 1, phase = "idle", t0 = 0, raf = 0, live = false, likeT = 0, thinkT = 0, cur = null, fast = false, rewound = false;
function lock(f) {
  cur = f;
  f.classList.add("lock");
  var bar = f.querySelector(".st-watch u");
  bar.style.transition = "none"; bar.style.transform = "scaleX(0)";
  void bar.offsetWidth;
  bar.style.transition = "transform " + HOLD + "ms linear"; bar.style.transform = "scaleX(1)";
  clearTimeout(likeT); clearTimeout(thinkT);
  thinkT = setTimeout(function () { stage.classList.remove("was-thought"); stage.classList.add("is-thought"); }, 480);
  likeT = setTimeout(function () { f.classList.add("liked"); }, 1200);
}
function unlock() {
  clearTimeout(likeT); clearTimeout(thinkT);
  /* the thought drifts up and away as the thumb moves on, then waits below for the next film */
  if (stage.classList.contains("is-thought")) { stage.classList.add("was-thought"); stage.classList.remove("is-thought"); setTimeout(function () { stage.classList.remove("was-thought"); }, 600); }
  if (!cur) return;
  var f = cur; cur = null;
  f.classList.remove("lock", "liked");
  var bar = f.querySelector(".st-watch u");
  bar.style.transition = "none"; bar.style.transform = "scaleX(0)";
}
function warm(f) { var v = vid(f); if (!v.getAttribute("src")) v.src = v.getAttribute("data-src"); var p = v.play(); p && p.catch(function () {}); }
function startMove(now) {
  unlock();
  phase = "move"; t0 = now; from = y; rewound = false;
  to = Math.floor(y / EVERY + 1e-6) * EVERY + EVERY - 1;
  if (to - from < 1) to += EVERY;
  warm(filmAt(to));
}
function setFast(on) { if (on !== fast) { fast = on; screen.classList.toggle("fast", on); } }
function frame(now) {
  raf = 0;
  if (!live) return;
  if (phase === "idle") startMove(now);
  if (phase === "move") {
    var t = now - t0, D = to - from, V = D / (TA / 2 + TC + TD / 2), v, d;
    if (t < TA) { v = V * (t / TA); d = (V * t * t) / (2 * TA); }
    else if (t < TA + TC) { v = V; d = (V * TA) / 2 + V * (t - TA); }
    else if (t < TA + TC + TD) {
      var r = t - TA - TC;
      v = V * (1 - r / TD); d = (V * TA) / 2 + V * TC + V * r - (V * r * r) / (2 * TD);
      if (!rewound) { rewound = true; try { vid(filmAt(to)).currentTime = 0; } catch (e) {} }
    } else { v = 0; d = D; }
    y = from + d;
    layout(y);
    veil.style.opacity = (Math.pow(Math.min(1, v / V), 1.25) * 0.96).toFixed(3);
    setFast(v / V > 0.5);
    if (t >= TA + TC + TD) { y = to; layout(y); veil.style.opacity = "0"; setFast(false); phase = "hold"; t0 = now; lock(filmAt(to)); }
  } else if (phase === "hold" && now - t0 > HOLD + 250) startMove(now);
  raf = requestAnimationFrame(frame);
}

if (SK.reduced) {
  /* no motion: the feed has already stopped on a Studio film, and the thought is there */
  y = EVERY - 1; layout(y);
  var f0 = filmAt(y); f0.classList.add("lock", "liked"); stage.classList.add("is-thought");
  f0.querySelector(".st-watch u").style.transform = "scaleX(1)";
  return;
}
layout(0);
SK.onView(screen, function () {
  live = true;
  /* coming back into view: start with a fresh scroll rather than mid-hold */
  if (phase === "hold") phase = "idle";
  else if (phase === "move") { t0 = performance.now(); from = y; rewound = false; if (to - from < 0.5) to += EVERY; }
  if (!raf) raf = requestAnimationFrame(frame);
}, function () { live = false; }, { ratio: 0.25, threshold: [0, 0.25, 0.6] });
