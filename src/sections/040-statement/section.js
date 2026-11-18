var root = document.getElementById("why");
if (!root) return;
/* "Make people think" G. Two loops on one clock, both only while the section is in view:
   the line types six sentences in one spot (type, hold, erase, next), and the phone's feed swipes past three posts, stops on a
   Studio film, fills the heart and types the thought into the pill (every 10.4 s). Timings are the approved design's. */
var line = root.querySelector(".st-big"), typed = root.querySelector(".st-typed"), phone = root.querySelector(".st-phone"), track = root.querySelector(".st-track");
var pill = root.querySelector(".st-think"), pillT = root.querySelector(".st-think-t"), film = root.querySelector(".st-post video");
var QUOTE = "“F*ck, I need that.”";
var STORY = [QUOTE, "That thought is what sells.", "Great content earns it.", "Every single day.", "That’s hard to keep up.", "Studio does it for you."];
var HOLD = [2400, 1600, 1600, 1600, 1600, 3400];
var PHONE = matchMedia("(max-width: 900px) and (orientation: portrait)");

/* the feed's posters and film go on once the section is near. The posts sit clipped inside the phone screen, so lazy loading
   or the kit's own near-view check would only start them as they slide in. */
SK.onView(root, function () {
  [].forEach.call(root.querySelectorAll(".st-post img[data-src]"), function (im) { im.src = im.getAttribute("data-src"); });
  if (film) { film.poster = film.getAttribute("data-poster"); if (!film.getAttribute("src")) { film.preload = "auto"; film.src = film.getAttribute("data-src"); } }
}, null, { margin: "1200px 0px", once: true });

/* the line is always one line: if the longest sentence (plus the caret) would run past the phone (desktop) or the frame's edge
   (phones), the type shrinks to fit. At the artboard sizes it never does. */
var meas = document.createElement("span");
meas.className = "st-measure";
meas.setAttribute("aria-hidden", "true");
line.appendChild(meas);
function fit() {
  line.style.setProperty("--st-fit", "1");
  var w = 0;
  STORY.forEach(function (t) { meas.textContent = t; w = Math.max(w, meas.getBoundingClientRect().width); });
  meas.textContent = "";
  var fs = parseFloat(getComputedStyle(line).fontSize) || 80, scale = root.getBoundingClientRect().width / (root.offsetWidth || 1);
  var need = w + (3 + 0.06 * fs) * scale, left = line.getBoundingClientRect().left;
  var limit = PHONE.matches ? root.getBoundingClientRect().right - 2 * scale : phone.getBoundingClientRect().left - 0.3 * fs * scale;
  var k = Math.min(1, (limit - left) / need);
  if (k < 0.999) line.style.setProperty("--st-fit", Math.max(0.4, k).toFixed(4));
}
var fitQ = 0;
function refit() { if (!fitQ) fitQ = requestAnimationFrame(function () { fitQ = 0; fit(); }); }
fit();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(refit);
window.addEventListener("resize", refit);

if (SK.reduced) {
  /* no motion: the thought is there, settled, and the feed has already stopped on the film */
  typed.textContent = QUOTE;
  track.classList.add("st-nt");
  track.style.transform = "translateY(-300%)";
  phone.classList.add("held", "liked");
  return;
}

var tm = [];
function at(ms, f) { tm.push(setTimeout(f, ms)); }
function stop() { tm.forEach(clearTimeout); tm = []; }
function typing(on) { root.classList.toggle("typing", on); }

/* the line: type, hold, erase, the next sentence */
var k = 0, n = 0;
function show() { typed.textContent = STORY[k].slice(0, Math.max(0, n)); }
function typeHead(i) {
  k = i; n = 0; show(); typing(true);
  var text = STORY[k];
  function step() {
    n++; show();
    if (n >= text.length) { typing(false); at(HOLD[k], eraseHead); return; }
    var ch = text[n - 1];
    at((ch === "," ? 300 : ch === "." ? 200 : ch === " " ? 90 : 58) * (0.7 + Math.random() * 0.6), step);
  }
  at(k === 0 ? 700 : 260, step);
}
function eraseHead() {
  typing(true);
  (function step() {
    n--; show();
    if (n > 0) { at(20, step); return; }
    typeHead((k + 1) % STORY.length);
  })();
}

/* the feed: swipe, swipe, swipe, stop on the film. The heart fills, the thought types out, hold, back to the top */
function go(i) { track.style.transform = "translateY(" + (-100 * i) + "%)"; }
function toTop() {
  track.classList.add("st-nt"); go(0);
  phone.classList.remove("liked", "held");
  pill.classList.remove("on"); pillT.textContent = "";
}
function feed() {
  toTop();
  at(60, function () { track.classList.remove("st-nt"); });
  at(900, function () { go(1); });
  at(1700, function () { go(2); });
  at(2600, function () { go(3); phone.classList.add("held"); });
  at(3500, function () { phone.classList.add("liked"); });
  at(3900, function () {
    pill.classList.add("on");
    var t = 0;
    function step() { t++; pillT.textContent = QUOTE.slice(0, t); if (t < QUOTE.length) at(55 * (0.7 + Math.random() * 0.6), step); }
    at(200, step);
  });
  at(9800, function () { pill.classList.remove("on"); });
  at(10400, feed);
}

/* start fresh each time the section comes into view; everything stops when it leaves */
typed.textContent = "";
toTop();
SK.onView(root, function () {
  stop();
  root.classList.remove("st-off");
  toTop();
  typeHead(0);
  at(900, feed);
}, function () {
  stop();
  root.classList.add("st-off");
  typing(false);
}, { ratio: 0.3, threshold: [0, 0.3, 0.6] });
