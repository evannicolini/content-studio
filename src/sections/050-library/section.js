var root = document.getElementById("library");
if (!root) return;
var wall = document.getElementById("lb-wall"), stageEl = document.getElementById("lb-stage"), deckEl = document.getElementById("lb-deck");
var ALL = ((SK.media && SK.media.selects) || []).filter(function (s) { return s.aspect === "9:16" && s.file; });
if (!ALL.length) return;
function bySlug(slug) { return ALL.filter(function (s) { return s.slug === slug; })[0]; }
/* the whiteboard clip in the manifest cuts to two other scenes after two seconds; here it plays a cut that stays at the whiteboard */
var FILE = { "cofounder-whiteboard": "assets/media/library/cofounder-whiteboard.mp4" };
function fileOf(s) { return FILE[s.slug] || s.file; }

/* a curated order: the two rows read as a mix of work, sport, travel and friends */
var ORDER = ["run-club", "cofounder-whiteboard", "coastal-highway", "yacht", "tennis-forehand", "dinner-toast", "mountain-biking", "private-jet", "court-dap", "golf",
  "surfing", "investor-intro", "house-party", "beach-volleyball", "coffee-friend-arrives", "race-track", "real-connections", "tropical-vacation", "get-together", "mountain-biking-fpv"];
var LIST = ORDER.map(bySlug).filter(Boolean);
ALL.forEach(function (s) { if (LIST.indexOf(s) < 0) LIST.push(s); });

/* ---------- a clip tile: poster, video on demand, and its prompt on glass ---------- */
/* only a teaser of the prompt is ever on the page: about 110 characters, then it blurs out */
function teaser(s) {
  var t = String(s.prompt_scene_teaser || s.prompt_teaser || "").replace(/…+\s*$/, "").replace(/\s*—\s*/g, ", ").replace(/\s+/g, " ").trim();
  var TAIL = 36, cut = Math.min(110, Math.max(40, t.length - TAIL));
  var sp = t.lastIndexOf(" ", cut);
  if (sp > cut - 18) cut = sp + 1;
  var tail = t.slice(cut, cut + TAIL), a = Math.ceil(tail.length / 3);
  return [t.slice(0, cut), tail.slice(0, a), tail.slice(a, 2 * a), tail.slice(2 * a)];
}
function makeTile(s) {
  var el = document.createElement("figure");
  el.className = "lb-tile";
  el.innerHTML = '<img alt="" width="404" height="720" loading="lazy" decoding="async">' +
    '<figcaption class="lb-name"></figcaption>' +
    '<div class="lb-pr"><p class="lb-pr-h"><span></span><b>Prompt</b></p><p class="lb-pr-t"><span class="gh"></span><span class="lv"><span class="f0"></span><span class="f1"></span><span class="f2"></span><span class="f3"></span></span></p><span class="lb-pr-tag">Full prompt in the app</span></div>';
  el.querySelector("img").src = s.poster;
  el.querySelector(".lb-name").textContent = s.title;
  el.querySelector(".lb-pr-h span").textContent = s.title;
  var parts = teaser(s);
  el.querySelector(".gh").textContent = parts.join("");
  return { el: el, s: s, parts: parts, spans: [].slice.call(el.querySelectorAll(".lv span")), v: null, live: false, open: false, run: 0, since: 0 };
}
function video(t) {
  if (t.v) return t.v;
  var v = document.createElement("video");
  v.setAttribute("data-play", ""); v.setAttribute("data-src", fileOf(t.s));
  v.loop = true; v.muted = true; v.playsInline = true; v.preload = "none";
  v.setAttribute("muted", ""); v.setAttribute("playsinline", ""); v.setAttribute("aria-hidden", "true");
  v.src = fileOf(t.s); /* preload is "none": nothing downloads until it plays */
  v.addEventListener("playing", function () { t.el.classList.add("has"); });
  /* the kit plays every video in view; this section decides which few are live */
  v.addEventListener("play", function () { if (!t.live) v.pause(); });
  t.el.insertBefore(v, t.el.querySelector(".lb-name"));
  SK.videos(t.el);
  t.v = v;
  return v;
}
function setLive(t, on) {
  if (on === t.live) return;
  t.live = on; t.since = Date.now();
  if (on) { if (!SK.reduced) { var p = video(t).play(); p && p.catch(function () {}); } }
  else if (t.v) t.v.pause();
}
function openTile(t) {
  if (t.open) return;
  t.open = true;
  var my = ++t.run;
  t.spans.forEach(function (sp) { SK.type(sp, "", { instant: true }); });
  t.el.classList.remove("done");
  t.el.classList.add("open");
  (async function () {
    await SK.sleep(SK.reduced ? 0 : 260);
    for (var i = 0; i < t.spans.length; i++) {
      if (my !== t.run) return;
      await SK.type(t.spans[i], t.parts[i], { ms: i ? 15 : 9 });
    }
    if (my === t.run) t.el.classList.add("done");
  })();
}
function closeTile(t) {
  if (!t.open) return;
  t.open = false; t.run++;
  t.el.classList.remove("open", "done");
}

/* ---------- the wall ---------- */
var tiles = [], mode = "", wallIn = false, stageIn = false, hovered = null, demo = null, loopRAF = 0, rotT = 0, demoT = 0, railT = 0, autoT = 0;
var railQ = matchMedia("(max-width: 760px), (hover: none)");
function cap() { return stageIn ? 3 : 5; }
function onScreen(t, pad) {
  var r = t.el.getBoundingClientRect(), vw = window.innerWidth;
  return r.right > r.width * pad && r.left < vw - r.width * pad;
}

/* pointer: two rows drifting in opposite directions */
var rows = [], lastT = 0, speedK = 1;
function buildRows() {
  wall.classList.remove("is-rail");
  wall.innerHTML = "";
  tiles = []; rows = [];
  var half = Math.ceil(LIST.length / 2);
  [LIST.slice(0, half), LIST.slice(half)].forEach(function (set, ri) {
    var row = document.createElement("div");
    row.className = "lb-row";
    set.concat(set).forEach(function (s) { var t = makeTile(s); tiles.push(t); row.appendChild(t.el); });
    wall.appendChild(row);
    rows.push({ el: row, n: set.length, x: 0, dir: ri ? 1 : -1, half: 0 });
  });
  tiles.forEach(function (t) {
    t.el.addEventListener("pointerenter", function (e) {
      if (e.pointerType !== "mouse") return;
      if (demo && demo !== t) { closeTile(demo); demo = null; }
      hovered = t; setLive(t, true); openTile(t);
    });
    t.el.addEventListener("pointerleave", function () { if (hovered === t) hovered = null; if (demo !== t) closeTile(t); });
  });
  fitRows();
}
function fitRows() {
  rows.forEach(function (r) {
    var a = r.el.children[0], b = r.el.children[1];
    r.half = (b.offsetLeft - a.offsetLeft) * r.n;
    if (r.dir > 0 && r.x === 0) r.x = -r.half;
    place(r);
  });
}
function place(r) { r.el.style.transform = "translate3d(" + r.x.toFixed(2) + "px,0,0)"; }
function loop(now) {
  loopRAF = 0;
  if (!wallIn || mode !== "rows") return;
  var dt = Math.min(64, now - (lastT || now));
  lastT = now;
  /* it slows to a stop while you are reading a prompt */
  var want = hovered ? 0 : demo ? 0.35 : 1;
  speedK += (want - speedK) * 0.06;
  var step = (SK.reduced ? 0 : 19) * speedK * dt / 1000;
  rows.forEach(function (r) {
    if (!r.half) return;
    r.x += r.dir * step;
    if (r.x <= -r.half) r.x += r.half;
    if (r.x > 0) r.x -= r.half;
    place(r);
  });
  loopRAF = requestAnimationFrame(loop);
}
/* only a few clips play at once; which ones changes every couple of seconds */
function rotate() {
  if (!wallIn || mode !== "rows") return;
  var vis = [], liveNow = [];
  tiles.forEach(function (t) {
    var on = onScreen(t, 0.35);
    if (t.live && !on && t !== hovered) { setLive(t, false); if (t === demo) { closeTile(t); demo = null; } }
    if (on) vis.push(t);
    if (t.live) liveNow.push(t);
  });
  var idle = vis.filter(function (t) { return !t.live; });
  if (!idle.length) return;
  var free = liveNow.filter(function (t) { return t !== hovered && t !== demo; });
  if (liveNow.length >= cap()) {
    free.sort(function (a, b) { return a.since - b.since; });
    while (free.length && liveNow.length >= cap()) { var old = free.shift(); setLive(old, false); liveNow.splice(liveNow.indexOf(old), 1); }
    if (liveNow.length >= cap()) return;
  }
  /* prefer a clip that is not already playing in its twin */
  var pick = idle.filter(function (t) { return !liveNow.some(function (l) { return l.s === t.s; }); });
  pick = pick.length ? pick : idle;
  setLive(pick[Math.floor(Math.random() * pick.length)], true);
}
/* with no pointer on it, one clip at a time shows its prompt by itself */
function autoDemo() {
  if (!wallIn || mode !== "rows" || hovered || SK.reduced) return;
  if (demo) { closeTile(demo); demo = null; return; }
  var vw = window.innerWidth;
  var mid = tiles.filter(function (t) { var r = t.el.getBoundingClientRect(); return r.left > vw * 0.16 && r.right < vw * 0.84; });
  if (!mid.length) return;
  var liveMid = mid.filter(function (t) { return t.live; });
  demo = (liveMid.length ? liveMid : mid)[Math.floor(Math.random() * (liveMid.length || mid.length))];
  setLive(demo, true);
  openTile(demo);
}

/* touch: one row to swipe; the clip in the middle plays and shows its prompt */
var railMid = -1, railDir = 1, railHold = 0;
function buildRail() {
  wall.classList.add("is-rail");
  wall.innerHTML = "";
  tiles = LIST.map(function (s) { var t = makeTile(s); wall.appendChild(t.el); return t; });
  railMid = -1;
  wall.scrollLeft = 0;
  railGo(1, true);
  railPaint();
}
function railCenter(i) { var e = tiles[i].el; return e.offsetLeft + e.offsetWidth / 2 - wall.clientWidth / 2; }
function railGo(i, instant) { i = Math.max(0, Math.min(tiles.length - 1, i)); wall.scrollTo({ left: railCenter(i), behavior: instant || SK.reduced ? "auto" : "smooth" }); }
function railPaint() {
  if (mode !== "rail") return;
  var mid = wall.scrollLeft + wall.clientWidth / 2, best = 0, bd = 1e9;
  tiles.forEach(function (t, i) { var d = Math.abs(t.el.offsetLeft + t.el.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = i; } });
  if (best !== railMid) {
    railMid = best;
    tiles.forEach(function (t, i) { t.el.classList.toggle("mid", i === best); if (i !== best) { closeTile(t); setLive(t, false); } });
  }
  clearTimeout(railT);
  railT = setTimeout(function () { if (mode === "rail" && wallIn && tiles[railMid]) { setLive(tiles[railMid], true); openTile(tiles[railMid]); } }, 320);
}
function railAuto() {
  if (mode !== "rail" || !wallIn || SK.reduced || Date.now() < railHold) return;
  if (railMid + railDir > tiles.length - 1 || railMid + railDir < 0) railDir = -railDir;
  railGo(railMid + railDir);
}
wall.addEventListener("scroll", function () { if (mode === "rail") requestAnimationFrame(railPaint); }, { passive: true });
wall.addEventListener("touchstart", function () { railHold = Date.now() + 10000; }, { passive: true });
wall.addEventListener("wheel", function () { railHold = Date.now() + 8000; }, { passive: true });

function build() {
  var next = railQ.matches ? "rail" : "rows";
  if (next === mode) { if (mode === "rows") fitRows(); return; }
  tiles.forEach(function (t) { if (t.v) t.v.pause(); });
  hovered = demo = null;
  mode = next;
  if (mode === "rail") buildRail(); else buildRows();
  if (wallIn) wake();
}
function wake() {
  clearInterval(rotT); clearInterval(demoT); clearInterval(autoT);
  if (mode === "rows") {
    lastT = 0;
    if (!loopRAF) loopRAF = requestAnimationFrame(loop);
    rotate(); setTimeout(rotate, 500); setTimeout(rotate, 1000);
    rotT = setInterval(rotate, 2100);
    demoT = setInterval(autoDemo, 3300);
    setTimeout(autoDemo, 1500);
  } else {
    railPaint();
    autoT = setInterval(railAuto, 6200);
    railHold = Date.now() + 3000;
  }
}
function rest() {
  clearInterval(rotT); clearInterval(demoT); clearInterval(autoT); clearTimeout(railT);
  tiles.forEach(function (t) { setLive(t, false); closeTile(t); });
  hovered = demo = null;
}
build();
SK.onView(wall, function () { wallIn = true; wake(); }, function () { wallIn = false; rest(); }, { ratio: 0.12, threshold: [0, 0.12, 0.5] });
var rz = 0;
window.addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(build, 140); });
window.addEventListener("load", function () { if (mode === "rows") fitRows(); });

/* ---------- describe a scene: the line you type, the clip that comes to the front ---------- */
var ASKS = [
  ["Two founders at a whiteboard, afternoon sun", "cofounder-whiteboard"],
  ["Friends on a coastal highway, convertible", "coastal-highway"],
  ["A run club crossing the bridge", "run-club"]
].filter(function (a) { return bySlug(a[1]); });
var deck = ASKS.map(function (a, i) {
  var t = makeTile(bySlug(a[1]));
  t.el.setAttribute("data-pos", String(i - 1));
  deckEl.appendChild(t.el);
  return t;
});
var stepEl = document.getElementById("lb-step"), front = -1, askRun = 0;
/* the beat in between: the line is matched against the library (thumbnails flick past), then the prompt is written */
var matchEl = document.getElementById("lb-match"), matchTh = [].slice.call(matchEl.querySelectorAll(".lb-match-th i")), flickT = 0, flickN = 0;
function flick() {
  matchTh.forEach(function (th, k) { th.style.backgroundImage = 'url("' + LIST[(flickN * 3 + k * 5) % LIST.length].poster + '")'; });
  flickN++;
}
function matching(on) {
  clearInterval(flickT);
  matchEl.classList.remove("done");
  matchEl.classList.toggle("on", on);
  if (on) { flick(); if (!SK.reduced) flickT = setInterval(flick, 130); }
}
function written(t) {
  clearInterval(flickT);
  /* the flicking settles on the clip it found */
  matchTh.forEach(function (th, k) { th.style.backgroundImage = 'url("' + (k ? LIST[(k * 7) % LIST.length] : t.s).poster + '")'; });
  matchEl.classList.add("done");
}
function bring(i) {
  var n = deck.length;
  deck.forEach(function (t, j) {
    if (j !== i) { closeTile(t); setLive(t, false); }
    var rel = j === i ? 0 : (j - i + n) % n === 1 ? 1 : -1;
    t.el.setAttribute("data-pos", String(rel));
    t.el.classList.toggle("front", j === i);
  });
  front = i;
}
if (deck.length) {
  if (SK.reduced) { bring(0); openTile(deck[0]); matching(true); written(deck[0]); }
  var field = SK.promptField(document.getElementById("lb-field"), {
    placeholder: "Describe a scene",
    scale: SK.mobile() ? 1.04 : 1.3,
    prompts: SK.reduced ? [] : ASKS.map(function (a) { return a[0]; }),
    onSend: async function (p, ctl, i) {
      var my = ++askRun;
      if (stepEl) stepEl.textContent = "0" + (i + 1) + " / 0" + deck.length;
      if (front >= 0) { closeTile(deck[front]); }
      matching(true);
      await SK.sleep(1700);
      if (my !== askRun) return;
      written(deck[i]);
      ctl.state("idle");
      await SK.sleep(750);
      if (my !== askRun) return;
      bring(i);
      await SK.sleep(650);
      if (my !== askRun) return;
      setLive(deck[i], true);
      await SK.sleep(900);
      if (my !== askRun) return;
      openTile(deck[i]);
      await SK.sleep(4600);
      if (my !== askRun) return;
      matching(false);
      await SK.sleep(350);
    }
  });
  SK.onView(stageEl, function () { stageIn = true; if (front >= 0 && !SK.reduced) setLive(deck[front], true); },
    function () { stageIn = false; askRun++; matching(false); deck.forEach(function (t) { setLive(t, false); closeTile(t); }); }, { ratio: 0.15, threshold: [0, 0.15, 0.5] });
}
