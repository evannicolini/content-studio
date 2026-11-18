var root = document.getElementById("aesthetic");
if (!root) return;

/* the nine styles, read from the product library (aesthetic/styles.json). n = graphics in the style. */
var P = "assets/media/aesthetic/";
var STYLES = [
  { id: "studio", name: "Studio", tag: "Terminal captions, tactical brackets, type on real footage.", made: "founders, product, personal brand", type: "Switzer, IBM Plex Mono", pal: ["#0E0F11", "#536878", "#A9B2B9", "#E5E4E2", "#F3F3F1"], n: 60 },
  { id: "clean", name: "Clean", tag: "One neutral sans, generous space. Nothing clever, perfectly set.", made: "anyone, a safe start", type: "Inter", pal: ["#FFFFFF", "#FBFBFD", "#86868B", "#1D1D1F", "#000000"], n: 28 },
  { id: "editorial", name: "Editorial", tag: "An elegant serif, tracked caps, slow fades.", made: "luxury, hospitality, fashion", type: "Instrument Serif, Jost", pal: ["#FAF7F2", "#F1ECE4", "#D9CFC1", "#8C6A4F", "#2A2420"], n: 46 },
  { id: "docu", name: "Docu", tag: "Serif subtitles, quiet name bars, chapter cards.", made: "founder stories, interviews, testimonials", type: "Newsreader, Libre Franklin", pal: ["#141414", "#2A2A29", "#8C8A84", "#E6E3DC", "#C8B79A"], n: 38 },
  { id: "glass", name: "Glass", tag: "Glass cards, fields and pills over live action.", made: "apps and products, creators, talking to camera", type: "Inter", pal: ["#0C1220", "#2B4A86", "#C9D6E4", "#F2F4F6", "#FFFFFF"], n: 39 },
  { id: "horizon", name: "Horizon", tag: "One line of tiny bold caps, far apart across the scene.", made: "personal brand, travel, quiet luxury", type: "Instrument Serif, Inter", pal: ["#0F1B33", "#5E83A8", "#F3EFE6", "#F0913C", "#FFFFFF"], n: 33 },
  { id: "journal", name: "Journal", tag: "Diary and data set straight on the picture.", made: "creators, travel, running and sport", type: "Outfit, Inter", pal: ["#0C1630", "#2B4A86", "#84A8BE", "#C9DAEF", "#FFFFFF"], n: 29 },
  { id: "grid", name: "Grid", tag: "Hairlines, tiny caps, one gigantic word or numeral.", made: "launches, events, design and architecture", type: "Outfit", pal: ["#F1EEE7", "#E4E0D8", "#8E8B85", "#141414"], n: 27 },
  { id: "cutout", name: "Cutout", tag: "One enormous word behind the person, everything else tiny.", made: "creators, fashion and sport, posters", type: "DIN Condensed, Inter", pal: ["#EFE9DD", "#C9BFAE", "#8F887B", "#1B1A17", "#FFFFFF"], n: 28 }
];
var DWELL = { journal: 4700, grid: 4700 }, BASE = 4300;

var stage = root.querySelector(".ae-stage"), chipRow = root.querySelector(".ae-chips");
var chips = [].slice.call(root.querySelectorAll(".ae-chip")), info = root.querySelector(".ae-info");
var slots = [".ae-f", ".ae-m"].map(function (sel) { return { layers: [].slice.call(root.querySelectorAll(sel + " video")), cur: 0 }; });
var still = { layers: [].slice.call(root.querySelectorAll(".ae-s img")), cur: 0 };
var cur = 0, timer = 0, prepT = 0, inView = false, token = 0;

/* a hidden layer never plays (the kit starts every video[data-play] it sees in view) */
slots.forEach(function (s) {
  s.layers.forEach(function (v) {
    v.muted = true;
    v.addEventListener("play", function () { if (!v.classList.contains("on")) v.pause(); });
  });
  s.layers[0]._want = s.layers[0].getAttribute("data-src");
});
still.layers[0]._want = still.layers[0].getAttribute("src");

function play(v) { if (SK.reduced || !inView) return; var p = v.play(); p && p.catch(function () {}); }

/* load a style into the hidden layers so the switch is instant */
function prep(i) {
  var id = STYLES[i].id;
  slots.forEach(function (s, k) {
    var v = s.layers[1 - s.cur], src = P + id + "-" + (k + 1) + ".mp4";
    if (v._want === src) return;
    v._want = src;
    v.poster = P + id + "-" + (k + 1) + ".jpg";
    v.preload = "auto";
    v.src = src;
    v.load();
  });
  var im = still.layers[1 - still.cur], s = P + id + "-s.jpg";
  if (im._want !== s) { im._want = s; im.src = s; }
}

function paintInfo(i) {
  var s = STYLES[i];
  info.querySelector(".ae-count b").textContent = ("0" + (i + 1)).slice(-2);
  info.querySelector(".ae-name").textContent = s.name;
  info.querySelector(".ae-tag").textContent = s.tag;
  info.querySelector(".ae-fact-for dd").textContent = s.made;
  info.querySelector(".ae-fact-type dd").textContent = s.type;
  info.querySelector(".ae-fact-n dd").textContent = s.n + " graphics";
  info.querySelector(".ae-dots").innerHTML = s.pal.map(function (c) { return '<i style="background:' + c + '"></i>'; }).join("");
}

function schedule(mult) {
  clearTimeout(timer); clearTimeout(prepT);
  chips.forEach(function (c) { c.classList.remove("run"); });
  if (!inView || SK.reduced) return;
  var ms = (DWELL[STYLES[cur].id] || BASE) * (mult || 1), c = chips[cur];
  c.style.setProperty("--ae-dwell", ms + "ms");
  void c.offsetWidth;
  c.classList.add("run");
  prepT = setTimeout(function () { prep((cur + 1) % STYLES.length); }, 900);
  timer = setTimeout(function () { go((cur + 1) % STYLES.length); }, ms);
}

function go(i, user) {
  if (i === cur) { if (user) schedule(3); return; }
  var my = ++token;
  prep(i);
  slots.forEach(function (s) {
    var nv = s.layers[1 - s.cur], ov = s.layers[s.cur];
    s.cur = 1 - s.cur;
    try { nv.currentTime = 0; } catch (e) {}
    nv.classList.add("on");
    ov.classList.remove("on");
    play(nv);
    setTimeout(function () { if (!ov.classList.contains("on")) ov.pause(); }, 750);
  });
  still.layers[1 - still.cur].classList.add("on");
  still.layers[still.cur].classList.remove("on");
  still.cur = 1 - still.cur;

  cur = i;
  chips.forEach(function (c, k) { c.classList.toggle("on", k === i); c.setAttribute("aria-pressed", k === i ? "true" : "false"); });
  /* keep the chosen chip in sight when the row scrolls (never scrolls the page) */
  var c = chips[i], max = chipRow.scrollWidth - chipRow.clientWidth;
  if (max > 0) chipRow.scrollTo({ left: Math.max(0, Math.min(max, c.offsetLeft - (chipRow.clientWidth - c.offsetWidth) / 2)), behavior: SK.reduced ? "auto" : "smooth" });
  if (SK.reduced) paintInfo(i);
  else {
    info.classList.add("swap");
    setTimeout(function () { if (my !== token) return; paintInfo(i); info.classList.remove("swap"); }, 260);
  }
  schedule(user ? 3 : 1);
}

chips.forEach(function (c, k) { c.addEventListener("click", function () { go(k, true); }); });

SK.onView(stage, function () {
  inView = true;
  slots.forEach(function (s) { play(s.layers[s.cur]); });
  schedule(1);
}, function () {
  inView = false;
  clearTimeout(timer); clearTimeout(prepT);
  chips.forEach(function (c) { c.classList.remove("run"); });
  slots.forEach(function (s) { s.layers.forEach(function (v) { v.pause(); }); });
}, { ratio: 0.3, threshold: [0, 0.3, 0.6] });
