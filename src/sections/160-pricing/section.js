var root = document.getElementById("pricing");
if (!root) return;
var form = root.querySelector(".pr-form"), input = root.querySelector("#pr-code"), field = root.querySelector(".pr-field"), msg = root.querySelector(".pr-msg");
var open = root.querySelector(".pr-open"), dl = root.querySelector("[data-dl]"), fine = root.querySelector("[data-pr-fine]"), sub = root.querySelector("[data-pr-sub]");
var KEY = "studio-invite";
function norm(s) { return String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); }
function bytes(b64) { var s = atob(b64), u = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
var gate = null;
/* the download link is stored encrypted; only the right code turns it back into a link */
async function tryCode(code) {
  if (!window.crypto || !crypto.subtle) throw new Error("nocrypto");
  if (!gate) gate = await (await fetch("assets/gate.json", { cache: "no-store" })).json();
  var base = await crypto.subtle.importKey("raw", new TextEncoder().encode(norm(code)), "PBKDF2", false, ["deriveKey"]);
  var key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: bytes(gate.salt), iterations: gate.it, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  var plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes(gate.iv) }, key, bytes(gate.ct));
  return JSON.parse(new TextDecoder().decode(plain));
}
function unlocked(info, start) {
  SK.dl = info.url;
  dl.href = info.url;
  form.hidden = true; open.hidden = false;
  sub.textContent = SK.mobile() ? "You're in." : "You're in. Your download is ready.";
  fine.textContent = "Apple Silicon · macOS 13 or later" + (info.size ? " · " + (+info.size >= 1000 ? (info.size / 1024).toFixed(1) + " GB" : info.size + " MB") : "");
  document.querySelectorAll("[data-download] span").forEach(function (s) { if (/download/i.test(s.textContent) && s.closest(".nav")) s.textContent = "Download"; });
  if (start && !SK.mobile()) setTimeout(function () { window.location.href = info.url; }, 500);
}
form.addEventListener("submit", async function (e) {
  e.preventDefault();
  var code = input.value;
  if (!norm(code)) { input.focus(); return; }
  msg.textContent = "Checking…";
  try {
    var info = await tryCode(code);
    try { localStorage.setItem(KEY, norm(code)); } catch (err) {}
    msg.textContent = "";
    unlocked(info, true);
  } catch (err) {
    field.classList.remove("bad"); void field.offsetWidth; field.classList.add("bad");
    msg.textContent = err && err.message === "nocrypto" ? "This browser can't check codes. Try Safari or Chrome." : "That code didn't work. Check it and try again.";
    input.select();
  }
});
input.addEventListener("input", function () { field.classList.remove("bad"); msg.textContent = ""; });
var saved = null;
try { saved = localStorage.getItem(KEY); } catch (err) {}
/* a link sent from a phone ("Send to my Mac") carries the code in the hash: unlock with it (no automatic download), go to Pricing,
   then take the code out of the address bar */
var shared = /[#&]invite=([^&]+)/.exec(location.hash);
if (shared) {
  var sc = ""; try { sc = decodeURIComponent(shared[1]); } catch (e) {}
  var clean = function () { try { history.replaceState(null, "", location.pathname + location.search + "#pricing"); } catch (e) {} };
  tryCode(sc).then(function (info) {
    try { localStorage.setItem(KEY, norm(sc)); } catch (err) {}
    unlocked(info, false);
  }).catch(function () {}).then(function () {
    clean();
    setTimeout(function () { SK.fullRender && SK.fullRender(); root.scrollIntoView({ behavior: "auto", block: "start" }); }, 300);
  });
} else if (saved) tryCode(saved).then(function (info) { unlocked(info, false); }).catch(function () {});

/* ---------- the anchor: the bars trim in once, when it comes into view: the team's runs the whole track, then Studio's lands as a sliver ---------- */
var anchor = root.querySelector(".pd-anchor");
if (anchor) {
  var team = anchor.querySelector(".pd-bar.team"), studio = anchor.querySelector(".pd-bar.studio"), played = false;
  if (SK.reduced) { team.classList.add("on"); studio.classList.add("on"); }
  else SK.onView(anchor, function () {
    if (played) return; played = true;
    setTimeout(function () { team.classList.add("on"); }, 300);
    setTimeout(function () { studio.classList.add("on"); }, 1900);
  }, null, { ratio: 0.35, threshold: [0, 0.35, 0.7] });
}

/* ---------- Monthly | Yearly: every price in the section follows the switch. The text for both periods comes from the
   app's pricing.json, worked out at build time (pricing.py); nothing is calculated here. ---------- */
var PR = window.SK_PRICES, swapT = 0;
function setPeriod(p) {
  if (!PR || !PR[p] || root.getAttribute("data-period") === p) return;
  var v = PR[p];
  root.setAttribute("data-period", p);
  root.querySelectorAll(".pr-period [data-period]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-period") === p)); });
  clearTimeout(swapT);
  if (!SK.reduced) root.classList.add("swap");
  swapT = setTimeout(function () {
    root.querySelectorAll("[data-pv]").forEach(function (el) { var k = el.getAttribute("data-pv"); if (k in v) el.textContent = v[k]; });
    root.querySelectorAll("[data-pv-href]").forEach(function (el) { var u = v[el.getAttribute("data-pv-href")]; if (u) el.href = u; });
    var bar = root.querySelector("[data-pv-bar]");
    if (bar) bar.style.setProperty("--bar", v.bar);
    root.classList.remove("swap");
  }, SK.reduced ? 0 : 180);
}
root.querySelectorAll(".pr-period [data-period]").forEach(function (b) {
  b.setAttribute("aria-pressed", String(b.getAttribute("data-period") === root.getAttribute("data-period")));
  b.addEventListener("click", function () { setPeriod(b.getAttribute("data-period")); });
});

/* ---------- Kayla on each plan ("Why Pro?"): one clip per plan, shared by the panel and the cards. A pill shows only once its clip's
   waveform (<clip>.json next to the mp3) has loaded, so a clip that is not recorded yet never shows a dead button. ---------- */
var clips = {};
root.querySelectorAll(".pd-k[data-clip]").forEach(function (btn) {
  var src = btn.getAttribute("data-clip"), c = clips[src];
  if (!c) {
    c = clips[src] = { btns: [], audio: null, peaks: null };
    fetch(src.replace(/\.mp3$/, ".json")).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (!j || !j.peaks) return;
      c.peaks = j.peaks;
      c.btns.forEach(function (b) { drawWave(b, j.peaks); b.hidden = false; });
    }).catch(function () {});
  }
  c.btns.push(btn);
  btn.addEventListener("click", function () {
    if (!c.audio) {
      var a = c.audio = new Audio(src);
      a.preload = "auto";
      (SK.audios || []).push(a);
      a.addEventListener("play", function () { (SK.audios || []).forEach(function (o) { if (o !== a) o.pause(); }); c.btns.forEach(function (b) { b.classList.add("playing"); }); document.documentElement.classList.add("vo-heard"); });
      a.addEventListener("pause", function () { c.btns.forEach(function (b) { b.classList.remove("playing"); }); });
      a.addEventListener("ended", function () { a.currentTime = 0; paintWave(c); });
      a.addEventListener("timeupdate", function () { paintWave(c); });
    }
    if (c.audio.paused) { var q = c.audio.play(); q && q.catch(function () {}); } else c.audio.pause();
  });
});
function drawWave(btn, peaks) {
  var svg = btn.querySelector("svg.wv"), n = 56, w = 222 / n, h = "";
  for (var i = 0; i < n; i++) {
    var pk = peaks[Math.floor((i / n) * peaks.length)] || 0, bh = Math.max(3, Math.round((0.18 + 0.82 * pk) * 16 * 10) / 10);
    h += '<rect x="' + (i * w).toFixed(1) + '" y="' + ((16 - bh) / 2).toFixed(1) + '" width="' + (w * 0.5).toFixed(1) + '" height="' + bh + '" rx="1"></rect>';
  }
  svg.innerHTML = h;
}
function paintWave(c) {
  var a = c.audio, p = a && a.duration ? a.currentTime / a.duration : 0;
  c.btns.forEach(function (b) { var r = b.querySelectorAll("svg.wv rect"), n = r.length; for (var i = 0; i < n; i++) r[i].classList.toggle("on", i / n < p); });
}

/* ---------- scroll focus, per group (the site's focusSections maths, which skips this section): the head with the breakdown; the
   switch, the plans and the trial line; the founders card; the whole bill. A group is measured from its first top to its last bottom
   and fades as one: dim and soft at the edge of the screen, full strength inside. Opacity floor 15%, up to 8px blur (fine pointers). ---------- */
(function () {
  if (SK.reduced) return;
  var groups = {}, blur = !SK.mobile() && matchMedia("(pointer: fine)").matches, queued = false;
  root.querySelectorAll("[data-pd-group]").forEach(function (el) { var g = el.getAttribute("data-pd-group"); (groups[g] = groups[g] || []).push(el); });
  var keys = Object.keys(groups).sort();
  var clamp = function (x) { return Math.min(1, Math.max(0, x)); };
  function paint() {
    queued = false;
    var vh = window.innerHeight || 1, sr = root.getBoundingClientRect();
    if (sr.bottom < -vh || sr.top > vh * 2) return;   /* Pricing a screen or more away: nothing to fade, and nothing in it is measured
                                                         (in the lite tier it isn't laid out at all until it's near: measuring would) */
    keys.forEach(function (k, i) {
      var els = groups[k].filter(function (e) { return e.offsetParent !== null; });
      if (!els.length) return;
      var top = Math.min.apply(null, els.map(function (e) { return e.getBoundingClientRect().top; }));
      var bottom = Math.max.apply(null, els.map(function (e) { return e.getBoundingClientRect().bottom; }));
      if (bottom < -vh || top > vh * 2) return;
      var enter = i === 0 ? 1 : clamp((vh - top) / (0.45 * vh)), leave = clamp((0.45 * vh - bottom) / (0.45 * vh)), v = Math.min(enter, 1 - leave);
      els.forEach(function (el) {
        if (v >= 0.999) { if (el._dim) { el._dim = false; el.style.opacity = ""; el.style.filter = ""; } return; }
        el._dim = true;
        el.style.opacity = (0.15 + 0.85 * v).toFixed(3);
        if (blur) el.style.filter = "blur(" + ((1 - v) * 8).toFixed(2) + "px)";
      });
    });
  }
  function req() { if (!queued) { queued = true; requestAnimationFrame(paint); } }
  window.addEventListener("scroll", req, { passive: true });
  window.addEventListener("resize", req);
  paint();
})();

/* ---------- the floating Kayla player (.kp) slides away while Pricing is in view, unless it is playing (CSS: html.kp-away) ---------- */
SK.onView(root, function () { document.documentElement.classList.add("kp-away"); }, function () { document.documentElement.classList.remove("kp-away"); });
