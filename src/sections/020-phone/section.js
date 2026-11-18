var sec = document.getElementById("shoot");
if (!sec) return;
var root = sec.querySelector(".sh.frame");      /* screen one: the footage frame */

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


/* ================= screen two: the camera roll goes into Studio, finished videos come out ================= */
(function () {
  var box = sec.querySelector(".sho");
  if (!box) return;
  var stage = box.querySelector(".sho-stage"), flow = box.querySelector(".sho-flow"), tray = box.querySelector(".sho-tray"), pile = box.querySelector(".sho-pile");
  var core = box.querySelector(".sho-core"), statusBox = box.querySelector(".sho-status"), statusText = statusBox.querySelector("span");
  var bars = [].slice.call(box.querySelectorAll(".sho-bars li")), nIn = box.querySelector(".sho-in"), nOut = box.querySelector(".sho-n-out");
  var vids = [].slice.call(box.querySelectorAll(".sho-vid"));
  var M = "assets/media/", RAW = [], STEP = 44, FLY = 850, IDLE = "Drop in the camera roll", tok = 0, laid = "";

  /* 38 raw clips: frames of real footage already on the site (15 from the three shoots above, 23 more from the library) */
  ["run-club", "coffee-friend-arrives", "coastal-highway"].forEach(function (s) { for (var i = 1; i <= 5; i++) RAW.push("shoot/" + s + "-" + i + ".jpg"); });
  ["02", "04", "06", "08", "11", "13", "15", "17", "19", "21", "23", "25", "27"].forEach(function (n) { RAW.push("thumbs/t" + n + ".jpg"); });
  ["dinner-toast", "get-together", "real-connections", "tropical-vacation", "race-track", "investor-intro", "court-dap", "golf", "surfing", "tennis-forehand"].forEach(function (s) { RAW.push("selects/" + s + ".jpg"); });
  var TOTAL = RAW.length, OUT = vids.length;

  /* the same "random" every visit, so the pile always looks composed */
  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  for (var i = RAW.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = RAW[i]; RAW[i] = RAW[j]; RAW[j] = t; }
  var clips = RAW.map(function (src, n) {
    var el = document.createElement("span"), inner = document.createElement("i"), img = document.createElement("img");
    el.className = "sho-clip";
    img.alt = ""; img.width = 180; img.height = 320; img.decoding = "async"; img.loading = "lazy"; img.src = M + src;
    inner.appendChild(img); el.appendChild(inner); pile.appendChild(el);
    return { el: el, jx: rnd() - .5, jy: rnd() - .5, r: (rnd() - .5) * 17, z: Math.floor(rnd() * 20), n: n };
  });

  /* place the pile for the box it has: a tall tray on wide screens, a low wide one on phones */
  function layout() {
    var W = pile.clientWidth, H = pile.clientHeight;
    if (!W || !H) return false;
    var key = W + "x" + H;
    if (key === laid) return true;
    laid = key;
    var wide = W / H > 1.3, cols = wide ? 13 : 5, rows = Math.ceil(TOTAL / cols);
    var cw = wide ? Math.min(W * .112, H * .6 * 9 / 16) : Math.min(W * .2, H * .2 * 9 / 16 + 30), ch = cw * 16 / 9;
    clips.forEach(function (c, n) {
      var col = n % cols, row = Math.floor(n / cols), last = row === rows - 1 ? TOTAL - row * cols : cols;
      var fx = last > 1 ? (col + (cols - last) / 2) / (cols - 1) : .5, fy = rows > 1 ? row / (rows - 1) : .5;
      var x = fx * (W - cw) + c.jx * cw * .34, y = fy * (H - ch) + c.jy * ch * .16;
      c.el.style.width = cw.toFixed(1) + "px";
      c.el.style.left = Math.max(0, Math.min(W - cw, x)).toFixed(1) + "px";
      c.el.style.top = Math.max(0, Math.min(H - ch, y)).toFixed(1) + "px";
      c.el.style.zIndex = c.z;
      c.el.style.setProperty("--r", c.r.toFixed(1) + "deg");
      c.el.style.setProperty("--n", n);
    });
    return true;
  }
  /* where everything has to travel: clips to the middle of Studio, videos from the middle of Studio to their place.
     The stage may still be growing into place (the kit scales frames in), so screen distances are scaled back. */
  function measure() {
    var k = (stage.getBoundingClientRect().width / stage.offsetWidth) || 1, c = core.getBoundingClientRect();
    var cx = c.left + c.width / 2, cy = c.top + c.height / 2, list = [];
    clips.forEach(function (o) {
      var r = o.el.getBoundingClientRect(), dx = cx - (r.left + r.width / 2), dy = cy - (r.top + r.height / 2);
      o.el.style.setProperty("--dx", ((dx + o.jx * c.width * .3) / k).toFixed(1) + "px");
      o.el.style.setProperty("--dy", ((dy + o.jy * c.height * .3) / k).toFixed(1) + "px");
      list.push({ o: o, d: Math.sqrt(dx * dx + dy * dy) * (1 + o.jx * .5) });
    });
    list.sort(function (a, b) { return a.d - b.d; }).forEach(function (x, i) { x.o.el.style.setProperty("--k", i); });   /* the nearest leave first */
    vids.forEach(function (v) {
      var r = v.getBoundingClientRect(), card = v.querySelector(".sho-card");
      card.style.setProperty("--fx", ((cx - (r.left + r.width / 2)) / k).toFixed(1) + "px");
      card.style.setProperty("--fy", ((cy - (r.top + r.height / 2)) / k).toFixed(1) + "px");
    });
  }
  function say(text) {
    if (statusText.textContent === text) return;
    statusBox.classList.add("swap");
    var my = tok;
    setTimeout(function () { if (my !== tok) return; statusText.textContent = text; statusBox.classList.remove("swap"); }, 170);
  }
  function bar(n, ms) { bars[n].style.setProperty("--d", ms + "ms"); bars[n].classList.add("run"); }
  function barDone(n) { bars[n].classList.remove("run"); bars[n].classList.add("on"); }
  /* a count that ticks, one step every `ms` */
  function tick(el, from, to, ms, after) {
    var my = tok, v = from, dir = to > from ? 1 : -1;
    setTimeout(function next() {
      if (my !== tok) return;
      v += dir; el.textContent = v; el.classList.toggle("lit", v > 0);
      if (v !== to) setTimeout(next, ms);
    }, after || 0);
  }
  function reset() {
    flow.classList.add("rst");
    flow.classList.remove("s-in", "s-go", "s-back", "fade"); tray.classList.remove("done"); statusBox.classList.remove("swap");
    vids.forEach(function (v) { v.classList.remove("on"); });
    bars.forEach(function (b) { b.classList.remove("run", "on"); });
    statusText.textContent = IDLE; nIn.textContent = "0"; nOut.textContent = "0";
    nIn.classList.remove("lit"); nOut.classList.remove("lit");
    void flow.offsetWidth;
    flow.classList.remove("rst");
  }
  /* the finished picture, for people who asked for no motion */
  function still() {
    reset(); layout(); flow.classList.add("rst", "s-in");
    vids.forEach(function (v) { v.classList.add("on"); });
    bars.forEach(function (b) { b.classList.add("on"); });
    statusText.textContent = OUT + " videos ready"; nIn.textContent = TOTAL; nOut.textContent = OUT;
    nIn.classList.add("lit"); nOut.classList.add("lit");
  }

  async function run() {
    var my = ++tok;
    var w = function (ms) { return SK.sleep(ms).then(function () { if (my !== tok) throw 0; }); };
    if (SK.reduced) { still(); return; }
    flow.style.setProperty("--step", STEP + "ms");
    try {
      for (;;) {
        reset();
        if (!layout()) { await w(400); continue; }
        await w(350);
        flow.classList.add("s-in");                                   /* the camera roll drops in */
        await w(1500);
        measure();
        var intake = (TOTAL - 1) * STEP + FLY;
        say("Finding the best takes"); bar(0, intake + 250);
        flow.classList.add("s-go");                                   /* every clip streams under the glass, into Studio */
        tick(nIn, 0, TOTAL, STEP, FLY - 200);
        await w(intake + 250);
        barDone(0); flow.classList.add("s-back"); tray.classList.add("done");
        say("Cutting"); bar(1, 850); await w(850); barDone(1);
        say("Captions"); bar(2, 800); await w(800); barDone(2);
        say("Music"); bar(3, 800); await w(800); barDone(3);
        await w(150);
        measure();
        say(OUT + " videos ready");
        for (var n = 0; n < OUT; n++) {                               /* the videos come out, one by one, and take their names */
          var v = vids[n], vid = v.querySelector("video");
          try { vid.currentTime = 0; } catch (e) {}
          v.classList.add("on");
          tick(nOut, n, n + 1, 1, 420);
          await w(330);
        }
        await w(5600);                                                /* rest on the finished set */
        flow.classList.add("fade");
        await w(650);
      }
    } catch (e) {}
  }

  layout();
  var rz = 0;
  window.addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(function () { if (layout() && flow.classList.contains("s-go")) run(); }, 200); });
  if (SK.reduced) { still(); return; }
  SK.onView(flow, run, function () { tok++; reset(); }, { ratio: 0.25, threshold: [0, 0.25, 0.6] });
})();
