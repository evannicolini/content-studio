var root = document.getElementById("views");
if (!root) return;
/* the picker's own order: the lone cypress first, then the peak above the clouds; two mountain views at most, the rest coast, sky and forest */
var ORDER = ["pebble-beach-cypress", "volcano-above-clouds", "na-pali-coast", "maui-palm-bay", "big-sur-coast", "cumulus-sky", "rockies-ember-peaks", "misty-fir-forest", "orange-clouds-blue-sky", "above-the-clouds"];
var ALL = SK.media.wallpapers || [];
var WALLS = ORDER.map(function (s) { return ALL.filter(function (w) { return w.slug === s; })[0]; }).filter(Boolean);
if (!WALLS.length) return;

/* where each wallpaper looks best in a tall phone frame, and the app's own id for it (the corner tag is keyed on that) */
var MORE = {
  "cumulus-sky": { id: "sky" }, "volcano-above-clouds": { id: "volcano" }, "peaks-in-cloud-sea": { id: "cloudsea" },
  "half-dome-long-exposure": { id: "halfdome" }, "big-sur-coast": { id: "bigsur" }, "pebble-beach-cypress": { id: "pebble" },
  "alpine-lake-mirror": { id: "lakemirror" }, "rockies-ember-peaks": { id: "ember" }, "lake-tahoe-blue-hour": { id: "tahoeblue" }, "na-pali-coast": { id: "napali" }, "maui-palm-bay": { id: "maui" }
};
/* the same table and fallback the app uses for its corner coordinates */
var PLACE = { pebble: [36.5687, -121.9654, 24], bigsur: [36.2704, -121.8081, 286], tahoeblue: [39.0968, -120.0324, 1897], halfdome: [37.7459, -119.5332, 2694], ember: [51.3271, -116.1856, 2710], napali: [22.1757, -159.6431, 12], maui: [20.7159, -156.4470, 3] };
function geo(id) {
  var seed = String(id || "studio").split("").reduce(function (a, c) { return (a * 31 + c.charCodeAt(0)) % 100003; }, 7);
  var pl = PLACE[id] || [28 + (seed % 3400) / 100, -(64 + ((seed * 7) % 6000) / 100), 40 + ((seed * 13) % 2900)];
  var deg = function (v, pos, neg) { return Math.abs(v).toFixed(4) + "° " + (v >= 0 ? pos : neg); };
  return [deg(pl[0], "N", "S"), deg(pl[1], "E", "W"), "Elev " + ("000" + pl[2]).slice(-4) + " m"];
}

var layers = [].slice.call(root.querySelectorAll(".vw-img")), cur = 0, idx = 0, tk = 0, picked = false, inView = false, timer = 0, loaded = {};
var chipsBox = root.querySelector(".vw-chips"), pillName = root.querySelector(".vw-pill-name"), pillTh = root.querySelector(".vw-pill-th");
var lat = root.querySelector(".vw-lat"), lon = root.querySelector(".vw-lon"), elev = root.querySelector(".vw-elev"), dateEl = root.querySelector(".vw-date");
function chipSrc(w) { return "assets/media/views/" + w.slug + "-chip.jpg"; }
function fullSrc(w) { return SK.mobile() ? "assets/media/views/" + w.slug + "-m.jpg" : w.file; }
function load(url) {
  return loaded[url] || (loaded[url] = new Promise(function (res) { var im = new Image(); im.onload = function () { (im.decode ? im.decode().catch(function () {}) : Promise.resolve()).then(function () { res(true); }); }; im.onerror = function () { res(false); }; im.src = url; }));
}

/* today's date, the way the app writes it */
try { dateEl.textContent = new Date().toLocaleDateString("en-US", { weekday: "long" }) + " · " + new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" }); } catch (e) {}

var chips = WALLS.map(function (w, i) {
  var b = document.createElement("button");
  b.type = "button"; b.className = "vw-chip"; b.setAttribute("aria-pressed", "false");
  b.innerHTML = '<img src="' + chipSrc(w) + '" alt="" width="96" height="96" loading="lazy" decoding="async"><span></span>';
  b.querySelector("span").textContent = w.name;
  b.addEventListener("click", function () { picked = true; clearTimeout(timer); show(i); });
  chipsBox.appendChild(b);
  return b;
});

function label(i) {
  var w = WALLS[i], g = geo((MORE[w.slug] || {}).id || w.slug);
  chips.forEach(function (c, j) { c.classList.toggle("on", j === i); c.setAttribute("aria-pressed", j === i ? "true" : "false"); });
  pillName.textContent = w.name; pillTh.src = chipSrc(w);
  lat.textContent = g[0]; lon.textContent = g[1]; elev.textContent = g[2];
  if (SK.mobile() && chips[i].scrollIntoView && picked) chips[i].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
}
function show(i) {
  var my = ++tk, w = WALLS[(i + WALLS.length) % WALLS.length], url = fullSrc(w);
  idx = (i + WALLS.length) % WALLS.length;
  label(idx);
  return load(url).then(function (ok) {
    if (my !== tk || !ok) return;
    var next = layers[cur ^ 1], prev = layers[cur];
    next.classList.remove("on");
    next.src = url;
    if (!SK.mobile() && w.focus) next.style.objectPosition = w.focus; else next.style.objectPosition = "";
    void next.offsetWidth;                        /* restart the drift on the incoming picture */
    next.classList.add("on", "top"); prev.classList.remove("top");
    root.style.setProperty("--tint", w.tint_rgb ? String(w.tint_rgb).replace(/,/g, ", ") : "15, 22, 31");
    cur ^= 1;
    setTimeout(function () { if (my === tk) prev.classList.remove("on"); }, 1600);
  });
}
/* it changes by itself until the visitor picks one */
function auto() {
  clearTimeout(timer);
  if (picked || !inView || SK.reduced) return;
  load(fullSrc(WALLS[(idx + 1) % WALLS.length]));
  timer = setTimeout(function () { show(idx + 1).then(auto); }, 5200);
}
root.querySelectorAll(".vw-arrow").forEach(function (b) {
  b.addEventListener("click", function () { picked = true; clearTimeout(timer); show(idx + +b.getAttribute("data-dir")); });
});

label(0);
var started = false;
SK.onView(root, function () { if (!started) { started = true; show(0); } }, null, { margin: "600px 0px", once: true });
SK.onView(root, function () { inView = true; root.classList.add("live"); auto(); }, function () { inView = false; root.classList.remove("live"); clearTimeout(timer); }, { ratio: 0.25, threshold: [0, 0.25, 0.6] });
