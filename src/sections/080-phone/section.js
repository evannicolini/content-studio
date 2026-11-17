var root = document.getElementById("shoot");
if (!root) return;

/* the footage drifts a little against the scroll (only while on screen) */
(function (el) {
  /* on a phone the wide poster would show the wrong part of the scene: let the phone clip fade in instead */
  if (el && !SK.reduced && SK.mobile() && el.getAttribute("data-src-m")) {
    el.removeAttribute("poster"); el.style.opacity = "0";
    el.addEventListener("playing", function () { el.style.opacity = ""; }, { once: true });
  }
  if (!el || SK.reduced) return;
  var y = 0, raf = 0, on = false;
  function step() {
    raf = 0;
    if (!on) return;
    var r = root.getBoundingClientRect(), vh = window.innerHeight || 1;
    var p = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2)));
    var t = -p * r.height * 0.045;
    y += (t - y) * 0.12;
    if (Math.abs(t - y) < 0.05) y = t;
    el.style.transform = "translate3d(0," + y.toFixed(2) + "px,0)";
    raf = requestAnimationFrame(step);
  }
  SK.onView(root, function () { on = true; if (!raf) raf = requestAnimationFrame(step); }, function () { on = false; });
})(root.querySelector("video.bg"));

/* three batches of footage, each becomes its own film: the takes are frames of that film's own shots */
var BATCHES = [
  { slug: "run-club", cap: "Same crew.\nEvery morning." },
  { slug: "coffee-friend-arrives", cap: "The corner table.\nSaturdays." },
  { slug: "coastal-highway", cap: "Take the\nlong way." }
];
var card = root.querySelector(".sh-card"), clips = [].slice.call(card.querySelectorAll(".sh-clip"));
var steps = [].slice.call(card.querySelectorAll(".sh-steps li")), status = card.querySelector(".sh-status");
var filmBox = card.querySelector(".sh-film"), film = filmBox.querySelector("video"), cap = card.querySelector(".sh-cap"), token = 0, round = 0;
var STATES = ["s0", "s1", "s2", "s2b", "s3", "s4", "s5", "sh-fade"];

function fill(b) {
  clips.forEach(function (c, i) { c.querySelector("img").src = "assets/media/shoot/" + b.slug + "-" + (i + 1) + ".jpg"; });
  cap.textContent = b.cap;
  var src = "assets/media/selects/" + b.slug + ".mp4";
  film.poster = "assets/media/selects/" + b.slug + ".jpg";
  film.setAttribute("data-src", src);
  if (film.getAttribute("src") && film.getAttribute("src") !== src) film.src = src;      /* the kit has already armed it: swap the file */
}
function reset() {
  STATES.forEach(function (s) { card.classList.remove(s); });
  clips.forEach(function (c) { c.classList.remove("in"); });
  steps.forEach(function (s) { s.classList.remove("on", "run"); });
  status.textContent = "Drop clips here";
}
/* where each picked take has to travel to land in the middle of the film */
function measure() {
  var f = filmBox.getBoundingClientRect();
  clips.forEach(function (c) {
    if (!c.classList.contains("pick")) return;
    var w = c.offsetWidth, h = c.offsetHeight, p = c.offsetParent ? c.offsetParent.getBoundingClientRect() : f;
    c.style.setProperty("--dx", (f.left + f.width / 2 - (p.left + c.offsetLeft + w / 2)).toFixed(1) + "px");
    c.style.setProperty("--dy", (f.top + f.height / 2 - (p.top + c.offsetTop + h / 2)).toFixed(1) + "px");
  });
}
function job(n, ms, text) { var li = steps[n]; li.style.setProperty("--d", ms + "ms"); li.classList.add("run"); status.textContent = text; }
function done(n) { steps[n].classList.remove("run"); steps[n].classList.add("on"); }

async function run() {
  var my = ++token;
  var w = function (ms) { return SK.sleep(ms).then(function () { if (my !== token) throw 0; }); };
  if (SK.reduced) { reset(); fill(BATCHES[0]); clips.forEach(function (c) { c.classList.add("in"); }); steps.forEach(function (s) { s.classList.add("on"); }); ["s1", "s2", "s2b", "s3", "s4", "s5"].forEach(function (s) { card.classList.add(s); }); status.textContent = "Ready"; return; }
  try {
    for (;;) {
      reset();
      fill(BATCHES[round++ % BATCHES.length]);
      await w(350);
      clips.forEach(function (c) { c.classList.add("in"); }); status.textContent = "Dropped in"; card.classList.add("s0");
      await w(1500);
      job(0, 950, "Finding the best takes"); await w(950); done(0); card.classList.add("s1");
      await w(650);
      job(1, 900, "Cutting"); measure(); await w(250);
      card.classList.add("s2"); try { film.currentTime = 0; var p = film.play(); p && p.catch(function () {}); } catch (e) {}
      await w(900); done(1); card.classList.add("s2b");
      job(2, 800, "Captioning"); await w(800); done(2); card.classList.add("s3");
      job(3, 800, "Scoring"); await w(800); done(3); card.classList.add("s4");
      await w(450);
      card.classList.add("s5"); status.textContent = "Ready";
      await w(4600);
      card.classList.add("sh-fade");
      await w(500);
    }
  } catch (e) {}
}
fill(BATCHES[0]);
SK.onView(card, run, function () { token++; reset(); }, { ratio: 0.35, threshold: [0, 0.35, 0.7] });
