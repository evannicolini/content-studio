var root = document.getElementById("work");
if (!root) return;
var rail = document.getElementById("wk-rail"), cards = [].slice.call(rail.querySelectorAll(".wk-card")), n = cards.length;
var countEl = document.getElementById("wk-count"), films = (SK.media && SK.media.films) || [];
function pad(x) { return (x < 10 ? "0" : "") + x; }

/* true running times, straight from the manifest */
root.querySelectorAll("[data-dur]").forEach(function (el) {
  var f = films.filter(function (x) { return x.slug === el.getAttribute("data-dur"); })[0];
  if (f && f.duration) { var s = Math.round(f.duration); el.textContent = Math.floor(s / 60) + ":" + pad(s % 60); }
});

/* posters only once the section is near, so nine images do not load with the page.
   The source goes on at the same moment (preload is "none", so nothing downloads until a film plays): on a sideways rail a film
   can go from hidden to fully visible in one frame, and the kit's play observer may then run before its loader has set a source. */
SK.onView(root, function () {
  rail.querySelectorAll("video[data-poster]").forEach(function (v) {
    v.poster = v.getAttribute("data-poster");
    if (!v.getAttribute("src")) v.src = v.getAttribute("data-src");
  });
  var first = root.querySelector("#wk-car img[data-src]");
  if (first && !first.getAttribute("src")) first.src = first.getAttribute("data-src");
}, null, { margin: "1400px 0px", once: true });

/* ---------- geometry: the centre film is full size, the others step back ---------- */
var centers = [], W = 0, pitch = 1, active = -1, raf = 0, inView = false, settleT = 0;
function measure() {
  W = cards[0].offsetWidth;
  centers = cards.map(function (c) { return c.offsetLeft + W / 2; });
  pitch = n > 1 ? centers[1] - centers[0] : W;
}
function paint() {
  raf = 0;
  var mid = rail.scrollLeft + rail.clientWidth / 2, K = SK.mobile() ? 0.1 : 0.17, best = 0, bd = 1e9;
  for (var i = 0; i < n; i++) {
    var d = (centers[i] - mid) / pitch, a = Math.abs(d);
    if (a < bd) { bd = a; best = i; }
    if (a > 4) continue;
    var near = Math.min(a, 1), s = 1 - K * near, shift = W * K * (a <= 1 ? (a * a) / 2 : a - 0.5) * (d > 0 ? -1 : 1);
    cards[i].style.transform = "translate3d(" + shift.toFixed(1) + "px,0,0) scale(" + s.toFixed(4) + ")";
    cards[i].style.setProperty("--f", (1 - near).toFixed(3));
  }
  if (best !== active) setActive(best);
}
function ask() { if (!raf) raf = requestAnimationFrame(paint); }
function setActive(i) {
  active = i;
  cards.forEach(function (c, j) { c.classList.toggle("is-on", j === i); });
  if (countEl) countEl.textContent = pad(i + 1) + " / " + pad(n);
  clearTimeout(settleT);
  settleT = setTimeout(function () { if (active === i && inView) say(cards[i]); }, 380);
}
/* the sentence that started the film types itself the first time its film takes the centre */
function say(card) {
  if (card._said || SK.reduced) return;
  var el = card.querySelector(".wk-say");
  if (!el || card.classList.contains("wk-car")) return;
  card._said = true;
  var text = el.textContent;
  el.textContent = "";
  SK.type(el, text, { ms: 24 });
}
function left(i) { return centers[i] - rail.clientWidth / 2; }
function go(i, instant) {
  i = Math.max(0, Math.min(n - 1, i));
  rail.scrollTo({ left: left(i), behavior: instant || SK.reduced ? "auto" : "smooth" });
}
rail.addEventListener("scroll", ask, { passive: true });

/* ---------- it drifts on its own, and steps aside the moment you touch it ---------- */
var dir = 1, holdUntil = 0, hover = false, timer = 0;
function hold(ms) { holdUntil = Date.now() + ms; }
function tick() {
  if (!inView || hover || document.hidden || SK.reduced || Date.now() < holdUntil || rail.classList.contains("drag")) return;
  if (active + dir > n - 1 || active + dir < 0) dir = -dir;
  go(active + dir);
}
SK.onView(root, function () {
  inView = true;
  clearInterval(timer);
  timer = setInterval(tick, 4400);
  hold(2600);
  if (active >= 0) setActive(active);
}, function () { inView = false; clearInterval(timer); }, { ratio: 0.3, threshold: [0, 0.3, 0.6] });
rail.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") hover = true; });
rail.addEventListener("pointerleave", function () { hover = false; hold(1800); });
rail.addEventListener("touchstart", function () { hold(9000); }, { passive: true });
rail.addEventListener("wheel", function (e) { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) hold(7000); }, { passive: true });
rail.addEventListener("focusin", function () { hold(12000); });
root.querySelectorAll("[data-go]").forEach(function (b) {
  b.addEventListener("click", function () { hold(9000); go(active + parseInt(b.getAttribute("data-go"), 10)); });
});

/* ---------- drag with a mouse ---------- */
var down = null, moved = false, snapT = 0;
rail.addEventListener("pointerdown", function (e) {
  if (e.pointerType !== "mouse" || e.button !== 0) return;
  down = { x: e.clientX, left: rail.scrollLeft };
  moved = false;
});
window.addEventListener("pointermove", function (e) {
  if (!down) return;
  var dx = e.clientX - down.x;
  if (!moved && Math.abs(dx) < 6) return;
  if (!moved) { moved = true; clearTimeout(snapT); rail.classList.add("drag"); }
  rail.scrollLeft = down.left - dx;
});
function release() {
  if (!down) return;
  var was = moved;
  down = null;
  if (!was) return;
  hold(7000);
  go(active);
  /* snapping comes back once the glide has landed, so it never jumps */
  snapT = setTimeout(function () { rail.classList.remove("drag"); }, 520);
  setTimeout(function () { moved = false; }, 0);
}
window.addEventListener("pointerup", release);
window.addEventListener("pointercancel", release);
rail.addEventListener("click", function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
rail.addEventListener("dragstart", function (e) { e.preventDefault(); });

/* ---------- the carousel card flips through its slides ---------- */
(function () {
  var box = document.getElementById("wk-car");
  if (!box) return;
  var imgs = [].slice.call(box.querySelectorAll("img")), segs = box.querySelector(".wk-segs"), num = document.getElementById("wk-car-n");
  var sets = [imgs.filter(function (im) { return !im.classList.contains("wk-45"); }), imgs.filter(function (im) { return im.classList.contains("wk-45"); })];
  var FLIP = 1900, at = -1, t = 0, on = false;
  box.style.setProperty("--wk-flip", FLIP + "ms");
  function load(im) { if (im && !im.getAttribute("src")) im.src = im.getAttribute("data-src"); }
  function show(k) {
    at = (k + imgs.length) % imgs.length;
    var im = imgs[at], set = sets[0].indexOf(im) >= 0 ? sets[0] : sets[1], pos = set.indexOf(im);
    load(im); load(imgs[(at + 1) % imgs.length]);
    imgs.forEach(function (x) { x.classList.toggle("on", x === im); });
    if (segs.children.length !== set.length) { segs.innerHTML = ""; set.forEach(function () { segs.appendChild(document.createElement("i")); }); }
    [].forEach.call(segs.children, function (s, j) { s.className = j < pos ? "done" : j === pos && on && !SK.reduced ? "now" : j === pos ? "done" : ""; });
    if (num) num.textContent = pad(pos + 1) + " / " + pad(set.length);
  }
  function next() { show(at + 1); }
  SK.onView(box, function () {
    on = true;
    show(at < 0 ? 0 : at);
    clearInterval(t);
    if (!SK.reduced) t = setInterval(next, FLIP);
  }, function () { on = false; clearInterval(t); }, { ratio: 0.3, threshold: [0, 0.3, 0.6] });
})();

/* ---------- start on the launch commercial ---------- */
function place() { measure(); go(active < 0 ? parseInt(rail.getAttribute("data-start"), 10) || 0 : active, true); paint(); }
place();
window.addEventListener("load", place);
var rz = 0;
window.addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(place, 120); });
