var root = document.getElementById("notes");
if (!root) return;
var ed = root.querySelector(".nt-ed"), cursor = root.querySelector(".nt-cursor"), screen = root.querySelector(".nt-screen");
var q = function (s) { return [].slice.call(root.querySelectorAll(s)); };
var NOTES = ["Make the logo land on the beat.", "Warmer music in the intro."];
var FILM = 48.28, LOOP = 22000;   /* the film is 48 s long; the timeline plays through once per loop of the clip */

/* waveforms for the audio tracks (drawn once) */
function rnd(i, s) { var x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453; return x - Math.floor(x); }
var SHAPES = {
  voice: function (i) { return (i % 17 > 12 || i % 29 > 25) ? 5 : 22 + rnd(i, 1) * 68; },
  calm: function (i) { return 14 + rnd(i, 2) * 20; },
  warm: function (i, n) { return 30 + Math.sin((i / n) * Math.PI) * 34 + rnd(i, 3) * 24; },
  rest: function (i) { return i % 6 === 0 ? 88 : 24 + rnd(i, 4) * 40; },
  clip: function (i) { return 16 + rnd(i, 5) * 70; }
};
var COUNT = { voice: 96, calm: 24, warm: 24, rest: 78, clip: 16 };
q("[data-wave]").forEach(function (el) {
  var k = el.getAttribute("data-wave"), n = COUNT[k], h = "";
  for (var i = 0; i < n; i++) h += '<u style="height:' + Math.round(SHAPES[k](i, n)) + '%"></u>';
  el.insertAdjacentHTML("beforeend", h);
});

/* the send button (one in the bar, one under the notes on phones), with the border beam and a thinking orb */
var sends = q(".nt-send");
sends.forEach(function (b) { SK.beam(b, { size: "md", variant: "mirra", radius: b.classList.contains("nt-send-m") ? 20 : 999, boost: 1.9 }); });
q(".nt-orb").forEach(function (c) { SK.orb(c, { size: 20, display: 18, state: "searching" }); });
function shown(el) { return !!(el && el.offsetParent !== null); }

var token = 0, t0 = 0, p0 = 0, clockT = 0;
var tc = root.querySelector(".nt-tc b"), comp = root.querySelector(".nt-comp"), compText = root.querySelector(".nt-comp-text");
function fmt(p) { var t = p * FILM, s = Math.floor(t); return "00:00:" + ("0" + s).slice(-2) + ":" + ("0" + Math.floor((t - s) * 60)).slice(-2); }
function progress() { return (p0 + (performance.now() - t0) / LOOP) % 1; }
function startClock(p) {
  p0 = p; t0 = performance.now();
  q(".nt-ph, .nt-scrub i").forEach(function (el) { el.style.animation = "none"; void el.offsetWidth; el.style.animation = ""; el.style.animationDelay = (-p * LOOP) + "ms"; });
  clearInterval(clockT);
  clockT = setInterval(function () { if (tc) tc.textContent = fmt(progress()); }, 250);
}

function place(el, fx, fy) {
  var a = ed.getBoundingClientRect(), b = el.getBoundingClientRect();
  cursor.style.transform = "translate3d(" + (b.left - a.left + b.width * fx).toFixed(1) + "px," + (b.top - a.top + b.height * fy).toFixed(1) + "px,0)";
}
function press() { cursor.classList.add("down"); return SK.sleep(170).then(function () { cursor.classList.remove("down"); }); }
function setN(n) { q(".nt-n").forEach(function (b) { b.textContent = n + (n === 1 ? " comment" : " comments"); }); }
function setState(s, label) { ed.setAttribute("data-s", s); var t = root.querySelector(".nt-state-t"); if (t) t.textContent = label; }
function vers(n) { root.querySelector(".nt-vnum").textContent = "v0" + n; }

function reset() {
  ["has-notes", "cut", "v2a", "v2b", "v2c", "fade"].forEach(function (c) { ed.classList.remove(c); });
  setState("idle", "In review"); vers(1); setN(0);
  q(".nt-pin, .nt-scrub b, .nt-item").forEach(function (el) { el.classList.remove("on", "done"); });
  q(".nt-text").forEach(function (el) { el._skType = (el._skType || 0) + 1; el.textContent = ""; el.classList.remove("typing"); });
  compText._skType = (compText._skType || 0) + 1; compText.textContent = ""; comp.classList.remove("typing");
  sends.forEach(function (b) { b.classList.remove("press"); });
}

/* everything in its finished state (reduced motion, and the resting frame) */
function finished() {
  reset();
  ed.classList.add("has-notes", "v2a", "v2b", "v2c");
  NOTES.forEach(function (text, k) {
    var note = root.querySelector('.nt-item[data-note="' + (k + 1) + '"]');
    note.querySelector(".nt-text").textContent = text;
    note.classList.add("on", "done");
    q('[data-pin="' + (k + 1) + '"]').forEach(function (el) { el.classList.add("on"); if (el.classList.contains("nt-pin")) el.classList.add("done"); });
  });
  setN(2); vers(2); setState("done", "New cut");
}

async function run() {
  var my = ++token, ok = function () { return my === token; };
  reset();
  ed.classList.add("live");
  startClock(0.815);
  place(root.querySelector(".nt-side"), 0.5, 0.8);
  await SK.sleep(500); if (!ok()) return;
  cursor.classList.add("on");

  var spots = [[0.64, 0.34], [0.30, 0.67]];
  for (var k = 0; k < 2; k++) {
    place(screen, spots[k][0], spots[k][1]);
    await SK.sleep(1000); if (!ok()) return;
    await press(); if (!ok()) return;
    var p = progress(), note = root.querySelector('.nt-item[data-note="' + (k + 1) + '"]'), text = note.querySelector(".nt-text");
    q('.nt-scrub [data-pin="' + (k + 1) + '"]').forEach(function (b) { b.style.setProperty("--l", (p * 100).toFixed(1) + "%"); });
    q('[data-pin="' + (k + 1) + '"]').forEach(function (el) { el.classList.add("on"); });
    note.querySelector(".nt-time").textContent = fmt(p);
    comp.querySelector(".nt-time").textContent = fmt(p);
    ed.classList.add("has-notes");
    await SK.sleep(320); if (!ok()) return;
    if (shown(comp)) {
      /* typed in the composer, like in the app, then it lands in the list */
      comp.classList.add("typing");
      if (!(await SK.type(compText, NOTES[k], { ms: 36 }))) return;
      await SK.sleep(340); if (!ok()) return;
      var okB = comp.querySelector(".nt-ok"); okB.classList.add("tap");
      await SK.sleep(160); if (!ok()) return;
      okB.classList.remove("tap"); comp.classList.remove("typing"); compText.textContent = "";
      text.textContent = NOTES[k];
      note.classList.add("on");
    } else {
      note.classList.add("on");
      text.classList.add("typing");
      if (!(await SK.type(text, NOTES[k], { ms: 36 }))) return;
      text.classList.remove("typing");
    }
    setN(k + 1);
    await SK.sleep(520); if (!ok()) return;
  }

  var btn = sends.filter(shown)[0] || sends[0];
  place(btn, 0.5, 0.56);
  await SK.sleep(1050); if (!ok()) return;
  await press(); if (!ok()) return;
  btn.classList.add("press");
  await SK.sleep(170); if (!ok()) return;
  btn.classList.remove("press");
  setState("busy", "Re-cutting");
  ed.classList.add("cut");
  await SK.sleep(260); if (!ok()) return;
  cursor.classList.remove("on");
  await SK.sleep(790); if (!ok()) return;
  ed.classList.add("v2a");                       /* the music under the intro is replaced */
  await SK.sleep(750); if (!ok()) return;
  ed.classList.add("v2b");                       /* the logo slides onto the beat */
  await SK.sleep(1100); if (!ok()) return;

  ed.classList.remove("cut");
  ed.classList.add("v2c");
  setState("done", "New cut"); vers(2);
  for (var d = 1; d <= 2; d++) {
    await SK.sleep(d === 1 ? 250 : 380); if (!ok()) return;
    root.querySelector('.nt-item[data-note="' + d + '"]').classList.add("done");
    root.querySelector('.nt-pin[data-pin="' + d + '"]').classList.add("done");
  }
  await SK.sleep(4600); if (!ok()) return;
  ed.classList.add("fade");
  await SK.sleep(480); if (!ok()) return;
  run();
}

if (SK.reduced) finished();
else SK.onView(ed, run, function () {
  token++;
  clearInterval(clockT);
  ed.classList.remove("live");
  cursor.classList.remove("on", "down");
}, { ratio: 0.35, threshold: [0, 0.35, 0.7] });
