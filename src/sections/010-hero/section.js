var hero = document.getElementById("hero");
if (!hero) return;
var M = SK.media || {};
function film(re) { return (M.films || []).filter(function (f) { return re.test(f.slug) || re.test(f.title || ""); })[0]; }
var FILMS = { launch: film(/multivitamin/i) || (M.films || [])[0], viral: film(/email.?signature|this.?is/i) || (M.films || [])[1] };

/* What the field asks for, the app recording that answers it (desktop), and the drawn scene that answers it (phones). */
var PROMPTS = [
  { text: "Build me a launch commercial for my company", short: "Make my launch commercial", clip: "launch", scene: 0 },
  { text: "Make the ending hit harder", clip: "note", scene: 1 },
  { text: "Recreate this viral video for my company", short: "Remake this viral video", clip: "viral", scene: 2 },
  { text: "Post all my content across all my channels", short: "Schedule my next 30 days", clip: "post", scene: 3 }
];
var APP_DIR = "assets/media/app/hero-";

/* ---------- the sky: a slow push-in or drift, a new view every few seconds (grain-free wallpapers) ---------- */
(function () {
  var box = hero.querySelector(".hero-bgs"), first = box.querySelector("img"), names = ["volcano-above-clouds", "cumulus-sky", "peaks-in-cloud-sea", "orange-clouds-blue-sky", "lake-tahoe-blue-hour"];
  var urls = [first.currentSrc || first.src].concat(names.map(function (n) { return "assets/media/wallpapers/" + n + ".jpg"; }));
  var MOVES = [
    [{ transform: "scale(1.03)" }, { transform: "scale(1.15)" }],
    [{ transform: "scale(1.12) translate3d(-2.2%, 0, 0)" }, { transform: "scale(1.12) translate3d(2.2%, 0, 0)" }],
    [{ transform: "scale(1.15) translate3d(0, 1.2%, 0)" }, { transform: "scale(1.04) translate3d(0, -0.6%, 0)" }],
    [{ transform: "scale(1.12) translate3d(2.2%, 0, 0)" }, { transform: "scale(1.12) translate3d(-2.2%, 0, 0)" }]
  ];
  var cur = first, i = 0, timer = 0, HOLD = 4600;
  function move(img, k) { if (img.animate && !SK.reduced) img.animate(MOVES[k % MOVES.length], { duration: HOLD + 2600, easing: "linear", fill: "both" }); }
  move(first, 0);
  if (SK.reduced) return;
  function next() {
    i = (i + 1) % urls.length;
    var img = new Image();
    img.className = "hero-bg"; img.alt = ""; img.decoding = "async";
    img.onload = function () {
      box.appendChild(img);
      move(img, i);
      requestAnimationFrame(function () { requestAnimationFrame(function () { img.classList.add("on"); }); });
      var old = cur; cur = img;
      setTimeout(function () { var host = old.closest("picture") || old; host.parentNode && host.parentNode.removeChild(host); }, 2000);
    };
    img.src = urls[i];
  }
  SK.onView(hero, function () { clearInterval(timer); timer = setInterval(next, HOLD); }, function () { clearInterval(timer); });
})();

var rig = hero.querySelector(".hero-rig"), stage = hero.querySelector(".hero-stage"), ask = hero.querySelector(".hero-ask");
var scenes = [].slice.call(stage.querySelectorAll(".hs")), vids = [].slice.call(stage.querySelectorAll(".ha"));
var clock = document.getElementById("hero-clock"), clockT = 0, countEl = document.getElementById("hs-count");

/* ---------- drawn scenes (phones, and the fallback when a recording is missing) ---------- */
hero.querySelectorAll("video[data-hero-film]").forEach(function (v) {
  var f = FILMS[v.getAttribute("data-hero-film")];
  if (!f) return;
  v.poster = f.poster;
  v.setAttribute("data-src", f.loop);
  v.parentNode.style.backgroundImage = "url(" + f.poster + ")";
});
var grid = document.getElementById("hs-grid"), thumbs = (M.thumbs || []).map(function (t) { return t.file || t; });
var skip = { 4: 1, 11: 1, 17: 1, 23: 1, 27: 1 };
for (var d = 0; d < 30; d++) {
  var c = document.createElement("div");
  c.className = "hs-cell";
  c.innerHTML = "<span>" + (d + 1) + "</span>";
  if (!skip[d] && thumbs.length) {
    var im = document.createElement("img");
    im.alt = ""; im.decoding = "async";
    im.setAttribute("data-lazy", thumbs[d % thumbs.length]);
    c.appendChild(im);
    c.setAttribute("data-at", String(600 + d * 105));
    c.setAttribute("data-post", "1");
  }
  grid.appendChild(c);
}
var sceneTok = 0;
function playScene(i) {
  var my = ++sceneTok, s = scenes[i];
  scenes.forEach(function (x, j) {
    x.classList.toggle("live", j === i);
    if (j !== i) x.querySelectorAll("video").forEach(function (v) { v.pause(); });
  });
  s.querySelectorAll("[data-at]").forEach(function (el) {
    el.classList.remove("on");
    if (el.hasAttribute("data-swap")) el.textContent = el._orig || (el._orig = el.textContent);
  });
  s.querySelectorAll("img[data-lazy]").forEach(function (im) { im.src = im.getAttribute("data-lazy"); im.removeAttribute("data-lazy"); });
  s.querySelectorAll("video").forEach(function (v) {
    if (!v.src && v.getAttribute("data-src")) v.src = v.getAttribute("data-src");
    try { v.currentTime = 0; } catch (e) {}
    if (!SK.reduced) { var p = v.play(); p && p.catch(function () {}); }
  });
  var n = 0;
  if (countEl && s.classList.contains("hs-cal")) countEl.textContent = "0";
  s.querySelectorAll("[data-at]").forEach(function (el) {
    setTimeout(function () {
      if (my !== sceneTok) return;
      el.classList.add("on");
      if (el.hasAttribute("data-swap")) el.textContent = el.getAttribute("data-swap");
      if (el.hasAttribute("data-post") && countEl) countEl.textContent = String(++n);
    }, SK.reduced ? 0 : +el.getAttribute("data-at"));
  });
  return SK.sleep(+s.getAttribute("data-dur") || 6000);
}

/* ---------- the real app, recorded (desktop) ---------- */
var have = {}, appMode = false, cur = -1;
function clipURL(name) { return APP_DIR + name + (stage.clientWidth * (window.devicePixelRatio || 1) < 1500 ? "-1280" : "") + ".mp4"; }
function showClip(name, alive) {
  return new Promise(function (done) {
    var next = vids[(cur + 1) % 2], prev = vids[cur < 0 ? 1 : cur % 2], finished = false;
    cur++;
    function end() { if (finished) return; finished = true; next.removeEventListener("ended", end); clearTimeout(guard); done(); }
    var guard = setTimeout(end, 16000);
    next.src = clipURL(name);
    next.addEventListener("ended", end);
    next.addEventListener("error", end, { once: true });
    next.addEventListener("canplay", function () {
      if (!alive()) return end();
      next.classList.add("on"); prev.classList.remove("on");
      var p = next.play(); p && p.catch(end);
      setTimeout(function () { prev.pause(); }, 700);
    }, { once: true });
    next.load();
  });
}
function probe(name) {
  return fetch(APP_DIR + name + "-1280.mp4", { method: "HEAD" }).then(function (r) { have[name] = r.ok; }).catch(function () { have[name] = false; });
}

/* ---------- the loop ---------- */
var field = SK.promptField(document.getElementById("hero-field"), { placeholder: "What should we make?", scale: SK.mobile() ? 1 : 1.3, auto: false });
function tick(start) {
  clearInterval(clockT);
  clockT = setInterval(function () { var s = Math.floor((Date.now() - start) / 1000); clock.textContent = "00:" + ("0" + (s % 60)).slice(-2); }, 250);
}
var run = 0, opened = false;
async function loop(my) {
  var alive = function () { return my === run; };
  if (appMode && have.open && !opened) {
    opened = true;
    await showClip("open", alive);
    if (!alive()) return;
  }
  var list = PROMPTS.filter(function (p) { return !appMode || have[p.clip]; });
  if (!list.length) return;
  for (var i = 0; alive(); i++) {
    var p = list[i % list.length];
    await SK.sleep(i ? 600 : 500);
    if (!alive()) break;
    if (!(await field.type(SK.mobile() && p.short ? p.short : p.text))) break;
    await SK.sleep(420);
    if (!alive()) break;
    field.send();
    ask.setAttribute("data-busy", "");
    tick(Date.now());
    setTimeout(function () { if (alive()) field.state("idle"); }, 1700);
    await (appMode ? showClip(p.clip, alive) : playScene(p.scene));
    clearInterval(clockT);
    ask.removeAttribute("data-busy");
    if (!alive()) break;
    await SK.sleep(appMode ? 500 : 0);
    field.state("idle").clear();
  }
}
function begin() {
  SK.onView(rig, function () { loop(++run); }, function () {
    run++; sceneTok++; field.stop(); field.state("idle").clear(); clearInterval(clockT); ask.removeAttribute("data-busy");
    stage.querySelectorAll("video").forEach(function (v) { v.pause(); });
  }, { ratio: 0.2, threshold: [0, 0.2, 0.5] });
}
if (SK.mobile() || SK.reduced) begin();
else (function () {
  var names = ["open"].concat(PROMPTS.map(function (p) { return p.clip; })), listed = M.app ? JSON.stringify(M.app) : "";
  if (listed) { names.forEach(function (n) { have[n] = listed.indexOf("hero-" + n + "-1280.mp4") >= 0; }); return Promise.resolve(); }
  return Promise.all(names.map(probe));
})().then(function () {
  appMode = !!(have.open || PROMPTS.some(function (p) { return have[p.clip]; }));
  if (appMode) {
    stage.classList.add("app");
    stage.querySelector(".hero-app").style.backgroundImage = "url(" + APP_DIR + "launch.jpg)";
  }
  begin();
});
