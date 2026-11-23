var root = document.getElementById("anywhere");
if (!root) return;

/* the footage drifts a little against the scroll (only while on screen) */
(function (el) {
  /* on a phone the clip's own first frame is the poster (kit.js armVideo): it used to be hidden until the clip played, an empty blur meanwhile */
  if (!el || SK.reduced) return;
  var y = 0, raf = 0, on = false, lastT = NaN;
  function step() {
    raf = 0;
    if (!on) return;
    var r = root.getBoundingClientRect(), vh = window.innerHeight || 1;
    var p = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2)));
    var t = -p * r.height * 0.045;
    y += (t - y) * 0.12;
    if (Math.abs(t - y) < 0.05) y = t;
    el.style.transform = "translate3d(0," + y.toFixed(2) + "px,0)";
    if (y !== t || t !== lastT) raf = requestAnimationFrame(step); /* settled two frames running: it rests until the page scrolls, resizes or moves (wake) */
    lastT = t;
  }
  function wake() { if (on && !raf) raf = requestAnimationFrame(step); }
  window.addEventListener("scroll", wake, { passive: true });
  window.addEventListener("resize", wake);
  if ("ResizeObserver" in window) { var ro = new ResizeObserver(wake); ro.observe(document.body); ro.observe(root); }
  SK.onView(root, function () { on = true; wake(); }, function () { on = false; });
})(root.querySelector("video.bg"));

/* what he asks for, in order. Each one is answered by the result card with the same index. */
var ASKS = [
  "Make me a launch commercial for my company",
  "Turn it into a carousel for Instagram",
  "Design a flyer for Saturday's open studio",
  "Plan my posts for the next two weeks",
  "Run the launch film as a Facebook and Instagram ad"
];
var work = root.querySelector(".cy-work"), stage = root.querySelector(".cy-stage"), cards = [].slice.call(stage.querySelectorAll(".cy-r"));
var comp = document.getElementById("cy-comp"), ask = comp.querySelector(".cy-ask"), askT = comp.querySelector(".cy-ask-t"), send = comp.querySelector(".cy-send");
var PLACEHOLDER = "What should we make?", token = 0, shown = -1, mode = "stack";

SK.beam(comp, { size: "md", variant: "mirra", radius: SK.mobile() ? 22 : 26 });

/* the two-week calendar: ten posts over fourteen days */
(function () {
  var grid = document.getElementById("cy-grid"), th = (SK.media.thumbs || []).map(function (t) { return t.file || t; });
  var pick = [3, 12, 7, 19, 24, 1, 14, 22, 9, 26], skip = { 2: 1, 6: 1, 9: 1, 12: 1 }, n = 0;
  for (var d = 0; d < 14; d++) {
    var c = document.createElement("span");
    c.className = "cy-cell";
    if (!skip[d] && th.length) {
      var im = document.createElement("img");
      im.alt = ""; im.width = 180; im.height = 320; im.loading = "lazy"; im.decoding = "async";
      im.src = th[pick[n % pick.length] % th.length];
      im.style.setProperty("--n", String(n++));
      c.appendChild(im);
    }
    grid.appendChild(c);
  }
})();

/* the carousel flips through its slides while it is on screen */
var track = stage.querySelector(".cy-track"), dots = [].slice.call(stage.querySelectorAll(".cy-dots i")), slide = 0, flipT = 0;
function flip(to) {
  slide = to % dots.length;
  track.style.transform = "translate3d(" + -slide * 100 + "%,0,0)";
  dots.forEach(function (d, i) { d.classList.toggle("on", i === slide); });
}
function flipping(on) {
  clearInterval(flipT);
  if (on && !SK.reduced) flipT = setInterval(function () { flip(slide + 1); }, 1500);
}

/* where every card sits: a stack while he works (newest in front), the whole set side by side at the end */
function place() {
  var mob = SK.mobile(), W = stage.clientWidth, w = cards.map(function (c) { return c.offsetWidth; });
  var set = function (c, x, s, o, dim) { c.style.transform = "translate3d(" + x.toFixed(1) + "px,0,0) scale(" + s + ")"; c.style.opacity = o; c.style.setProperty("--dim", String(dim || 0)); };
  cards.forEach(function (c, i) {
    c.style.zIndex = String(i + 1);
    if (shown < 0 || i > shown) { c.style.transform = ""; c.style.opacity = ""; return; }
    if (mob) { set(c, -(W - w[i]) / 2, i === shown ? 1 : 0.94, i === shown ? 1 : 0); return; }
    if (mode === "set") return;
    var d = shown - i;
    if (d === 0) return set(c, 0, 1, 1);
    var s1 = 0.88, s2 = 0.78, l1 = -w[shown] - w[shown - 1] * s1 * 0.52;
    if (d === 1) return set(c, l1 + w[i] * s1, s1, 1, 0.22);
    var l2 = l1 - w[shown - 2] * s2 * 0.46;
    if (d === 2) return set(c, l2 + w[i] * s2, s2, 1, 0.42);
    set(c, l2 + w[i] * 0.7 - 30, 0.7, 0);
  });
  if (mode === "set" && !mob) {
    /* as much of every card as fits between the man and the right edge */
    var S = 0.74, avail = Math.max(W, root.clientWidth * 0.62 - 40), last = cards.length - 1, rest = 0;
    for (var i = 1; i <= last; i++) rest += w[i] * S;
    var f = Math.min(1.05, (avail - w[0] * S) / rest), x = 0;
    for (var j = last; j >= 0; j--) { set(cards[j], x, S, 1); x -= w[j] * S * f; }
  }
}
function reveal(i) {
  shown = i; mode = "stack";
  place();
  cards[i].classList.add("live");
  var v = cards[i].querySelector("video");
  if (v) { try { v.currentTime = 0; } catch (e) {} }
  if (i === 1) { flip(0); flipping(true); }
}
function setAsk(t, typing) {
  askT.textContent = t || PLACEHOLDER;
  ask.classList.toggle("ph", !t);
  comp.classList.toggle("has", !!t);
  comp.classList.toggle("typing", !!typing);
}
function reset() {
  shown = -1; mode = "stack";
  cards.forEach(function (c) { c.classList.remove("live"); });
  place();
  flipping(false); flip(0);
  comp.classList.remove("working");
  setAsk("", false);
  work.classList.remove("cy-out");
}

async function run() {
  var my = ++token;
  var w = function (ms) { return SK.sleep(ms).then(function () { if (my !== token) throw 0; }); };
  reset();
  if (SK.reduced) { shown = cards.length - 1; mode = "set"; cards.forEach(function (c) { c.classList.add("live"); }); place(); setAsk(ASKS[0], false); return; }
  try {
    for (;;) {
      await w(700);
      for (var i = 0; i < ASKS.length; i++) {
        var t = ASKS[i];
        for (var k = 1; k <= t.length; k++) { setAsk(t.slice(0, k), true); await w(t[k - 1] === " " ? 46 : 20 + Math.random() * 24); }
        setAsk(t, false);
        await w(340);
        send.classList.add("tap"); await w(150); send.classList.remove("tap");
        comp.classList.add("working");
        await w(1150);
        comp.classList.remove("working");
        reveal(i);
        await w(i === 3 ? 3000 : 2300);
        if (i < ASKS.length - 1) { setAsk("", false); await w(420); }
      }
      /* everything he made at the gate, side by side */
      setAsk("", false);
      mode = "set"; place();
      await w(6200);
      work.classList.add("cy-out");
      await w(650);
      reset();
    }
  } catch (e) {}
}
SK.onView(work, run, function () { token++; reset(); }, { ratio: 0.3, threshold: [0, 0.3, 0.6] });
window.addEventListener("resize", function () { if (shown >= 0) place(); });
