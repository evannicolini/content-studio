var root = document.getElementById("viral");
if (!root) return;
var q = function (s) { return [].slice.call(root.querySelectorAll(s)); };
var stage = root.querySelector(".vl-stage"), flow = root.querySelector(".vl-flow");
var steps = q(".vl-step"), arrows = q(".vl-arrow"), you = root.querySelector(".vl-you video");
var PROMPT = "Remake this viral video with my footage";
var BASE = [0, 1750, 6700];          /* when each beat starts, ms after the prompt is sent */
var timers = [], token = 0;

function at(ms, fn) { timers.push(setTimeout(fn, Math.max(0, ms))); }
function stop() { timers.forEach(clearTimeout); timers = []; }
function show(el, instant) {
  el.classList.add("on");
  var v = el.querySelector && el.querySelector(".vl-v");
  if (v) SK.type(v, v.getAttribute("data-text"), { ms: 26, instant: instant });
}
function lightStep(k) { steps[k].classList.add("on"); if (k > 0) arrows[k - 1].classList.add("on"); }

/* one beat: its parts arrive in reading order. t0 = how far into the beat we start (0 = from its beginning) */
function beat(k, shift) {
  at(shift, function () {
    lightStep(k);
    if (k === 1) flow.classList.add("scan");
    if (k === 2) { try { you.currentTime = 0; } catch (e) {} var p = you.play(); p && p.catch(function () {}); }
  });
  [].slice.call(steps[k].querySelectorAll("[data-at]")).forEach(function (el) {
    at(shift + (+el.getAttribute("data-at") - BASE[k]), function () { show(el); });
  });
  if (k === 1) at(shift + 4500, function () { flow.classList.remove("scan"); flow.classList.add("studied"); });
}

function reset() {
  stop();
  flow.classList.remove("scan", "studied");
  steps.forEach(function (s) { s.classList.remove("on"); });
  arrows.forEach(function (a) { a.classList.remove("on"); });
  q(".vl-flow [data-at]").forEach(function (el) { el.classList.remove("on"); });
  q(".vl-v").forEach(function (v) { v._skType = (v._skType || 0) + 1; v.textContent = ""; });
}

/* the finished picture: what reduced motion shows, and what the stage rests on when you scroll away mid-loop */
function finished() {
  stop();
  steps.forEach(function (s, k) { lightStep(k); });
  q(".vl-flow [data-at]").forEach(function (el) { show(el, true); });
  flow.classList.remove("scan");
  flow.classList.add("studied");
}

var field = SK.promptField(document.getElementById("vl-field"), { placeholder: "What should we make?", scale: SK.mobile() ? 1.04 : 1.2, auto: false });

if (SK.reduced) {
  field.set(PROMPT);
  finished();
} else if (SK.mobile()) {
  /* phones: the stage is taller than the screen, so each beat plays once, when you reach it */
  var sent = false, waiting = [];
  SK.onView(field.el, function () {
    field.type(PROMPT).then(function () { return SK.sleep(420); }).then(function () {
      field.send();
      setTimeout(function () { field.state("idle"); }, 1900);
      sent = true;
      waiting.forEach(function (f) { f(); });
    });
  }, null, { once: true, ratio: 0.6, threshold: [0, 0.6] });
  setTimeout(function () { if (!sent) { sent = true; waiting.forEach(function (f) { f(); }); } }, 6000);
  steps.forEach(function (s, k) {
    SK.onView(s, function () {
      var go = function () { beat(k, k === 0 ? 150 : 250); };
      if (sent) go(); else waiting.push(go);
    }, null, { once: true, ratio: 0.3, threshold: [0, 0.3, 0.6] });
  });
} else {
  /* desktop: the whole graphic is on screen, so it loops: ask, a video goes in, Claude studies it, the remake plays */
  var loop = async function () {
    var my = ++token, ok = function () { return my === token; };
    while (ok()) {
      field.state("idle").clear();
      reset();
      await SK.sleep(700); if (!ok()) return;
      if (!(await field.type(PROMPT)) || !ok()) return;
      await SK.sleep(420); if (!ok()) return;
      field.send();
      setTimeout(function () { if (ok()) field.state("idle"); }, 1900);
      beat(0, 150); beat(1, BASE[1]); beat(2, BASE[2]);
      await SK.sleep(14200); if (!ok()) return;
    }
  };
  SK.onView(stage, loop, function () {
    token++;
    field.stop();
    field.state("idle").set(PROMPT);
    finished();
  }, { ratio: 0.3, threshold: [0, 0.3, 0.6] });
}

/* ================= the library: add a video, Claude studies it once, the study is kept, remake it any time ================= */
var lib = document.getElementById("vlb");
if (!lib) return;
var L = function (s) { return lib.querySelector(s); }, LA = function (s) { return [].slice.call(lib.querySelectorAll(s)); };
var addB = L("#vlb-add"), tile = L("#vlb-new"), url = L("#vlb-url"), chip = L("#vlb-chip"), chipT = chip.querySelector("em"), tileV = tile.querySelector("video");
var sheet = L("#vlb-open"), rows = LA(".vlb-row"), go = L("#vlb-go"), re = L("#vlb-re"), reV = re.querySelector("video");
var nAll = L("#vlb-n"), nOk = L("#vlb-ok"), nOf = L("#vlb-all");
var LINK = SK.mobile() ? "Reel link" : "instagram.com/reel/…", SAVED = 7, libTok = 0;

function count(all, ok) { nAll.textContent = String(all); nOf.textContent = String(all); nOk.textContent = String(ok); }
function chipSet(t, ok) { chipT.textContent = t; chip.classList.toggle("ok", !!ok); }
function rowOn(r, instant) { r.classList.add("on"); var v = r.querySelector(".vlb-v"); SK.type(v, v.getAttribute("data-text"), { ms: 24, instant: instant }); }
function restart(v) { try { v.currentTime = 0; } catch (e) {} if (!SK.reduced) { var p = v.play(); p && p.catch(function () {}); } }
function libReset() {
  addB.classList.remove("tap");
  tile.classList.remove("link", "saved", "studying");
  url._skType = (url._skType || 0) + 1; url.textContent = "";
  chipSet("Saved", false);
  sheet.classList.remove("open", "studied");
  rows.forEach(function (r) { r.classList.remove("on"); var v = r.querySelector(".vlb-v"); v._skType = (v._skType || 0) + 1; v.textContent = ""; });
  go.classList.remove("ready", "tap", "busy", "done");
  re.classList.remove("making", "on");
  count(SAVED, SAVED);
}
/* the finished picture: reduced motion, and what the stage rests on when it is scrolled away mid-loop */
function libDone() {
  url._skType = (url._skType || 0) + 1; url.textContent = LINK;
  tile.classList.remove("link", "studying"); tile.classList.add("saved");
  chipSet("Studied", true);
  sheet.classList.add("open", "studied");
  rows.forEach(function (r) { rowOn(r, true); });
  go.classList.remove("ready", "tap", "busy"); go.classList.add("done");
  re.classList.remove("making"); re.classList.add("on");
  count(SAVED + 1, SAVED + 1);
}
async function libLoop() {
  var my = ++libTok, ok = function () { return my === libTok; }, wait = function (ms) { return SK.sleep(ms).then(ok); };
  while (ok()) {
    libReset();
    if (!(await wait(900))) return;
    addB.classList.add("tap");                                   /* Add a video */
    if (!(await wait(240))) return;
    addB.classList.remove("tap"); tile.classList.add("link");
    if (!(await wait(380))) return;
    await SK.type(url, LINK, { ms: 40 });                        /* a link goes in */
    if (!(await wait(520))) return;
    tile.classList.add("saved"); restart(tileV);                 /* saved: the real video, its numbers */
    count(SAVED + 1, SAVED);
    sheet.classList.add("open");
    if (!(await wait(900))) return;
    tile.classList.add("studying"); chipSet("Studying", false);  /* Claude studies it, once */
    for (var i = 0; i < rows.length; i++) { if (!(await wait(i ? 680 : 500))) return; rowOn(rows[i]); }
    if (!(await wait(1100))) return;
    tile.classList.remove("studying"); chipSet("Studied", true);
    sheet.classList.add("studied"); count(SAVED + 1, SAVED + 1);
    if (!(await wait(700))) return;
    go.classList.add("ready");                                   /* the study is kept: remake it whenever */
    if (!(await wait(1300))) return;
    go.classList.add("tap");
    if (!(await wait(200))) return;
    go.classList.remove("tap", "ready"); go.classList.add("busy"); re.classList.add("making");
    if (!(await wait(1900))) return;
    go.classList.remove("busy"); go.classList.add("done");
    re.classList.remove("making"); re.classList.add("on"); restart(reV);   /* a new vertical cut, for your brand */
    if (!(await wait(5400))) return;                             /* rest on the finished picture */
  }
}
if (SK.reduced) libDone();
else {
  libReset();
  SK.onView(lib, libLoop, function () { libTok++; libDone(); }, { ratio: SK.mobile() ? 0.25 : 0.4, threshold: [0, 0.25, 0.4, 0.7] });
}
