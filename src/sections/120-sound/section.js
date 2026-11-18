var root = document.getElementById("sound");
if (!root) return;
var phone = SK.mobile();
function rnd(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
var PLAY = '<span class="snd-play"><svg class="pl" viewBox="0 0 12 12"><path d="M2.6 1.2v9.6L10.8 6z"/></svg><svg class="pa" viewBox="0 0 12 12"><path d="M2.2 1.5h2.8v9H2.2zM7 1.5h2.8v9H7z"/></svg></span>';
var MARK = '<svg aria-hidden="true"><use href="#studio-mark"/></svg>';

/* ---------- music: invented titles, real genre names and counts from the library ---------- */
var TRACKS = [
  { t: "Morning Light", m: "Warm, hopeful", g: "Ambient", d: "2:14" },
  { t: "Low Tide", m: "Calm, steady", g: "Lo-Fi", d: "1:48" },
  { t: "Open Road", m: "Bright, driving", g: "Upbeat", d: "2:31" },
  { t: "Glass Hour", m: "Slow build", g: "Cinematic", d: "3:02" }
];
var list = document.getElementById("snd-list"), NB = phone ? 44 : 84, rows = [];
function shape(seed, n) {
  var out = [];
  for (var i = 0; i < n; i++) {
    var x = i / n;
    var env = .3 + .7 * Math.pow(Math.sin(Math.PI * Math.min(1, x * 1.08 + .04)), .55);
    var sec = .72 + .28 * Math.sin(x * Math.PI * 2 * (2 + (seed % 3)) + seed * 1.7);
    var beat = i % 4 === 0 ? 1 : i % 2 === 0 ? .82 : .66;
    out.push(Math.max(.08, Math.min(1, env * sec * beat * (.5 + .5 * rnd(i * 7.3 + seed * 31)))));
  }
  return out;
}
TRACKS.forEach(function (tr, k) {
  var li = document.createElement("li");
  li.className = "snd-row";
  li.innerHTML = PLAY + '<span class="snd-t"><b>' + tr.t + "</b><span>" + tr.m + '</span></span><span class="snd-wave">' +
    shape(k + 2, NB).map(function (v) { return '<i style="height:' + Math.round(8 + v * 92) + '%"></i>'; }).join("") + '<em></em></span><span class="snd-genre">' + tr.g + '</span><span class="snd-dur">' + tr.d + "</span>";
  list.appendChild(li);
  rows.push({ el: li, wave: li.querySelector(".snd-wave"), bars: [].slice.call(li.querySelectorAll(".snd-wave i")), head: li.querySelector(".snd-wave em"), lit: 0, w: 0 });
});
var cur = 0;
function setRow(k) {
  rows.forEach(function (r, i) {
    r.el.classList.toggle("on", i === k);
    if (i !== k && r.lit) { for (var b = 0; b < r.lit; b++) r.bars[b].classList.remove("on"); r.lit = 0; r.head.style.transform = ""; }
  });
  cur = k;
  rows[k].w = rows[k].wave.clientWidth;
}
function music(p) {
  var r = rows[cur], n = Math.round(p * r.bars.length);
  while (r.lit < n) { r.bars[r.lit].classList.add("on"); r.lit++; }
  while (r.lit > n) { r.lit--; r.bars[r.lit].classList.remove("on"); }
  r.head.style.transform = "translateX(" + (p * r.w).toFixed(1) + "px)";
}

/* ---------- sound: every visible action has a clip right under it ---------- */
var CUTS = [.22, .68], WORDS = [["Your", .29], ["idea,", .385], ["on", .48], ["screen.", .575]], LOGO = .8;
var lanes = { text: document.getElementById("snd-text"), shots: document.getElementById("snd-shots"), sfx: document.getElementById("snd-sfx"), names: document.getElementById("snd-names"), guides: document.getElementById("snd-guides"), ruler: document.getElementById("snd-ruler") };
var tracks = document.getElementById("snd-tracks"), playhead = document.getElementById("snd-playhead"), EV = [];
function put(lane, cls, a, b, html) {
  var e = document.createElement(cls === "g" ? "i" : "div");
  if (cls !== "g") e.className = cls;
  e.style.left = (a * 100).toFixed(2) + "%";
  if (b != null) e.style.width = ((b - a) * 100).toFixed(2) + "%";
  if (html) e.innerHTML = html;
  lane.appendChild(e);
  return e;
}
function bars(vals) { return vals.map(function (v) { return '<i style="height:' + Math.round(v * 100) + '%"></i>'; }).join(""); }
function hump(n) { var o = []; for (var i = 0; i < n; i++) o.push(.16 + .7 * Math.pow(Math.sin((Math.PI * (i + .5)) / n), 1.6) * (.75 + .25 * rnd(i + 3))); return o; }
function decay(n) { var o = []; for (var i = 0; i < n; i++) o.push(Math.max(.1, .92 * Math.exp(-i / (n * .3)) * (.8 + .2 * rnd(i + 11)))); return o; }
function name(at, txt) { var s = document.createElement("span"); s.style.left = (at * 100).toFixed(2) + "%"; s.textContent = txt; lanes.names.appendChild(s); return s; }
[0, 2, 4, 6].forEach(function (s) { var e = document.createElement("span"); e.style.left = (s / 8 * 100) + "%"; e.textContent = s + "s"; lanes.ruler.appendChild(e); });
/* shots */
var shotA = put(lanes.shots, "snd-shot", 0, CUTS[0] - .004), shotB = put(lanes.shots, "snd-shot", CUTS[0] + .004, CUTS[1] - .004), shotC = put(lanes.shots, "snd-shot end", CUTS[1] + .004, 1, MARK);
shotA.setAttribute("data-bg", "assets/media/thumbs/t04.jpg");
shotB.setAttribute("data-bg", "assets/media/thumbs/t13.jpg");
/* cuts: a whoosh that lands on the cut */
CUTS.forEach(function (c) {
  var clip = put(lanes.sfx, "snd-clip", c - .042, c + .034, bars(hump(phone ? 7 : 12)));
  EV.push({ t: c, clip: clip, guide: put(lanes.guides, "g", c), name: name(c - .004, "Whoosh") });
});
/* words: a tick as each one is typed */
var tickName = name((WORDS[0][1] + WORDS[3][1]) / 2 + .01, phone ? "Ticks" : "A tick per word");
WORDS.forEach(function (w, i) {
  var end = i < WORDS.length - 1 ? WORDS[i + 1][1] - .008 : CUTS[1] - .012;
  var chip = put(lanes.text, "snd-word", w[1], end, w[0]);
  var clip = put(lanes.sfx, "snd-clip tick", w[1], w[1] + .018, bars([.9, .42]));
  EV.push({ t: w[1], chip: chip, clip: clip, guide: put(lanes.guides, "g", w[1]), name: tickName });
});
/* logo: a soft hit as it lands */
var logoChip = put(lanes.text, "snd-word", LOGO, .965, MARK + (phone ? "" : "<span>Logo</span>"));
EV.push({ t: LOGO, chip: logoChip, shot: shotC, clip: put(lanes.sfx, "snd-clip", LOGO, LOGO + .1, bars(decay(phone ? 8 : 13))), guide: put(lanes.guides, "g", LOGO), name: name(LOGO + .05, "Soft hit") });
EV.sort(function (a, b) { return a.t - b.t; });

function fire(e) {
  e.chip && e.chip.classList.add("on");
  e.shot && e.shot.classList.add("on");
  [e.clip, e.guide, e.name].forEach(function (x) { if (x) { x.classList.add("hit"); setTimeout(function () { x.classList.remove("hit"); }, 420); } });
}
function clearTl() { EV.forEach(function (e) { e.chip && e.chip.classList.remove("on"); e.shot && e.shot.classList.remove("on"); }); }

/* ---------- voices: stock voices that ship in the app (names and taglines from voices.json) ---------- */
var VOICES = [["Ellen", "Serious, direct"], ["Emma", "Clear, confident"], ["Brad", "Warm, trusted"], ["Everett", "Low, confident"], ["Mark", "Easy, casual"], ["Ryan", "Real talk"]];
var vs = document.getElementById("snd-vs"), vEls = [];
VOICES.forEach(function (v, k) {
  var li = document.createElement("li"), w = "";
  for (var i = 0; i < (phone ? 14 : 20); i++) w += '<i style="height:' + Math.round(24 + 76 * rnd(i * 3.1 + k * 17) * (.45 + .55 * Math.sin((Math.PI * (i + .5)) / 20))) + "%;--d:" + (rnd(i + k * 9) * .9).toFixed(2) + '"></i>';
  li.className = "snd-v";
  li.innerHTML = '<span class="snd-face"><b>' + v[0][0] + '</b><img src="assets/media/voices/' + v[0].toLowerCase() + '.jpg" alt="" width="480" height="600" loading="lazy" decoding="async"><span class="snd-vw">' + w + '</span>' + PLAY + '</span><span class="snd-vt"><b>' + v[0] + "</b><em>" + v[1] + "</em></span>";
  var im = li.querySelector("img");
  im.addEventListener("error", function () { im.remove(); });
  vs.appendChild(li);
  vEls.push(li);
});
function voice(k) { vEls.forEach(function (e, i) { e.classList.toggle("on", i === k); }); }

/* ---------- one clock for all three, only while on screen ---------- */
var grid = document.getElementById("snd-grid"), D = 7600, REST = 1100, running = false, raf = 0, t0 = 0, ei = 0, loopN = 0, W = 0, vT = 0, vI = 0, resting = false;
function measure() { W = lanes.shots.clientWidth; rows[cur].w = rows[cur].wave.clientWidth; }
function frame(now) {
  if (!running) return;
  var el = now - t0;
  if (el >= D + REST) { t0 = now; el = 0; ei = 0; loopN++; clearTl(); setRow(loopN % rows.length); resting = false; playhead.classList.remove("rest"); }
  var p = Math.min(1, el / D);
  if (el > D && !resting) { resting = true; playhead.classList.add("rest"); }
  playhead.style.transform = "translateX(" + (p * W).toFixed(1) + "px)";
  while (ei < EV.length && p >= EV[ei].t) { fire(EV[ei]); ei++; }
  music(p);
  raf = requestAnimationFrame(frame);
}
function start() {
  if (running) return;
  root.querySelectorAll("[data-bg]").forEach(function (e) { e.style.backgroundImage = "url(" + e.getAttribute("data-bg") + ")"; e.removeAttribute("data-bg"); });
  measure();
  running = true; t0 = performance.now(); ei = 0; resting = false; clearTl(); playhead.classList.remove("rest");
  raf = requestAnimationFrame(frame);
  voice(vI);
  vT = setInterval(function () { vI = (vI + 1) % vEls.length; voice(vI); }, 3200);
}
function stop() { running = false; cancelAnimationFrame(raf); clearInterval(vT); voice(-1); }
setRow(0);
if (SK.reduced) {
  root.querySelectorAll("[data-bg]").forEach(function (e) { e.style.backgroundImage = "url(" + e.getAttribute("data-bg") + ")"; });
  measure(); EV.forEach(function (e) { e.chip && e.chip.classList.add("on"); e.shot && e.shot.classList.add("on"); });
  playhead.classList.add("rest"); music(.38); voice(0);
} else {
  SK.onView(grid, start, stop, { ratio: .12, threshold: [0, .12, .4] });
  window.addEventListener("resize", measure);
}
