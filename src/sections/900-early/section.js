/* 900 early: early access sign-ups, built like the app's first launch (section.html, section.css).
   While sign-ups are on: every Download button (nav, hero, steps) says "Get early access", the plans' "Coming soon" too, a card above the
   plans offers it, a floating button follows you down the page, and all of them open the sign-up. So does any link ending in #early-access
   (the Instagram DM link, and every friend's ?ref= link; both skip the Enter site gate).
   The sign-up: your name (so the rest is yours), what you do (pick all that fit; "Something else" asks what), how many brands, Claude yet,
   then where to send the invite. Kayla says each step (assets/audio/wl-*.mp3); the app's own sounds answer the pointer (assets/sfx);
   both follow the speaker button. Beside each question a piece of Studio answers it, live. Then "You're in": the 3D pass, your place,
   your own link (each friend who joins moves you up).
   Where sign-ups go (src/waitlist.json, inlined by build.py): "api" (the waitlist worker in worker/: places and referrals), else
   "brevo_form" (no places), else "webhook" (JSON). With none, the live site stays on Download; localhost and ?early show the flow, and on
   localhost a sign-up is answered with a made-up place. ?api=<url> on localhost points it at a local worker. */
var cfg = Object.assign({}, window.SK_WAITLIST || {});
var Q = new URLSearchParams(location.search), H = new URLSearchParams(location.hash.replace(/^#[^&]*&?/, ""));
var local = /^(127\.0\.0\.1|localhost|\[::1\])$/.test(location.hostname);
if (local) cfg.api = Q.get("api") || "";   /* review builds on this Mac never reach the real list: a made-up place, nothing sent */
var API = (cfg.api || "").replace(/\/+$/, "");
var OFFSET = Math.max(0, parseInt(cfg.count_offset, 10) || 0);   /* people already waiting who are not in the Worker yet (waitlist.json) */
function place(r) { return r.front ? r.position : r.position + OFFSET; }   /* the front of the line is ahead of them too */
var wired = !!(API || cfg.brevo_form || cfg.webhook);
var sheet = document.getElementById("early-access");
if (!sheet) return;
if (!(wired || local || /[?&]early(=|&|$)/.test(location.search))) { sheet.remove(); return; }
SK.early = true;
var html = document.documentElement, KEY = "studio-early", HASH = "#early-access", DEEP = /^#early(-access)?(&|$)/;
if (local && Q.has("restart")) try { localStorage.removeItem(KEY); sessionStorage.removeItem("studio-ref"); } catch (e) {}   /* the Hub's Restart */
var STAR = '<svg class="ea-ic" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 .9c.5 4.1 2.9 6.6 7.1 7.1-4.2.5-6.6 2.9-7.1 7.1C7.5 10.9 5 8.5.9 8 5 7.5 7.5 5 8 .9Z"/></svg>';
var ARROW = '<span class="go"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9.5M8.5 4l4 4-4 4"/></svg></span>';
var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
var M = "assets/media/", fine = matchMedia("(pointer: fine)").matches;

/* ---------- a friend's link: ?ref=CODE (kept for this visit) ---------- */
var REF = (Q.get("ref") || H.get("ref") || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 16);
try { if (REF) sessionStorage.setItem("studio-ref", REF); else REF = sessionStorage.getItem("studio-ref") || ""; } catch (e) {}

/* ---------- the buttons ---------- */
document.querySelectorAll("[data-download]").forEach(function (b) {
  b.removeAttribute("data-download");
  var where = b.closest(".nav") ? "nav" : b.closest("#hero") ? "hero" : "steps";
  b.setAttribute("data-early", where);
  b.setAttribute("href", HASH);
  var svg = b.querySelector(":scope > svg");
  if (svg) svg.outerHTML = STAR; else b.insertAdjacentHTML("afterbegin", STAR);
  var sp = b.querySelector(":scope > span:not([data-beam-bloom])");
  if (sp) sp.textContent = "Get early access";
  if (where === "steps") { b.className = ""; SK.gx(b, { hot: true, paper: !!b.closest(".on-paper") }); b.insertAdjacentHTML("beforeend", ARROW); }
  var help = b.parentNode && b.parentNode.querySelector("[data-send-help]");
  if (help && !help.closest(".pr-open")) { help.removeAttribute("data-send-help"); help.textContent = "14 days of everything, free. Studio is for Mac."; }
});
document.querySelectorAll(".pd-btn.soon").forEach(function (s) {
  var head = s.parentNode, nm = head.querySelector(".nmx"), plan = s.getAttribute("data-plan") || (nm ? nm.textContent.trim().toLowerCase() : "");
  var b = document.createElement("button");
  b.type = "button"; b.className = "pd-btn" + (s.classList.contains("best") || head.querySelector(".pd-tag") ? " go" : "");
  b.setAttribute("data-early", "plan " + plan);
  b.innerHTML = "Get early access " + STAR;
  s.replaceWith(b);
});
document.querySelectorAll("[data-early-band]").forEach(function (el) {
  el.hidden = false;
  var b = el.querySelector(".pd-ebtn");
  if (b) { var ic = b.querySelector("svg"); if (ic) ic.remove(); b.className = "pd-ebtn"; SK.gx(b, { hot: true }); b.insertAdjacentHTML("beforeend", ARROW); }
});

/* ---------- the floating Get early access: once the hero's button is gone, until Pricing or the footer ---------- */
(function () {
  var f = document.createElement("a");
  f.className = "ea-float away"; f.href = HASH; f.setAttribute("data-early", "float");
  f.innerHTML = STAR + "<span>Get early access</span>" + ARROW;
  document.body.appendChild(f);
  SK.gx(f, { hot: true });
  var seen = { hero: true, pricing: false, foot: false };
  function set() { var on = !seen.hero && !seen.pricing && !seen.foot; f.classList.toggle("away", !on); html.classList.toggle("ea-on", on); }
  [["hero", document.getElementById("hero")], ["pricing", document.getElementById("pricing")], ["foot", document.querySelector(".foot")]].forEach(function (x) {
    if (!x[1]) { seen[x[0]] = false; return; }
    SK.onView(x[1], function () { seen[x[0]] = true; set(); }, function () { seen[x[0]] = false; set(); }, { margin: x[0] === "hero" ? "-30% 0px 0px 0px" : "0px 0px -18% 0px" });
  });
  set();
})();

/* ---------- sound: the app's own takes (Studio_App first/sfx), quiet, one per thing that happens; and Kayla. The speaker button covers both. ---------- */
var SOUND = true;
try { SOUND = localStorage.getItem("studio-wl-sound") !== "off"; } catch (e) {}
var SFX = (function () {
  /* one audio context for the whole page, made at load (it starts paused until the first click or key); the sounds and Kayla's intro
     are fetched and decoded right away, so the first click can play her at once */
  var AC = window.AudioContext || window.webkitAudioContext, ctx = null, buf = {}, last = {};
  /* the Studio app's own UI sounds, the same files it plays (Studio_App web/audio/ui): hover, press, the Ask sheet opening (every
     scene change here), send, done. They carry their own levels, so they play at 1 like in the app. */
  var FILE = { tick: "app/hover.wav", click: "app/press.wav", move: "app/ask-open.mp3", ask: "app/ask-open.mp3", send: "app/send.mp3", done: "app/done.mp3", key: "key.wav", land: "land.wav" };
  var GAIN = { tick: 1, click: 1, move: .8, ask: 1, send: 1, done: 1, key: .26, land: .45 };
  try { if (AC) ctx = new AC(); } catch (e) {}
  function load(n, url) { if (!ctx) return; fetch(url).then(function (r) { return r.ok ? r.arrayBuffer() : null; }).then(function (d) { if (d) ctx.decodeAudioData(d, function (b) { buf[n] = b; }, function () {}); }).catch(function () {}); }
  Object.keys(FILE).forEach(function (n) { load(n, "assets/sfx/" + FILE[n]); });
  load("bed", "assets/audio/bed-tides.mp3");
  ["intro", "name", "roles", "brands", "claude", "invite", "in", "share", "b1", "b2", "b4", "cpro", "cfree", "cno", "confirm"].forEach(function (k) { load("vo:" + k, "assets/audio/wl-" + k + ".mp3"); });   /* every Kayla line decoded ahead: she can answer a pick at once */
  function wake() { if (ctx && ctx.state === "suspended") { try { ctx.resume(); } catch (e) {} } }
  function play(n, o) {
    o = o || {};
    if (!SOUND || !ctx || !buf[n] || SK.reduced && n === "tick") return;
    var now = performance.now(), gap = { tick: 60, key: 55 }[n] || 0;
    if (gap && last[n] && now - last[n] < gap) return;
    last[n] = now;
    var s = ctx.createBufferSource(), g = ctx.createGain();
    s.buffer = buf[n]; s.playbackRate.value = o.rate || (n === "key" || n === "tick" ? .94 + Math.random() * .12 : 1);
    g.gain.value = (GAIN[n] || .4) * (o.gain || 1);
    if (o.pan && ctx.createStereoPanner) { var p = ctx.createStereoPanner(); p.pan.value = o.pan; g.connect(p); p.connect(ctx.destination); } else g.connect(ctx.destination);
    s.connect(g); s.start();
  }
  /* a voice line from a decoded buffer: starts now, inside the click (no network, no gap); null if it isn't ready */
  function voice(k, onend) {
    var b = buf["vo:" + k]; if (!ctx || !b) return null;
    var s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = b; g.gain.value = 1; s.connect(g); g.connect(ctx.destination);
    var t0 = ctx.currentTime, stopped = false; s.onended = function () { if (!stopped) onend && onend(); }; s.start();
    return { dur: b.duration, at: function () { return Math.max(0, ctx.currentTime - t0); }, stop: function () { stopped = true; try { s.stop(); } catch (e) {} } };
  }
  function live() { var ua = navigator.userActivation; return !!ctx && (ctx.state === "running" || !ua || ua.isActive); }   /* a click or key is happening now (or already happened) */
  /* the music bed (Theatre of Delays, "Tides", a seamless 97 s loop at about -24 LUFS): it fades in on the first click, sits about
     10 dB lower while Kayla talks (300 ms ramps), swells a little on You're in, and fades out when the sheet closes */
  var bed = (function () {
    var src = null, g = null, duckOn = false, swellT = 0, swellOn = false, BASE = .9;
    function level() { return BASE * (duckOn ? .316 : 1) * (swellOn ? 1.45 : 1); }
    function to(v, sec) { if (!g) return; var t = ctx.currentTime; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(v, t + sec); }
    return {
      start: function () {
        if (!SOUND || !ctx || !buf.bed || src) return;
        g = ctx.createGain(); g.gain.value = 0; g.connect(ctx.destination);
        src = ctx.createBufferSource(); src.buffer = buf.bed; src.loop = true; src.loopStart = 0; src.loopEnd = buf.bed.duration; src.connect(g); src.start();
        to(level(), 1.5);
      },
      duck: function (on) { duckOn = !!on; to(level(), .3); },
      swell: function () { swellOn = true; to(level(), 1.2); clearTimeout(swellT); swellT = setTimeout(function () { swellOn = false; to(level(), 2.5); }, 4200); },
      stop: function (sec) { if (!src) return; var s0 = src; to(0, sec == null ? 1.2 : sec); src = null; setTimeout(function () { try { s0.stop(); } catch (e) {} }, ((sec == null ? 1.2 : sec) + .1) * 1000); }
    };
  })();
  return { wake: wake, play: play, voice: voice, live: live, bed: bed, has: function (k) { return !!buf["vo:" + k]; } };
})();

/* Kayla, inside the sign-up: one line per step, her face and her voice moving, the words as she says them. Tap her to hear it again. */
var KAY = (function () {
  var LINES = {
    intro: "Welcome to Studio. The best work of your life is still ahead of you... and it starts right here. So, what should I call you?",
    name: "First things first... what should I call you?",
    roles: "Nice to meet you. So, what do you do? Pick everything that fits, and Studio shapes itself around you.",
    brands: "And how many brands are you making content for? Each one gets its own look, its own voice, its own library.",
    claude: "Studio runs on Claude. Do you use it yet? If not, that's totally fine. We'll set it up together.",
    invite: "Last thing. Where should we send your invite? Add your number too, if you'd like a text the moment it's ready.",
    in: "You're in. Welcome to Studio. When your invite lands, you get fourteen days of everything, free. I can't wait to see what you make.",
    share: "Want to skip the line? Get three friends on the list... and you all move to the front. Together.",
    /* her answers to a pick (single-choice steps): they cut in, and the last pick wins */
    b1: "One brand. All in. Love that.", b2: "Two or three. Studio keeps every one of them looking like itself.", b4: "Four or more? You're exactly who we built this for.",
    cpro: "Perfect. You're already set.", cfree: "The free plan is a great place to start.", cno: "No problem. We'll walk you through it.",
    confirm: "Check your email. I just sent you a code... pop it in here to lock in your spot."
  };
  var UNRECORDED = {};   /* a line with no voice file yet: she shows the words and stays quiet */
  var REACT = { b1: 1, b2: 1, b4: 1, cpro: 1, cfree: 1, cno: 1 }, reacting = false;
  var pill = sheet.querySelector("[data-wl-kay]"), cap = sheet.querySelector("[data-wl-kt]"), kw = sheet.querySelector("[data-wl-kw]"), a = new Audio(), queue = [], cur = null, blocked = false, tok = 0, dur = {}, peaks = {}, vo = null;
  a.preload = "auto";
  Object.keys(LINES).forEach(function (k) { if (!UNRECORDED[k]) fetch("assets/audio/wl-" + k + ".json").then(function (r) { return r.json(); }).then(function (j) { dur[k] = j.duration; peaks[k] = j.peaks; }).catch(function () {}); });
  function wave(k) {
    var p = peaks[k] || [], n = 34, out = "";
    for (var i = 0; i < n; i++) { var v = p.length ? p[Math.floor(i * p.length / n)] : .3 + .5 * Math.abs(Math.sin(i * 1.7)); out += '<i style="height:' + Math.max(12, Math.round(v * 100)) + '%"></i>'; }
    kw.innerHTML = out;
  }
  function bars(f) { var b = kw.children; for (var i = 0; i < b.length; i++) b[i].classList.toggle("on", i / b.length < f); }
  a.addEventListener("timeupdate", function () { bars(a.duration ? a.currentTime / a.duration : 0); });
  function words(k, all) { cap.innerHTML = LINES[k].split(" ").map(function (w) { return "<span" + (all ? ' class="on"' : "") + ">" + esc(w) + "</span>"; }).join(" "); }
  function reveal(k, my) {
    var spans = cap.querySelectorAll("span"), d = Math.max(1, (dur[k] || 5) - .4) * 1000, step = d / Math.max(1, spans.length);   /* the clips start on the first word */
    spans.forEach(function (s, i) { setTimeout(function () { if (my === tok) s.classList.add("on"); }, 60 + i * step); });
  }
  function ended(my) { if (my === tok) setTimeout(next, 250); }
  function next() {
    var my = ++tok;
    if (vo) { vo.stop(); vo = null; }
    cur = queue.shift();
    reacting = !!(cur && REACT[cur]);
    if (!cur) { pill.classList.remove("talk"); SFX.bed.duck(false); return; }
    words(cur, !SOUND || !!UNRECORDED[cur]); wave(cur);
    if (!SOUND || UNRECORDED[cur]) { pill.classList.remove("talk"); SFX.bed.duck(false); return; }
    a.pause();
    /* the intro from its decoded buffer, started right now inside the click; the rest stream as before */
    if (SFX.has(cur) && SFX.live()) {
      vo = SFX.voice(cur, function () { ended(my); });
      if (vo) {
        pill.classList.add("talk"); pill.classList.remove("ask"); reveal(cur, my); SFX.bed.duck(true);
        (function tick() { if (my !== tok || !vo) return; bars(vo.at() / vo.dur); requestAnimationFrame(tick); })();
        return;
      }
    }
    if (SFX.has(cur) && !SFX.live()) { block(my); return; }   /* a link opened with no click: she waits for the first tap or key */
    a.src = "assets/audio/wl-" + cur + ".mp3";
    var p = a.play();
    pill.classList.add("talk"); pill.classList.remove("ask"); SFX.bed.duck(true);
    reveal(cur, my);
    if (p && p.catch) p.catch(function () { block(my); });
  }
  function block(my) { if (my !== tok) return; blocked = true; pill.classList.remove("talk"); pill.classList.add("ask"); words(cur, true); }
  a.addEventListener("ended", function () { ended(tok); });
  function say(keys) { queue = [].concat(keys); a.pause(); next(); }
  function stop() { tok++; queue = []; a.pause(); if (vo) { vo.stop(); vo = null; } pill.classList.remove("talk"); SFX.bed.duck(false); }
  pill.addEventListener("click", function () { if (cur) { blocked = false; SFX.wake(); say([cur].concat(queue)); } });
  /* a sign-up opened by a link has had no click yet: the first tap or key anywhere in it plays her */
  function unblock(e) { if (blocked && cur && !(e.target && e.target.closest && e.target.closest("[data-wl-kay]"))) { blocked = false; SFX.wake(); SFX.bed.start(); say([cur].concat(queue)); } }
  sheet.addEventListener("pointerdown", unblock, true);
  sheet.addEventListener("keydown", unblock, true);
  /* a pick: she answers it now; a step's own line waits for her answer to finish instead of cutting it off */
  function react(k) { if (!SOUND || !LINES[k]) return; say([k]); }
  function line(k) { if (reacting && pill.classList.contains("talk")) queue = [k]; else say([k]); }
  return { say: say, stop: stop, react: react, line: line, text: function (k) { return LINES[k]; } };
})();
var sndB = sheet.querySelector("[data-wl-snd]");
function setSound(on) {
  SOUND = on; sndB.setAttribute("aria-pressed", on ? "true" : "false"); sndB.setAttribute("aria-label", on ? "Sound on" : "Sound off");
  try { localStorage.setItem("studio-wl-sound", on ? "on" : "off"); } catch (e) {}
  if (!on) { KAY.stop(); SFX.bed.stop(.4); } else if (sheet.classList.contains("open")) SFX.bed.start();
}
setSound(SOUND);
sndB.addEventListener("click", function () { setSound(!SOUND); if (SOUND) { SFX.wake(); SFX.play("click"); } });
/* the pointer: a soft tick on hover (mouse only), a click on press; a key for every few letters typed */
var HIT = ".wl-opt, button, .wl-sh, a, input:not(.wl-hp), select, label.wl-sms, .wl-kay, .pass";
sheet.addEventListener("pointerover", function (e) { if (!fine) return; var t = e.target.closest && e.target.closest(HIT); if (t && !t.contains(e.relatedTarget)) SFX.play("tick"); });
sheet.addEventListener("pointerdown", function (e) { SFX.wake(); if (sheet.classList.contains("open")) SFX.bed.start(); if (e.target.closest && e.target.closest(HIT)) SFX.play("click"); });
sheet.addEventListener("input", function (e) { if (e.target.matches("input")) SFX.play("key"); });

/* ---------- the sheet ---------- */
var form = sheet.querySelector(".wl-form"), box = sheet.querySelector(".wl-steps"), steps = [].slice.call(sheet.querySelectorAll(".wl-q"));
sheet.appendChild(sheet.querySelector(".wl-dock")); /* the bar and Kayla sit on the sheet, above both the questions and You're in (the submit button stays tied to the form) */
var ORDER = steps.map(function (s) { return s.getAttribute("data-q"); });
/* a wallpaper per step, from the app's own set; the next one is fetched and decoded ahead, then crossfaded in */
var PHONE = matchMedia("(max-width: 700px) and (max-aspect-ratio: 3/4)").matches;
var WALL = {};   /* the app's clean wallpapers (never the film-grain ones): lone tree, Big Sur, the dune, the alpine lake, Pebble Beach, peach dawn */
["name", "roles", "brands", "claude", "you", "in"].forEach(function (k) { WALL[k] = "assets/wl/" + k + (PHONE ? "-m" : "") + ".jpg"; });
var wallCache = {}, wallTok = 0, wallNow = "";
/* the live count on the first step: the people already waiting plus everyone the Worker has, every 30 s while it's open */
var GOAL = 3, countEl = sheet.querySelector("[data-wl-count]"), countN = sheet.querySelector("[data-wl-n]"), countT = 0, countLast = -1;
/* the number lands like a slot machine: every digit is a column of 0-9 (three times over) that spins and stops, left to right,
   with a little overshoot; tabular figures, so the width never jumps. A later change rolls only to the new digits. */
function roll(el, str, delay) {
  el.innerHTML = String(str).split("").map(function (c) { return /\d/.test(c) ? '<span class="dg" aria-hidden="true"><span style="--to:0">' + COL + "</span></span>" : '<span class="sp" aria-hidden="true">' + esc(c) + "</span>"; }).join("");
  el.setAttribute("aria-label", str);
  var cols = el.querySelectorAll(".dg"), digits = String(str).replace(/\D/g, "");
  var land = function () { cols.forEach(function (c, i) { c.classList.add("roll"); c.style.setProperty("--d", (.75 + i * .08).toFixed(2) + "s"); c.style.setProperty("--dl", ((delay || 0) + i * .07).toFixed(2) + "s"); c.firstChild.style.setProperty("--to", 20 + +digits[i]); }); };
  if (SK.reduced) { cols.forEach(function (c, i) { c.firstChild.style.setProperty("--to", 20 + +digits[i]); }); return; }
  requestAnimationFrame(function () { requestAnimationFrame(land); });
}
var COL = (function () { var o = ""; for (var r = 0; r < 3; r++) for (var d = 0; d < 10; d++) o += "<em>" + d + "</em>"; return o; })();
function showCount(n) {
  if (n === countLast) return;
  var fresh = countLast < 0, str = n.toLocaleString("en-US"); countLast = n;
  countEl.setAttribute("aria-label", str + " on the waitlist");
  var same = countN.getAttribute("data-s") && countN.getAttribute("data-s").length === str.length && !fresh;
  if (!same) countN.innerHTML = str.split("").map(function (c) { return /\d/.test(c) ? '<span class="dg" aria-hidden="true"><span style="--to:0">' + COL + "</span></span>" : '<span class="sp" aria-hidden="true">' + c + "</span>"; }).join("");
  countN.setAttribute("data-s", str); countEl.hidden = false;
  var cols = countN.querySelectorAll(".dg"), digits = str.replace(/\D/g, "");
  var land = function () { cols.forEach(function (c, i) { var inner = c.firstChild; c.classList.add("roll"); c.style.setProperty("--d", same ? ".5s" : (.75 + i * .08).toFixed(2) + "s"); c.style.setProperty("--dl", same ? "0s" : (i * .07).toFixed(2) + "s"); inner.style.setProperty("--to", 20 + +digits[i]); }); };
  if (SK.reduced) { cols.forEach(function (c, i) { c.firstChild.style.setProperty("--to", 20 + +digits[i]); }); return; }
  if (same) land(); else requestAnimationFrame(function () { requestAnimationFrame(land); });
}
function count() {
  if (OFFSET) showCount(Math.max(countLast, OFFSET));
  if (!API) return;
  fetch(API + "/count", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (j) { if (j && j.ok && typeof j.total === "number") showCount(OFFSET + j.total); }).catch(function () {});
}
function want(k) {
  var u = WALL[k]; if (!u) return Promise.resolve("");
  if (!wallCache[u]) { var i = new Image(); i.decoding = "async"; i.src = u; wallCache[u] = (i.decode ? i.decode() : new Promise(function (r) { i.onload = r; })).then(function () { return u; }, function () { return u; }); }
  return wallCache[u];
}
function wall(k) {
  var u = WALL[k] || WALL.name; if (u === wallNow) return; wallNow = u; var tok = ++wallTok, bg = sky.parentNode; SK.edgeTint(u);
  want(k).then(function () {
    if (tok !== wallTok) return;
    var nx = document.createElement("img"); nx.className = "wl-sky nx"; nx.alt = ""; nx.src = u; bg.appendChild(nx);
    requestAnimationFrame(function () { requestAnimationFrame(function () { nx.classList.add("in"); }); });
    setTimeout(function () { if (tok !== wallTok) return; [].slice.call(bg.querySelectorAll(".wl-sky")).forEach(function (o) { if (o !== nx && o !== sky) o.remove(); else if (o === sky) sky.classList.add("gone"); }); }, 1400);
    sheet.querySelectorAll(".pass .frost").forEach(function (f) { f.src = u; });
  });
}
var LINE = { name: "name", roles: "roles", brands: "brands", claude: "claude", you: "invite", check: "confirm" };
var SCENE = { name: "home", roles: "home", brands: "home", claude: "home", you: "you", check: "you" };   /* step 4 plays on the real Home (askLoop) */
WALL.check = WALL.you; /* question 3 opens Home's All brands menu */
var segs = [].slice.call(sheet.querySelectorAll(".wl-seg i")), scenes = {};
sheet.querySelectorAll(".wl-sc").forEach(function (s) { scenes[s.getAttribute("data-sc")] = s; });
var back = sheet.querySelector("[data-wl-back]"), next = sheet.querySelector("[data-wl-next]"), go = sheet.querySelector(".wl-go");
var sky = sheet.querySelector(".wl-sky"), fit = sheet.querySelector(".wl-fit"), stage = sheet.querySelector(".wl-stage");
var sel = sheet.querySelector(".wl-cc select"), ccv = sheet.querySelector(".wl-ccv"), toastEl = sheet.querySelector("[data-wl-toast]");
var other = sheet.querySelector("[data-wl-other]"), otherIn = form.elements.other;
sheet.querySelectorAll(".wl-opt").forEach(function (o) {
  var b = document.createElement("span"); b.className = "wl-ob"; b.setAttribute("data-beam", "cx"); b.setAttribute("aria-hidden", "true"); b.innerHTML = "<span data-beam-bloom></span>"; o.insertBefore(b, o.firstChild);
});
if ("MutationObserver" in window) new MutationObserver(function (ms) {
  ms.forEach(function (m) { var o = m.target, b = o.querySelector(".wl-ob"); if (b) { if (o.classList.contains("sel")) b.setAttribute("data-active", ""); else b.removeAttribute("data-active"); } });
}).observe(sheet.querySelector(".wl-steps"), { attributes: true, attributeFilter: ["class"], subtree: true });
var at = 0, busy = false, pushed = false, lastFocus = null, from = "link", ans = { roles: [], brands: "", claude: "" };
var depth = 0, closing = false, stillT = 0;
/* the sheet never scrolls itself: focusing a field near the app (which runs off the right edge) must not slide the whole page over */
sheet.addEventListener("scroll", function () { if (sheet.scrollLeft || sheet.scrollTop) { sheet.scrollLeft = 0; sheet.scrollTop = 0; } });   /* history: one entry per step (depth = how many are ours) */

function toast(t) { toastEl.textContent = t; toastEl.classList.add("on"); clearTimeout(toastEl._t); toastEl._t = setTimeout(function () { toastEl.classList.remove("on"); }, 2400); }
function val(n) { return (form.elements[n].value || "").trim(); }
function first() { return val("first").split(/\s+/)[0] || ""; }

/* country codes for the phone: the visitor's own region first */
var CC = [["US", "1"], ["CA", "1"], ["GB", "44"], ["AU", "61"], ["NZ", "64"], ["IE", "353"], ["DE", "49"], ["FR", "33"], ["ES", "34"], ["IT", "39"], ["NL", "31"], ["BE", "32"], ["CH", "41"], ["AT", "43"], ["SE", "46"], ["NO", "47"], ["DK", "45"], ["FI", "358"], ["PT", "351"], ["PL", "48"], ["AE", "971"], ["SA", "966"], ["IL", "972"], ["TR", "90"], ["ZA", "27"], ["NG", "234"], ["KE", "254"], ["EG", "20"], ["IN", "91"], ["PK", "92"], ["SG", "65"], ["MY", "60"], ["ID", "62"], ["PH", "63"], ["TH", "66"], ["VN", "84"], ["JP", "81"], ["KR", "82"], ["HK", "852"], ["CN", "86"], ["BR", "55"], ["MX", "52"], ["AR", "54"], ["CO", "57"], ["CL", "56"], ["PE", "51"]];
var flag = function (c) { return String.fromCodePoint.apply(null, c.split("").map(function (x) { return 127397 + x.charCodeAt(0); })); };
var names = null; try { names = new Intl.DisplayNames(["en"], { type: "region" }); } catch (e) {}
var region = (((navigator.languages && navigator.languages[0]) || navigator.language || "").split("-")[1] || "").toUpperCase();
sel.innerHTML = CC.map(function (c) { return '<option value="' + c[0] + '">' + flag(c[0]) + "  " + (names ? names.of(c[0]) : c[0]) + " (+" + c[1] + ")</option>"; }).join("");
sel.value = CC.some(function (c) { return c[0] === region; }) ? region : "US";
function cc() { return CC.filter(function (x) { return x[0] === sel.value; })[0] || CC[0]; }
function showCC() { var c = cc(); ccv.textContent = flag(c[0]) + " +" + c[1]; }
sel.addEventListener("change", showCC); showCC();

/* ---------- the stage ---------- */
var MADE = {
  "Business owner": ["coffee-friend-arrives", "Ads", "This week's offer"], "Founder": ["cofounder-whiteboard", "Film", "Your launch film"],
  "Creator": ["surfing", "Reels", "A reel a day"], "Video editor": ["race-track", "Full edits", "First cut, ready"],
  "Social media manager": ["get-together", "Social", "The month, planned"], "Marketer": ["tennis-forehand", "Ads", "Five to test"],
  "Agency": ["private-jet", "Brands", "Every client, on brand"], "Something else": ["above-the-clouds", "Ask", "Whatever you dream up"]
};
var PROMPT = {
  "Business owner": "Turn these into an ad for this week's offer", "Founder": "Cut these into a launch film for my company", "Creator": "Make three reels from yesterday's shoot",
  "Video editor": "Find the best takes and cut a first edit", "Social media manager": "Make this month's posts from these", "Marketer": "Make five ad versions and test them",
  "Agency": "Make this week's posts for every client", "Something else": "Make something people will remember"
};
/* brand kits in the brand palette: vampire black, chinese black, jet stream, platinum, celadon, blue slate, obsidian chrome */
var BRANDS = [
  { n: "Your brand", s: "Brand kit ready", bg: "linear-gradient(140deg, #DFEAE8, #BBC9C7 50%, #536878)", ink: "#05090A", sw: ["#05090A", "#0E191E", "#BBC9C7", "#DFEAE8"] },
  { n: "MIRRA", s: "14 posts this week", img: "assets/hero/brand-mirra.png", sw: ["#05090A", "#536878", "#B4B9BA", "#E5E4E2"] },
  { n: "Custom Esignature", s: "3 ads running", img: "assets/hero/brand-ces.png", sw: ["#0E191E", "#536878", "#BACCD0", "#DFEAE8"] },
  { n: "Halden", s: "Running gear", m: "h", bg: "linear-gradient(140deg, #2B2B2B, #0A0A0A)", ink: "#E6EAE3", sw: ["#0A0A0A", "#2B2B2B", "#BED2C3", "#E6EAE3"] },
  { n: "Northline", s: "Coffee roasters", m: "N", bg: "linear-gradient(140deg, #536878, #0E191E)", ink: "#E5E4E2", sw: ["#0E191E", "#536878", "#BBC9C7", "#E5E4E2"] }
];
function list(a) { return a.length < 2 ? (a[0] || "") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1]; }
function article(w) { return /^[AEIOU]/i.test(w) ? "an" : "a"; }
function greet() { var h = new Date().getHours(); return h < 5 ? "Good evening" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; }
function brandList() {
  var n = ans.brands === "4+" ? 5 : ans.brands === "2-3" ? 3 : 1, f = first();
  return BRANDS.slice(0, n).map(function (b, i) { return Object.assign({}, b, i === 0 ? { n: f ? f + "'s brand" : "Your brand", m: f ? f.charAt(0).toUpperCase() : "Y" } : {}); });
}
function mono(b) { return '<span class="bm" style="background:' + (b.bg || "#0E191E") + ";color:" + (b.ink || "#fff") + '">' + (b.img ? '<img src="' + b.img + '" alt="">' : esc(b.m)) + "</span>"; }
/* the real Studio Home (kit.js SK.appHome): your name in the greeting, your brands as chips, and Post next made for who you are */
var AH = SK.appHome(sheet.querySelector("[data-wl-ah]"), { brands: [] }), ahHave = "";
function drawHome(typing) {
  var f = first();
  AH.name(f, typing);
  AH.brands(brandList().slice(0, 3).map(function (b) { return { n: b.n, m: b.m || (b.n || "Y").charAt(0), bg: b.bg, ink: b.ink }; }));
  var r = ans.roles.map(function (x) { return x === "Something else" && val("other") ? val("other") : x; });
  var want = ans.roles.slice(0, 4), key = want.join("|") + "#" + val("other");
  if (key === ahHave) return;
  var fresh = want.filter(function (k) { return ahHave.split("#")[0].split("|").indexOf(k) < 0; });
  ahHave = key;
  AH.picks(want.map(function (k) { var m = MADE[k]; return { img: M + "selects/" + m[0] + ".jpg", kicker: m[1], title: k === "Something else" && val("other") ? val("other") : m[2], fresh: fresh.indexOf(k) > -1 }; }),
    r.length ? "For " + article(r[0]) + " " + list(r.map(function (x) { return x.toLowerCase(); })) : "Studio's picks");
}
function drawBrands() {
  var bl = brandList(), ul = sheet.querySelector("[data-wl-bl]"), have = ul.querySelectorAll(".wl-br").length;
  ul.innerHTML = bl.map(function (b, i) {
    return '<li class="wl-br' + (i === 0 ? " on" : "") + (i >= have ? " wl-in-a" : "") + '" style="--i:' + Math.max(0, i - have) + '">' + mono(b) + '<span class="wl-bt"><b>' + esc(b.n) + "</b><span>" + esc(b.s) + '</span></span><span class="wl-sw">' + b.sw.map(function (c) { return '<i style="background:' + c + '"></i>'; }).join("") + "</span></li>";
  }).join("") + (bl.length === 5 ? '<li class="wl-more wl-in-a" style="--i:5">And every brand you run</li>' : "");
  AH.allBrands(ans.brands ? (bl.length === 1 ? bl[0].n : "All brands · " + ans.brands) : "All brands");
  drawHome();
}
function drawClaude() {
  var k = ans.roles[0] || "Founder", m = MADE[k] || MADE.Founder;
  sheet.querySelector("[data-wl-kind]").textContent = m[1] === "Film" ? "Launch film" : m[1];
}
/* the Claude scene, on a loop while it's showing: three clips are dragged in from your Mac, the composer lights up to take them,
   a request is typed and sent, and three cuts come back. Then they clear and it starts again. */
var loopTok = 0;
var VIDLINE = { "Business owner": "This week only. Come see us.", "Founder": "Your place for ambitious young founders", "Creator": "Same crew. Every morning.", "Video editor": "Take the long way.", "Social media manager": "The corner table. Saturdays.", "Marketer": "Made to be felt.", "Agency": "Every brand, its own voice.", "Something else": "If you can dream it, you can post it." };
/* step 4, on the real Home: three of your clips drop into Ask Studio, the request types itself and goes, Studio works (Working now),
   and the finished cut lands at the front of To review as v01. Then it clears and runs again with your next role. */
function askLoop() {
  var my = ++loopTok, w = function (ms) { return SK.sleep(SK.reduced ? 0 : ms).then(function () { if (my !== loopTok) throw 0; }); };
  (async function () {
    try {
      for (var round = 0; ; round++) {
        var picks = ans.roles.length ? ans.roles : ["Founder"], k = picks[round % picks.length], text = PROMPT[k] || PROMPT.Founder, film = MADE[k] || MADE.Founder;
        var clips = [film[0], (MADE[picks[(round + 1) % picks.length]] || MADE.Creator)[0], "golf"].map(function (x) { return M + "selects/" + x + ".jpg"; });
        AH.review(null); AH.working(false); AH.sending(false); AH.attach([]); AH.typeAsk("", true);
        await w(500); AH.attach(clips); SFX.play("tick", { gain: .6 });
        await w(700);
        for (var i = 1; i <= text.length; i++) { AH.typeAsk(text.slice(0, i), true); if (i % 3 === 0) SFX.play("key", { gain: .5 }); await w(34 + Math.random() * 30); }
        await w(500); AH.sending(true); SFX.play("send", { gain: .5 });
        await w(320); AH.sending(false); AH.typeAsk("", false); AH.attach([]);
        AH.working(true, "Studio · " + (film[1] === "Film" ? "Launch film" : film[1]), "Cutting 3 clips…");
        await w(1500); AH.working(true, null, "Music, captions, your brand…");
        await w(1500); AH.working(false);
        AH.review({ img: M + "selects/" + film[0] + ".jpg", kicker: film[1], title: film[2] }); SFX.play("land", { gain: .5 });
        await w(4200);
      }
    } catch (e) {}
  })();
}
function claudeLoop() {
  var my = ++loopTok, sc = scenes.claude, comp = sheet.querySelector("[data-wl-comp]"), att = sheet.querySelector("[data-wl-att]"), plan = sheet.querySelector("[data-wl-plan]");
  var t = sheet.querySelector("[data-wl-type]"), fly = sheet.querySelector("[data-wl-fly]"), v01 = sheet.querySelector("[data-wl-v01]"), vid = sheet.querySelector("[data-wl-vid]");
  var rows = [].slice.call(plan.querySelectorAll("li")), ft = sheet.querySelector("[data-wl-ft]"), slots = [].slice.call(plan.querySelectorAll(".slots em"));
  var w = function (ms) { return SK.sleep(SK.reduced ? 0 : ms).then(function () { if (my !== loopTok) throw 0; }); };
  (async function () {
    try {
      for (var round = 0; ; round++) {
        var picks = ans.roles.length ? ans.roles : ["Founder"], k = picks[round % picks.length], text = PROMPT[k] || PROMPT.Founder, film = MADE[k] || MADE.Founder;
        var clips = [film[0], (MADE[picks[(round + 1) % picks.length]] || MADE.Creator)[0], "golf"], shots = ["coastal-highway", "surfing", "real-connections"];
        comp.classList.remove("has", "work", "over", "tap"); t.textContent = ""; att.innerHTML = ""; plan.classList.remove("on"); v01.classList.remove("on");
        rows.forEach(function (r) { r.classList.remove("ok", "run"); }); ft.innerHTML = ""; slots.forEach(function (e) { e.style.backgroundImage = ""; });
        try { vid.pause(); } catch (e) {}
        /* three clips, dragged in from the bottom left */
        fly.innerHTML = '<div class="stack">' + clips.map(function (s) { return '<span><img src="' + M + "selects/" + s + '.jpg" alt=""></span>'; }).join("") +
          '<b class="n">3</b><span class="ptr"><svg viewBox="0 0 24 24"><path d="M5 3l14 8-6 1.5L10 19z"/></svg></span></div>';
        var st = fly.firstChild;
        st.style.transition = "none"; st.style.transform = "translate(-180px, 640px) rotate(-8deg)"; st.style.opacity = "0";
        await w(500);
        void st.offsetWidth; st.style.transition = ""; st.style.opacity = "1"; st.style.transform = "translate(330px, 30px) rotate(-3deg)";
        await w(800); comp.classList.add("over");
        await w(500); st.style.opacity = "0"; st.style.transform = "translate(350px, 20px) scale(.6)";
        comp.classList.remove("over");
        att.innerHTML = clips.map(function (s, i) { return '<span style="--i:' + i + '"><img src="' + M + "selects/" + s + '.jpg" alt=""></span>'; }).join("") + "<b>3 clips</b>";
        await w(700); fly.innerHTML = "";
        for (var i = 1; i <= text.length; i++) { t.textContent = text.slice(0, i); comp.classList.add("has"); await w(30 + Math.random() * 28); }
        await w(450); comp.classList.add("tap"); await w(160); comp.classList.remove("tap"); comp.classList.add("work");
        /* the plan builds itself, a row at a time */
        await w(400); plan.classList.add("on");
        for (var r = 0; r < rows.length; r++) {
          rows[r].classList.add("run");
          await w(r === 1 ? 500 : 600);
          if (r === 1) ft.innerHTML = clips.map(function (s) { return '<span class="wl-in-a"><img src="' + M + "selects/" + s + '.jpg" alt=""></span>'; }).join("");
          if (r === 2) slots.forEach(function (e, j) { e.style.backgroundImage = "url(" + M + "selects/" + shots[j] + ".jpg)"; });
          rows[r].classList.remove("run"); rows[r].classList.add("ok");
        }
        comp.classList.remove("work");
        /* v01 lands, and plays */
        sheet.querySelector("[data-wl-v01t]").textContent = sheet.querySelector("[data-wl-kind]").textContent;
        sheet.querySelector("[data-wl-vidline]").textContent = VIDLINE[k] || VIDLINE.Founder;
        vid.poster = M + "selects/" + film[0] + ".jpg";
        if (vid.getAttribute("src") !== M + "selects/" + film[0] + ".mp4") vid.src = M + "selects/" + film[0] + ".mp4";
        try { vid.currentTime = 0; var pp = vid.play(); pp && pp.catch(function () {}); } catch (e) {}
        v01.classList.add("on");
        await w(5200);
        plan.classList.remove("on"); v01.classList.remove("on");
        att.querySelectorAll("span").forEach(function (s) { s.classList.add("wl-out-a"); });
        await w(700);
      }
    } catch (e) {}
  })();
}
function sizeStage() {
  var r = stage.getBoundingClientRect();
  if (!r.width && !(SK.mobile() || innerWidth <= 960)) return;
  var mob = SK.mobile() || innerWidth <= 960;
  if (mob) {
    var sm = Math.max(.38, Math.min(.5, innerWidth * 1.55 / 1440));
    stage.style.setProperty("--stage-h", Math.round(Math.min(370, 760 * sm)) + "px");
    fit.style.setProperty("--s", sm.toFixed(3));
    return;
  }
  var s = Math.min((r.height || 900) / 880, (r.width + 220) / 1440, 1.45); /* desktop: the app at its own 1440 x 900, as tall as the space allows, running off the right edge like the opening film */
  /* the Claude scene is taller than the rest (the composer, then the plan and the v01 film): it fits whole, inside the stage, clear of
     the captions and the bar, from the top down */
  fit.style.setProperty("--s", Math.max(.2, s).toFixed(3));
}
window.addEventListener("resize", function () { requestAnimationFrame(sizeStage); });

/* ---------- the pass: a 3D object (see the CSS). Spins in once, follows the mouse or a finger, flips on a tap. ---------- */
function passHTML(o) {
  var frost = '<img class="frost" src="' + (sky.getAttribute("src") || "assets/hero/sky.jpg") + '" alt="">';
  return '<div class="side front"><div class="plate"></div><div class="card">' + frost + '<div class="foil"></div><div class="sweep"></div><span class="pbeam" data-beam="cx" data-active><span data-beam-bloom></span></span></div>' +
    '<div class="lift top"><span class="mark"><svg viewBox="36 36 440 440"><use href="#studio-mark"/></svg>Studio</span><span class="mono">Early access · Invite</span></div>' +
    '<div class="lift who"><span class="mono dim">Invite for</span><div class="name" data-p="name"></div><div class="mail" data-p="mail"></div></div>' +
    '<div class="lift row"><div><span class="mono dim" data-p="k1">No.</span><b data-p="no">····</b></div><div><span class="mono dim">Trial</span><b class="s">14 days, free</b></div><div><span class="mono dim" data-p="k3">For</span><b class="s" data-p="v3">Mac</b></div></div>' +
    '<div class="lift cut"></div><div class="lift bars" data-p="bars"></div></div>' +
    '<div class="side back"><div class="plate"></div><div class="card">' + frost + '<div class="foil"></div><span class="pbeam" data-beam="cx" data-active><span data-beam-bloom></span></span></div>' +
    '<svg class="lift big" viewBox="36 36 440 440"><use href="#studio-mark"/></svg>' +
    '<div class="lift what"><span class="mono dim">What\'s waiting for you</span><h4>Your whole content team, on your Mac.</h4><ul><li><i></i>14 days of everything, free</li><li><i></i>Every feature, every brand</li><li><i></i>Claude does the work</li></ul></div>' +
    '<div class="lift sig"><span class="mono dim">See you inside</span><span class="mono" data-p="sig">Studio</span></div></div>';
}
function bars(box, seed) {
  var s = 0, out = "", x = 0; for (var i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0; s = s || 7;
  while (x < 96) { s = (s * 16807) % 2147483647; var w = .35 + (s % 4) * .3; out += '<i style="width:' + w.toFixed(2) + '%"></i>'; x += w + .7; }
  box.innerHTML = out;
}
function Pass(el, opts) {
  opts = opts || {};
  el.innerHTML = passHTML();
  var st = { rx: 0, ry: 0, z: 0, s: 1, trx: 0, try_: 0, flip: 0, drag: null, intro: null, live: false };
  var lerp = function (a, b, t) { return a + (b - a) * t; }, easeOut = function (t) { return 1 - Math.pow(1 - t, 3); }, easeIO = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  function frame(now) {
    if (!st.live) return;
    if (el.offsetParent) {
      if (st.intro) {
        var t = Math.min(1, (now - st.intro.t0) / st.intro.ms), e = easeOut(t);
        st.ry = lerp(st.intro.ry0, 0, easeIO(t)) + st.flip; st.z = lerp(-900, 0, e); st.s = lerp(.62, 1, e); st.rx = lerp(26, 0, e);
        if (t >= 1) { st.intro = null; el.classList.add("sweep"); setTimeout(function () { el.classList.remove("sweep"); }, 1700); opts.onLanded && opts.onLanded(); }
      } else {
        var k = st.drag ? .35 : .09;
        if (!fine && !st.drag) { st.try_ = Math.sin(now / 1600) * 9; st.trx = Math.cos(now / 2100) * 5; }
        st.rx = lerp(st.rx, st.trx, k); st.ry = lerp(st.ry, st.try_ + st.flip, k); st.z = lerp(st.z, 0, .1); st.s = lerp(st.s, 1, .1);
      }
      el.style.transform = "translateZ(" + st.z.toFixed(1) + "px) rotateX(" + st.rx.toFixed(2) + "deg) rotateY(" + st.ry.toFixed(2) + "deg) scale(" + st.s.toFixed(3) + ")";
      var ny = ((st.ry % 360) + 540) % 360 - 180;
      el.style.setProperty("--mx", (.5 + ny / 90 * .5).toFixed(3)); el.style.setProperty("--my", (.35 - st.rx / 40).toFixed(3));
    }
    requestAnimationFrame(frame);
  }
  window.addEventListener("pointermove", function (e) {
    if (!st.live) return;
    if (st.drag) { st.try_ = st.drag.ry0 + (e.clientX - st.drag.x) * .45; st.trx = Math.max(-25, Math.min(25, st.drag.rx0 - (e.clientY - st.drag.y) * .3)); if (Math.abs(e.clientX - st.drag.x) > 6) st.drag.moved = true; return; }
    if (!fine || st.intro) return;
    var r = el.getBoundingClientRect(), x = (e.clientX - (r.left + r.width / 2)) / innerWidth, y = (e.clientY - (r.top + r.height / 2)) / innerHeight;
    st.try_ = Math.max(-22, Math.min(22, x * 40)); st.trx = Math.max(-16, Math.min(16, -y * 30));
  });
  el.addEventListener("pointerdown", function (e) { st.drag = { x: e.clientX, y: e.clientY, ry0: st.try_, rx0: st.trx, moved: false }; });
  function up() {
    if (!st.drag) return;
    var d = st.drag; st.drag = null;
    if (!d.moved) { st.flip += 180; SFX.play("move", { gain: .8 }); opts.onFlip && opts.onFlip(); }
    else st.flip += Math.round(st.try_ / 180) * 180;
    st.try_ = 0; st.trx = 0;
  }
  window.addEventListener("pointerup", up); window.addEventListener("pointercancel", up);
  el.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); st.flip += 180; } });
  el.tabIndex = 0; el.setAttribute("role", "button"); el.setAttribute("aria-label", "Your Studio pass. Press to flip it.");
  var q = function (k) { return el.querySelector('[data-p="' + k + '"]'); };
  return {
    start: function () { if (!st.live) { st.live = true; requestAnimationFrame(frame); } },
    stop: function () { st.live = false; },
    land: function () { el.classList.add("sweep"); setTimeout(function () { el.classList.remove("sweep"); }, 1700); opts.onLanded && opts.onLanded(); },
    enter: function (ms) { st.flip = 0; st.intro = SK.reduced ? null : { t0: performance.now(), ms: ms || 2000, ry0: -385 }; this.start(); },
    set: function (d) {
      if ("name" in d) q("name").innerHTML = d.name ? esc(d.name) : '<span class="ph">Your name</span>';
      if ("mail" in d) q("mail").textContent = d.mail;
      if ("k1" in d) q("k1").textContent = d.k1;
      if ("no" in d) q("no").textContent = d.no;
      if ("k3" in d) q("k3").textContent = d.k3;
      if ("v3" in d) q("v3").textContent = d.v3;
      if ("sig" in d) q("sig").textContent = d.sig;
      if ("seed" in d) bars(q("bars"), d.seed || "studio");
    }
  };
}
var pass1 = Pass(sheet.querySelector("[data-wl-pass1]"));
var pass2 = Pass(sheet.querySelector("[data-wl-pass2]"), { onLanded: function () {
  SFX.play("ask", { gain: 1 }); setTimeout(function () { SFX.play("done", { gain: .55 }); }, 140);
  var st = sheet.querySelector(".wl-dstage"); st.classList.remove("bloom"); void st.offsetWidth; st.classList.add("bloom");
} });
function drawPass() {
  var f = val("first"), l = val("last"), e = val("email");
  pass1.set({ name: (f + " " + l).trim(), mail: e || "you@email.com", v3: (ans.roles[0] === "Something else" && val("other")) || ans.roles[0] || "Mac", seed: (f + l + e) || "studio" });
}

/* ---------- moving between questions ---------- */
function ready(n) {
  var q = ORDER[n];
  if (q === "name") return !!val("first") && !!val("last");
  if (q === "roles") return ans.roles.length > 0 && (ans.roles.indexOf("Something else") < 0 || !!val("other"));
  if (q === "you") return true;
  if (q === "check") return otpCode().length === 6;
  return !!ans[q];
}
function personal() {
  var f = first();
  sheet.querySelectorAll("[data-wl-hi]").forEach(function (h) { var t = h.getAttribute("data-wl-hi"); h.textContent = f ? t.replace("{first}", f) : t.replace(", {first}", ""); });
}
function setStep(n, quiet, fromHist) {
  var cur = steps[at], nx = steps[n], q = ORDER[n], dir = n > at ? 1 : -1, was = at;
  personal();
  if (cur !== nx) {
    var h0 = box.offsetHeight;
    cur.classList.remove("on"); cur.classList.toggle("past", n > at);
    nx.classList.remove("past"); nx.classList.add("on"); reveal(nx);
    var h1 = nx.offsetHeight;
    box.style.height = h0 + "px"; void box.offsetHeight; box.style.height = h1 + "px";
    clearTimeout(box._t); box._t = setTimeout(function () { box.style.height = ""; }, 560);
    var a = scenes[SCENE[ORDER[at]]], b = scenes[SCENE[q]];
    if (a !== b) { a.classList.remove("on"); a.classList.toggle("past", n > at); b.classList.remove("past"); b.classList.add("on"); }
    if (!quiet) SFX.play("move", { pan: dir * .3 });
  }
  at = n;
  sheet.setAttribute("data-step", q);
  if (sheet.classList.contains("open") && !sheet.classList.contains("done")) { wall(q); want(ORDER[n + 1]); }
  segs.forEach(function (s, i) { s.classList.toggle("on", i === n); s.classList.toggle("ok", i < n); });
  back.disabled = n === 0;
  var last = q === "you" || q === "check";
  next.hidden = last; go.hidden = !last;
  go.querySelector(".t").textContent = q === "check" ? "Confirm" : "Get early access";
  go.disabled = q === "check" && !ready(n);
  scenes.home.classList.toggle("menu", q === "brands");
  next.disabled = !ready(n);
  if (q === "claude") askLoop(); else { loopTok++; AH.typeAsk("Post my newest videos on every channel this week"); AH.attach([]); AH.working(false); AH.review(null); AH.sending(false); }
  sizeStage(); setTimeout(sizeStage, 400);
  if (SCENE[q] === "you") { drawPass(); if (!pass1.shown) { pass1.shown = true; pass1.enter(1500); } else pass1.start(); } else pass1.stop();
  if (SCENE[q] === "home") drawHome();
  if (!quiet && sheet.classList.contains("open")) KAY.line(LINE[q]);
  if (!quiet) focusStep(SK.reduced ? 0 : 420);
  setTimeout(function () { typeStep(); }, quiet ? 0 : 520);
  if (!fromHist && n !== was && sheet.classList.contains("open") && DEEP.test(location.hash)) {
    try { if (n > was) { depth++; history.pushState({ wl: 1, step: n, d: depth }, "", location.href); } else history.replaceState({ wl: 1, step: n, d: depth }, ""); } catch (e) {}
  }
  if (n !== was) { var sc = sheet.querySelector(".wl-in"); if (sc.scrollTop > 0) sc.scrollTo({ top: 0, behavior: SK.reduced ? "auto" : "smooth" }); }
  saveDraft();
}
/* the answers so far, kept for this tab: a reload, or a swipe back to the page and forward again, picks up where it was */
var DRAFT = "studio-early-draft";
function saveDraft() {
  try { sessionStorage.setItem(DRAFT, JSON.stringify({ at: at, ans: ans, f: { first: val("first"), last: val("last"), other: val("other"), email: val("email"), phone: val("phone"), cc: sel.value, n: form.elements.sms_notify.checked, m: form.elements.sms_marketing.checked } })); } catch (e) {}
}
function loadDraft() {
  try {
    var d = JSON.parse(sessionStorage.getItem(DRAFT) || "null"); if (!d || !d.f) return 0;
    ["first", "last", "other", "email", "phone"].forEach(function (k) { form.elements[k].value = d.f[k] || ""; });
    if (d.f.cc) { sel.value = d.f.cc; showCC(); }
    form.elements.sms_notify.checked = !!d.f.n; form.elements.sms_marketing.checked = !!d.f.m;
    ans = { roles: [].concat((d.ans && d.ans.roles) || []), brands: (d.ans && d.ans.brands) || "", claude: (d.ans && d.ans.claude) || "" };
    steps.forEach(function (st) {
      var q = st.getAttribute("data-q");
      st.querySelectorAll(".wl-opt").forEach(function (o) { var v = o.getAttribute("data-v"), on = q === "roles" ? ans.roles.indexOf(v) > -1 : ans[q] === v; o.classList.toggle("sel", !!on); o.setAttribute("aria-pressed", on ? "true" : "false"); });
    });
    other.hidden = ans.roles.indexOf("Something else") < 0;
    var n = Math.min(d.at || 0, ORDER.indexOf("you"));
    while (n > 0 && !ready(n - 1)) n--;
    return n;
  } catch (e) { return 0; }
}
function clearDraft() { try { sessionStorage.removeItem(DRAFT); } catch (e) {} }
/* each empty field types its own example, left to right with a caret, when its step comes up; focus stops it where a normal
   placeholder would be, and any text hides it */
var TY = { first: "First name", last: "Last name", other: "Photographer, coach, musician…", email: "you@studio.com", phone: "(555) 123-4567" };
var tyTok = 0;
form.querySelectorAll("input").forEach(function (inp) {
  var t = TY[inp.name], box = inp.closest(".wl-box"); if (!t || !box) return;
  var o = document.createElement("span"); o.className = "wl-ty still"; o.setAttribute("aria-hidden", "true"); o.innerHTML = "<span></span><i></i>"; box.appendChild(o);
  inp.setAttribute("aria-placeholder", t);
  var sync = function () { box.classList.toggle("filled", !!inp.value); };
  inp.addEventListener("input", sync); inp.addEventListener("change", sync);
  inp.addEventListener("focus", function () { o.classList.add("still"); });   /* the real caret takes over; the example finishes typing */
  inp._ty = o; sync();
});
/* the hero's word reveal on every step: the headline, then the line under it, each word pulled from a blur into focus, left to right */
function words(el, n) {
  var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), list = [], t;
  while ((t = w.nextNode())) if (!(t.parentNode.classList && t.parentNode.classList.contains("wl-bw")) && !(t.parentNode.closest && t.parentNode.closest(".wl-roll")) && t.nodeValue.trim()) list.push(t);
  list.forEach(function (node) {
    var frag = document.createDocumentFragment();
    node.nodeValue.split(/(\s+)/).forEach(function (bit) {
      if (!bit) return;
      if (/^\s+$/.test(bit)) { frag.appendChild(document.createTextNode(bit)); return; }
      var sp = document.createElement("span"); sp.className = "wl-bw"; sp.textContent = bit; frag.appendChild(sp);
    });
    node.parentNode.replaceChild(frag, node);
  });
  el.querySelectorAll(".wl-bw").forEach(function (sp) { sp.style.setProperty("--n", n++); });
  return n;
}
function reveal(step) {
  if (SK.reduced) return;
  var n = 0; step.querySelectorAll(".wl-qh, .wl-qs").forEach(function (el) { n = words(el, n); });
  step.classList.add("w0"); void step.offsetWidth;
  requestAnimationFrame(function () { step.classList.remove("w0"); });
}
function typeStep(delay) {
  var tok = ++tyTok;
  form.querySelectorAll("input").forEach(function (i) { if (i._ty) i._ty.parentNode.classList.toggle("filled", !!i.value); });
  var list = [].slice.call(steps[at].querySelectorAll("input")).filter(function (i) { return i._ty && !i.value && !i.closest("[hidden]"); });
  list.forEach(function (i) { i._ty._stop = false; i._ty.classList.add("still"); i._ty.firstChild.textContent = SK.reduced ? TY[i.name] : ""; });   /* one drawn caret at a time */
  if (SK.reduced) return;
  var k = 0;
  (function nextField() {
    var inp = list[k++]; if (!inp) return;
    var o = inp._ty, t = TY[inp.name], n = 0; o.classList.toggle("still", inp === document.activeElement);
    (function tick() {
      if (tok !== tyTok) return;
      if (o._stop || n >= t.length) { o.firstChild.textContent = t; if (list[k]) o.classList.add("still"); return setTimeout(nextField, 120); }   /* the caret moves on to the next field */
      o.firstChild.textContent = t.slice(0, ++n); setTimeout(tick, 46 + Math.random() * 50);
    })();
  })();
}
function focusStep(delay) {
  setTimeout(function () {
    if (!sheet.classList.contains("open")) return;
    if (sheet.classList.contains("done")) { sheet.querySelector("[data-wl-done]").focus({ preventScroll: true }); return; }
    var s = steps[at], t = s.querySelector(".wl-opt.sel") || s.querySelector(".wl-opt, input");
    if (t && !(SK.mobile() && t.tagName === "INPUT")) t.focus({ preventScroll: true }); /* phones: no keyboard until they tap */
  }, delay);
}
function advance() {
  if (busy || at >= ORDER.length - 1 || ORDER[at] === "you" || ORDER[at] === "check") return;   /* those two move on only by sending */
  if (!ready(at)) { if (ORDER[at] === "name") checkName(); return; }
  busy = true; setStep(at + 1); setTimeout(function () { busy = false; }, 450);
}
function checkName() {
  var bad = [];
  if (!val("first")) bad.push("first");
  if (!val("last")) bad.push("last");
  mark(bad, bad.length ? (bad.length === 2 ? "Add your first and last name." : bad[0] === "first" ? "Add your first name." : "Add your last name.") : "");
  if (bad.length) form.elements[bad[0]].focus();
}
steps.forEach(function (s, n) {
  var multi = s.hasAttribute("data-multi"), q = s.getAttribute("data-q");
  s.querySelectorAll(".wl-opt").forEach(function (o) {
    o.addEventListener("click", function () {
      if (busy) return;
      var v = o.getAttribute("data-v");
      if (multi) {
        var on = !o.classList.contains("sel");
        o.classList.toggle("sel", on); o.setAttribute("aria-pressed", on ? "true" : "false");
        ans[q] = [].slice.call(s.querySelectorAll(".wl-opt.sel")).map(function (x) { return x.getAttribute("data-v"); });
        if (v === "Something else") { other.hidden = !on; if (on) setTimeout(function () { otherIn.focus(); }, 60); box.style.height = ""; }
      } else {
        s.querySelectorAll(".wl-opt").forEach(function (x) { x.classList.toggle("sel", x === o); x.setAttribute("aria-pressed", x === o ? "true" : "false"); });
        ans[q] = v;
        var rk = { brands: { "1": "b1", "2-3": "b2", "4+": "b4" }, claude: { "Pro or Max": "cpro", "Free plan": "cfree", "Not yet": "cno" } }[q];
        if (rk && rk[v]) KAY.react(rk[v]);
      }
      next.disabled = !ready(at); saveDraft();
      if (q === "roles") drawHome(); else if (q === "brands") drawBrands(); else if (q === "claude") drawClaude();
      if (!multi) setTimeout(advance, SK.reduced ? 60 : 520); /* one answer: on to the next, once it has landed on the right */
    });
  });
});
next.addEventListener("click", advance);
back.addEventListener("click", function () {
  if (at === 0 || busy) return;
  var st = history.state || {};
  if (st.wl && st.step === at && depth > (pushed ? 1 : 0)) history.back();   /* popstate takes it one step back */
  else setStep(at - 1);
});

/* ---------- the details: the beam runs round the field you're in; a field that needs you turns it auburn ---------- */
var inputs = [].slice.call(form.querySelectorAll("input:not(.wl-hp):not(.wl-cbx):not(.wl-od)"));
function mark(names, msg) {
  form.querySelectorAll(".wl-f.bad").forEach(function (f) { f.classList.remove("bad"); var fb = f.querySelector(".wl-fb"); if (fb && !f.contains(document.activeElement)) fb.removeAttribute("data-active"); });
  names.forEach(function (n) { var f = form.elements[n].closest(".wl-f"); void f.offsetWidth; f.classList.add("bad"); f.querySelectorAll(".wl-fb").forEach(function (fb) { fb.setAttribute("data-active", ""); }); });
  var errEl = steps[at].querySelector(".wl-err"); if (errEl) errEl.textContent = msg || "";
}
inputs.forEach(function (inp) {
  inp.addEventListener("input", function () {
    var f = inp.closest(".wl-f");
    if (f.classList.contains("bad")) { f.classList.remove("bad"); if (!form.querySelector(".wl-q.on .wl-f.bad")) { var e = steps[at].querySelector(".wl-err"); if (e) e.textContent = ""; } }
    if (inp.name === "first" || inp.name === "last") { drawHome(true); clearTimeout(inp._t); inp._t = setTimeout(function () { drawHome(); }, 900); personal(); }
    if (inp.name === "other") drawHome();
    next.disabled = !ready(at);
    if (ORDER[at] === "you") drawPass();
    clearTimeout(inp._sv); inp._sv = setTimeout(saveDraft, 300);
  });
  inp.addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    var here = [].slice.call(steps[at].querySelectorAll("input:not(.wl-hp):not(.wl-cbx):not(.wl-od)")).filter(function (x) { return x.offsetParent; }), i = here.indexOf(inp);
    if (i > -1 && i < here.length - 1) here[i + 1].focus();
    else if (ORDER[at] === "you") form.requestSubmit ? form.requestSubmit() : go.click();
    else advance();
  });
});
sheet.querySelectorAll(".wl-box").forEach(function (b) {
  var fb = b.querySelector(".wl-fb");
  b.addEventListener("focusin", function () { fb.setAttribute("data-active", ""); });
  b.addEventListener("focusout", function () { if (!b.closest(".wl-f.bad")) fb.removeAttribute("data-active"); });
});
var SRC = (function () {
  var s = Q.get("utm_source") || H.get("src") || Q.get("src") || "";
  if (!s && document.referrer) { try { var r = new URL(document.referrer).hostname.replace(/^www\.|^l\.|^m\./, ""); if (r !== location.hostname) s = r.split(".")[0]; } catch (e) {} }
  if (!s && REF) s = "friend";
  return [s || "direct", Q.get("utm_medium"), Q.get("utm_campaign")].filter(Boolean).join(" · ");
})(); /* read once, on arrival: closing the sheet takes the hash off */
function code6() { var a = "23456789abcdefghjkmnpqrstuvwxyz", s = ""; for (var i = 0; i < 6; i++) s += a[Math.floor(Math.random() * a.length)]; return s; }
function timed(p, ms) { return Promise.race([p, new Promise(function (_, rej) { setTimeout(function () { rej(new Error("timeout")); }, ms); })]); }
function send(d) {
  if (API) {
    return timed(fetch(API + "/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }), 15000)
      .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
      .then(function (j) { if (!j || !j.ok) { var e = new Error((j && j.error) || "That didn't go through."); e.human = !!(j && j.error); throw e; } return j; });
  }
  var mine = code6(), base = { code: mine, first: d.first, position: null, total: null, referrals: 0, boost: 0 };
  if (cfg.brevo_form) {
    var post = function (withSms) {
      var fd = new FormData(), f = { EMAIL: d.email, FIRSTNAME: d.first, LASTNAME: d.last, ROLE: d.roles.join(", "), BRANDS: d.brands, CLAUDE: d.claude, SOURCE: d.source, REF_CODE: mine, REFERRED_BY: d.ref || "" };
      if (withSms) { f.SMS = d.phone; if (d.cc) f.SMS__COUNTRY_CODE = "+" + d.cc; }
      Object.keys(f).forEach(function (k) { fd.append(k, f[k]); });
      fd.append("email_address_check", ""); fd.append("locale", "en");
      var url = cfg.brevo_form + (cfg.brevo_form.indexOf("?") < 0 ? "?" : "&") + "isAjax=1";
      return timed(fetch(url, { method: "POST", body: fd }), 15000).then(function (r) { return r.json().catch(function () { return {}; }); }, function () {
        return fetch(url, { method: "POST", body: fd, mode: "no-cors" }).then(function () { return { success: true }; }); /* no CORS: it still lands */
      });
    };
    return post(true).then(function (j) { return j && j.success === false ? post(false) : j; }).then(function (j) { if (j && j.success === false) throw new Error("brevo"); return base; });
  }
  if (cfg.webhook) {
    return timed(fetch(cfg.webhook, { method: "POST", headers: { "Content-Type": "text/plain;charset=UTF-8" }, body: JSON.stringify(Object.assign({ code: mine }, d)) }), 15000)
      .then(function () { return base; }, function () { return fetch(cfg.webhook, { method: "POST", mode: "no-cors", body: JSON.stringify(Object.assign({ code: mine }, d)) }).then(function () { return base; }); });
  }
  if (local) { console.info("[early access] not connected yet (src/waitlist.json). Would send:", d); return SK.sleep(900).then(function () { return { ok: true, needs_confirm: true, email: d.email, first: d.first, sent: true, resend_in: 60, fake: true }; }); }
  return Promise.reject(new Error("not connected"));
}
/* the exact words a person agreed to: the box they ticked plus the terms beside the phone field */
function smsWords(sel) { return sheet.querySelector(sel).textContent.trim() + ". " + sheet.querySelector("[data-wl-smstext]").textContent.trim(); }
form.addEventListener("submit", function (e) {
  e.preventDefault();
  if (ORDER[at] === "check") { verify(); return; }
  if (ORDER[at] !== "you") { advance(); return; }
  if (go.classList.contains("busy")) return;
  var email = val("email"), phone = val("phone"), digits = phone.replace(/\D/g, ""), c = cc(), bad = [], msg = "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { bad.push("email"); msg = email ? "That email doesn't look quite right." : "Add your email."; }
  var nOk = form.elements.sms_notify.checked, mOk = form.elements.sms_marketing.checked;   /* the phone is optional, unless a text box is ticked */
  if ((digits.length || nOk || mOk) && (digits.length < 6 || digits.length > 15)) { bad.push("phone"); msg = bad.length > 1 ? "Check your email and phone number." : phone ? "That phone number looks too short." : "Add your phone number for texts, or untick the boxes."; }
  mark(bad, msg);
  if (bad.length) { form.elements[bad[0]].focus(); return; }
  var intl = /^\s*\+/.test(phone), roles = ans.roles.map(function (r) { return r === "Something else" && val("other") ? "Something else: " + val("other") : r; });
  var d = { first: val("first"), last: val("last"), email: email, phone: intl ? "+" + digits : digits.replace(/^0+/, ""), cc: intl ? "" : c[1], roles: roles, brands: ans.brands, claude: ans.claude, source: (local ? "hub-test · " : "") + SRC + " · " + from, ref: REF, hp: val("company"),
    sms_notify: nOk, sms_notify_text: nOk ? smsWords("[data-wl-smsn]") : "", sms_marketing: mOk, sms_marketing_text: mOk ? smsWords("[data-wl-smsm]") : "",
    sms_consent_version: "waitlist-sms-v2", terms_version: "waitlist-email-v2" };
  go.classList.add("busy"); SFX.play("send");
  send(d).then(function (j) {
    if (j.needs_confirm) { checkEmail(j, d); return; }
    landed(j, d);
  }, function (x) {
    mark([], x && x.human ? x.message : "That didn't go through. Check your connection and try again.");
  }).then(function () { go.classList.remove("busy"); });
});

/* ---------- Check your email: the code from the email (or its link) holds the place ---------- */
var PEND = KEY + "-pending", pend = null, FAKE = local && !API;
var otp = [].slice.call(sheet.querySelectorAll("[data-wl-otp] input")), otpBox = sheet.querySelector("[data-wl-otp]"), otpBeam = sheet.querySelector(".wl-otpb");
var resendB = sheet.querySelector("[data-wl-resend]"), waitEl = sheet.querySelector("[data-wl-wait]"), chint = sheet.querySelector("[data-wl-chint]"), resendT = 0, hintT = 0, checking = false;
sheet.querySelector("[data-wl-dev]").hidden = !FAKE;
function otpCode() { return otp.map(function (i) { return i.value; }).join("").replace(/\D/g, ""); }
function cerr(t) { steps[ORDER.indexOf("check")].querySelector(".wl-err").textContent = t || ""; }
function badOtp(on) { otpBox.classList.toggle("bad", on); if (on) { void otpBox.offsetWidth; otpBeam.setAttribute("data-active", ""); } else otpBeam.removeAttribute("data-active"); }
function clearOtp() { otp.forEach(function (i) { i.value = ""; i.classList.remove("has"); }); otpBox.classList.remove("ok", "busy"); badOtp(false); go.disabled = ORDER[at] === "check"; }
function otpChanged() { badOtp(false); cerr(""); go.disabled = !ready(at); if (otpCode().length === 6) setTimeout(verify, 180); }
function fill(from, digits) {
  digits = digits.replace(/\D/g, "").slice(0, 6 - from);
  for (var k = 0; k < digits.length; k++) { otp[from + k].value = digits[k]; otp[from + k].classList.add("has"); }
  otp[Math.min(5, from + digits.length)].focus();
  otpChanged();
}
otp.forEach(function (inp, i) {
  inp.addEventListener("input", function () {
    var v = inp.value.replace(/\D/g, "");
    if (v.length > 1) { inp.value = ""; fill(i, v); return; }   /* autofill or a fast paste puts the whole code in one box */
    inp.value = v; inp.classList.toggle("has", !!v);
    if (v && i < 5) otp[i + 1].focus();
    otpChanged();
  });
  inp.addEventListener("keydown", function (e) {
    if (e.key === "Backspace" && !inp.value && i > 0) { e.preventDefault(); otp[i - 1].value = ""; otp[i - 1].classList.remove("has"); otp[i - 1].focus(); go.disabled = true; }
    else if (e.key === "ArrowLeft" && i > 0) { e.preventDefault(); otp[i - 1].focus(); }
    else if (e.key === "ArrowRight" && i < 5) { e.preventDefault(); otp[i + 1].focus(); }
    else if (e.key === "Enter") { e.preventDefault(); verify(); }
  });
  inp.addEventListener("paste", function (e) { var t = (e.clipboardData || window.clipboardData).getData("text") || ""; if (/\d/.test(t)) { e.preventDefault(); fill(0, t); } });
  inp.addEventListener("focus", function () { setTimeout(function () { if (document.activeElement === inp) try { inp.select(); } catch (x) {} }, 0); });   /* only if still here: a fast typist has moved on */
});
function resendIn(s) {
  chint.hidden = true; clearTimeout(hintT); hintT = setTimeout(function () { if (ORDER[at] === "check" && otpCode().length < 6) chint.hidden = false; }, 20000);
  clearInterval(resendT);
  if (!(s > 0)) { resendB.disabled = false; waitEl.textContent = ""; return; }
  resendB.disabled = true; waitEl.textContent = "in " + s + "s";
  resendT = setInterval(function () { s--; if (s <= 0) { clearInterval(resendT); resendB.disabled = false; waitEl.textContent = ""; } else waitEl.textContent = "in " + s + "s"; }, 1000);
}
function savePend(p) { pend = p; try { if (p) localStorage.setItem(PEND, JSON.stringify(p)); else localStorage.removeItem(PEND); } catch (x) {} }
function loadPend() { try { var p = JSON.parse(localStorage.getItem(PEND) || "null"); return p && p.email && Date.now() - (p.at || 0) < 864e5 ? p : null; } catch (e) { return null; } }
function post(path, body) {
  return timed(fetch(API + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }), 15000)
    .then(function (r) { return r.json().catch(function () { return { ok: false }; }); }, function () { return { ok: false, error: "That didn't go through. Check your connection and try again." }; });
}
/* the Worker saved the sign-up and sent the email: on to the code */
function checkEmail(j, d) {
  savePend({ email: j.email || d.email, first: d.first, last: d.last, at: Date.now() });
  if (j.dev_code) console.info("[early access] dev worker: the code is " + j.dev_code);
  sheet.querySelector("[data-wl-cmail]").textContent = pend.email;
  clearOtp(); cerr("");
  if (ORDER[at] !== "check") setStep(ORDER.indexOf("check"));
  resendIn(j.resend_in);
  if (j.capped) cerr("We've sent a few codes already. Use the newest one, or try again in an hour.");
  else if (!j.sent && !(j.resend_in > 0)) cerr("We couldn't send the email just now. Tap Send a new code.");
}
/* confirmed (or an email that already was): the place, saved on this device, then You're in */
function landed(j, d) {
  var rec = { first: j.first || d.first, last: (d && d.last) || j.last || "", code: j.code, position: j.position, total: j.total, referrals: j.referrals || 0, boost: j.boost || 0, front: !!j.front, pass: j.pass || "", at: Date.now() };
  try { localStorage.setItem(KEY, JSON.stringify(rec)); sessionStorage.removeItem("studio-ref"); } catch (x) {}
  savePend(null); clearDraft();
  showDone(rec);
}
function verify() {
  if (checking || ORDER[at] !== "check" || otpCode().length !== 6 || !pend) return;
  checking = true; otpBox.classList.add("busy"); go.classList.add("busy"); badOtp(false); cerr("");
  var ask = FAKE ? SK.sleep(900).then(function () { return { ok: true, code: code6().toUpperCase(), first: pend.first, position: 118 + Math.floor(Math.random() * 60), total: 412, referrals: 0, boost: 10 }; })
    : post("/confirm", { email: pend.email, code: otpCode() });
  ask.then(function (j) {
    otpBox.classList.remove("busy");
    if (j && j.ok) {
      otpBox.classList.add("ok"); SFX.play("land");
      var p = pend; setTimeout(function () { landed(j, p); }, SK.reduced ? 0 : 520);
      return;
    }
    badOtp(true); SFX.play("tick");
    cerr((j && j.error) || "That didn't go through. Try again.");
    if (j && j.expired) { resendIn(0); chint.hidden = true; }
    setTimeout(function () { otp.forEach(function (i) { i.value = ""; i.classList.remove("has"); }); if (ORDER[at] === "check") otp[0].focus({ preventScroll: true }); go.disabled = true; }, 650);
  }).then(function () { checking = false; go.classList.remove("busy"); });
}
resendB.addEventListener("click", function () {
  if (resendB.disabled || !pend) return;
  cerr(""); resendB.disabled = true;
  (FAKE ? SK.sleep(500).then(function () { return { ok: true, sent: true, resend_in: 60 }; }) : post("/resend", { email: pend.email })).then(function (j) {
    if (j && j.confirmed) { cerr("That email is already confirmed. Tap Confirm my spot in the email to see your place."); resendIn(0); return; }
    if (j && j.ok && j.sent) { toast("A new code is on its way to " + pend.email + "."); clearOtp(); otp[0].focus({ preventScroll: true }); if (j.dev_code) console.info("[early access] dev worker: the code is " + j.dev_code); }
    else if (j && j.capped) cerr("We've sent a few codes already. Use the newest one, or try again in an hour.");
    else cerr((j && j.error) || "We couldn't send the email just now. Try again in a moment.");
    resendIn(j && j.resend_in);
  });
});
sheet.querySelector("[data-wl-other]").addEventListener("click", function () {
  clearOtp(); cerr(""); savePend(null); setStep(ORDER.indexOf("you"));
  setTimeout(function () { var m = form.elements.email; m.focus(); try { m.select(); } catch (x) {} }, 450);
});
/* the button in the email: askstudio.ai/?confirm=<token>#early-access. Taken off the address at once, then sent when the sheet opens. */
var PTOK = (Q.get("pass") || "").toLowerCase().replace(/[^0-9a-f]/g, "").slice(0, 64);
if (Q.has("pass")) try { Q.delete("pass"); history.replaceState(history.state, "", location.pathname + (Q.toString() ? "?" + Q : "") + location.hash); } catch (e) {}
if (PTOK && API) fetch(API + "/pass?t=" + encodeURIComponent(PTOK)).then(function (r) { return r.json(); }).then(function (j) {
  if (!j || !j.ok) return;
  try { localStorage.setItem(KEY, JSON.stringify({ first: j.first, last: j.last || "", code: j.code, position: j.position, total: j.total, referrals: j.referrals || 0, boost: j.boost || 0, front: !!j.front, pass: j.pass || PTOK, at: Date.now() })); } catch (e) {}
  if (sheet.classList.contains("open")) showDone(joined(), true); else open("pass");
}).catch(function () {});
var CTOK = (Q.get("confirm") || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
if (Q.has("confirm")) try { Q.delete("confirm"); history.replaceState(history.state, "", location.pathname + (Q.toString() ? "?" + Q : "") + location.hash); } catch (e) {}
function confirmLink() {
  var t = CTOK; CTOK = "";
  sheet.querySelector("[data-wl-cmail]").textContent = pend ? pend.email : "your inbox";
  if (ORDER[at] !== "check") setStep(ORDER.indexOf("check"), true);
  clearOtp(); otpBox.classList.add("busy"); cerr(""); resendIn(0);
  (FAKE ? SK.sleep(900).then(function () { return { ok: true, code: code6().toUpperCase(), first: pend ? pend.first : "there", position: 140, total: 412, referrals: 0, boost: 10 }; }) : post("/confirm", { token: t })).then(function (j) {
    otpBox.classList.remove("busy");
    if (j && j.ok) { otpBox.classList.add("ok"); SFX.play("land"); var p = pend || {}; setTimeout(function () { landed(j, p); }, SK.reduced ? 0 : 520); return; }
    if (pend) { cerr((j && j.error ? j.error.replace("Sign up again and we'll send a new one.", "Send a new code.") : "That didn't go through. Try the code instead.")); return; }
    setStep(0, true); toast((j && j.error) || "That link didn't work. Sign up again and we'll send a new one.");
  });
}

/* ---------- the keyboard on a phone: the field stays in view (visualViewport), the bar steps aside while it is up ---------- */
var KBD = !fine;
function kbKeep() {
  var a = document.activeElement; if (!a || !sheet.contains(a) || !a.matches("input, select")) return;
  var vv = window.visualViewport, vh = vv ? vv.height : innerHeight, top = vv ? vv.offsetTop : 0, r = a.getBoundingClientRect();
  var sc = sheet.classList.contains("done") ? doneEl : sheet.querySelector(".wl-in"), want = top + Math.min(vh * .3, 150);
  if (r.top < top + 64 || r.bottom > top + vh - 24) sc.scrollTop += r.top - want;
}
sheet.addEventListener("focusin", function (e) {
  if (!KBD || !e.target.matches("input:not([type=checkbox]), select")) return;
  sheet.classList.add("kb"); setTimeout(kbKeep, 320); setTimeout(kbKeep, 700);
});
sheet.addEventListener("focusout", function () {
  if (!KBD) return;
  setTimeout(function () { var a = document.activeElement; if (!(a && sheet.contains(a) && a.matches("input:not([type=checkbox]), select"))) sheet.classList.remove("kb"); }, 90);
});
if (window.visualViewport) visualViewport.addEventListener("resize", function () { if (sheet.classList.contains("kb")) kbKeep(); });

/* ---------- open / close ---------- */
function joined() { try { var j = JSON.parse(localStorage.getItem(KEY) || "null"); return j && j.first && j.code ? j : null; } catch (e) { return null; } } /* a sign-up saved without a code (the first version) counts as none */
function open(src) {
  from = src || from;
  if (sheet.classList.contains("open")) return;
  lastFocus = document.activeElement;
  if (!sky.getAttribute("src")) { sky.src = WALL.name; sheet.querySelectorAll(".pass .frost").forEach(function (f) { f.src = sky.src; }); }
  SFX.wake(); if (SFX.live()) SFX.bed.start();
  var j = joined();
  sheet.hidden = false; sheet.scrollTop = 0;
  html.classList.add("wl-open");
  if (SK.hush) SK.hush(true);
  clearTimeout(stillT); stillT = setTimeout(function () { if (sheet.classList.contains("open")) html.classList.add("wl-still"); }, SK.reduced ? 0 : 520);
  if (SK.kayla && SK.kayla.pause) SK.kayla.pause();
  if (!DEEP.test(location.hash)) { try { history.pushState({ wl: 1, step: at, d: 1 }, "", location.pathname + location.search + HASH); pushed = true; depth = 1; } catch (e) {} }
  else { depth = (history.state && history.state.d) || 0; try { history.replaceState(Object.assign({}, history.state, { wl: 1, step: at, d: depth }), ""); } catch (e) {} }
  requestAnimationFrame(function () { sizeStage(); requestAnimationFrame(function () { sheet.classList.add("open"); sizeStage(); }); });
  wallNow = sky.getAttribute("src"); SK.edgeTint(wallNow);
  count(); clearInterval(countT); countT = setInterval(count, 30000);
  if (!pend) pend = loadPend();
  if (CTOK) { wall("you"); confirmLink(); KAY.say(["confirm"]); }
  else if (j) showDone(j, true);
  else if (pend && at === 0) {   /* signed up on this device and the code is still waiting: back to it */
    form.elements.first.value = pend.first || ""; form.elements.last.value = pend.last || ""; form.elements.email.value = pend.email;
    sheet.querySelector("[data-wl-cmail]").textContent = pend.email;
    setStep(ORDER.indexOf("check"), true); wall("you"); pass1.start(); resendIn(0); KAY.say(["confirm"]); focusStep(SK.reduced ? 0 : 560);
  }
  else {
    wall(ORDER[at]); want(ORDER[at + 1]); personal(); reveal(steps[at]);
    if (ORDER[at] === "claude") askLoop();
    if (SCENE[ORDER[at]] === "you") pass1.start();
    drawHome();
    KAY.say(at === 0 ? ["intro"] : [LINE[ORDER[at]]]);
    focusStep(SK.reduced ? 0 : 560);
    setTimeout(typeStep, 700);
  }
}
function hide() {
  if (!sheet.classList.contains("open")) return;
  if (SK.edges) SK.edges();
  sheet.classList.remove("open"); html.classList.remove("wl-open", "wl-still"); clearTimeout(stillT); if (SK.hush) SK.hush(false); loopTok++; KAY.stop(); SFX.bed.stop(); pass1.stop(); pass2.stop(); clearInterval(countT);
  setTimeout(function () { if (!sheet.classList.contains("open")) sheet.hidden = true; }, SK.reduced ? 0 : 460);
  if (lastFocus && lastFocus.focus) try { lastFocus.focus({ preventScroll: true }); } catch (e) {}
}
function close() {
  if (pushed && depth > 0) { pushed = false; closing = true; history.go(-depth); return; }   /* popstate hides it */
  if (depth > 0) { closing = true; history.go(-depth); return; }
  hide();
  if (DEEP.test(location.hash)) try { history.replaceState(null, "", location.pathname + location.search.replace(/[?&]ref=[^&]*/, "").replace(/^&/, "?")); } catch (e) {}
}
window.addEventListener("popstate", function () {
  var st = history.state || {};
  depth = st.d || 0;
  if (closing) { closing = false; pushed = false; hide(); if (DEEP.test(location.hash)) try { history.replaceState(null, "", location.pathname + location.search.replace(/[?&]ref=[^&]*/, "").replace(/^&/, "?")); } catch (e) {} return; }
  if (!DEEP.test(location.hash)) { pushed = false; hide(); return; }
  if (!sheet.classList.contains("open")) { open("link"); return; }
  if (sheet.classList.contains("done")) { if (depth > 0) { closing = true; history.go(-depth); } else { pushed = false; hide(); } return; }
  var n = typeof st.step === "number" ? st.step : 0;
  while (n > 0 && !ready(n - 1)) n--;   /* never past a step that isn't answered */
  if (n !== at) setStep(n, false, true);
});
window.addEventListener("hashchange", function () { if (DEEP.test(location.hash)) open("link"); });
document.addEventListener("click", function (e) {
  var t = e.target.closest && e.target.closest("[data-early], a[href='" + HASH + "']");
  if (!t || sheet.contains(t)) return;
  e.preventDefault();
  open(t.getAttribute("data-early") || "link");
});
sheet.querySelectorAll("[data-wl-close]").forEach(function (b) { b.addEventListener("click", close); });
sheet.addEventListener("keydown", function (e) {
  if (e.key === "Escape") { e.preventDefault(); close(); return; }
  if (e.key === "Enter" && !sheet.classList.contains("done") && !/^(name|you|check)$/.test(ORDER[at]) && !e.target.closest(".wl-opt, .wl-back, input, .pass")) { e.preventDefault(); advance(); return; }
  if (e.key !== "Tab") return;
  var f = [].slice.call(sheet.querySelectorAll("button, input:not(.wl-hp), select, a[href], [tabindex='0']")).filter(function (x) { return !x.disabled && x.offsetParent !== null && getComputedStyle(x).visibility !== "hidden"; });
  if (!f.length) return;
  var i = f.indexOf(document.activeElement);
  if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
  else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
});
if (DEEP.test(location.hash)) setTimeout(function () { open(REF ? "friend" : "link"); }, SK.reduced ? 0 : 250);

/* a friend's invite: say whose */
if (REF && !joined()) {
  var refP = sheet.querySelector("[data-wl-ref]");
  var sayRef = function (f) {
    sheet.querySelector("[data-wl-ri]").textContent = (f || "S").charAt(0).toUpperCase();
    sheet.querySelector("[data-wl-ref-t]").textContent = f ? f + " saved you a spot." : "A friend saved you a spot.";
    refP.hidden = false;
  };
  if (API) fetch(API + "/status?code=" + encodeURIComponent(REF)).then(function (r) { return r.json(); }).then(function (j) { sayRef(j && j.ok ? j.first : ""); }, function () { sayRef(""); });
  else sayRef("");
}

/* ---------- You're in ---------- */
var doneEl = sheet.querySelector("[data-wl-done]"), rec = null;
function link(r) { return r && r.code ? (local ? location.origin + location.pathname : "https://askstudio.ai/") + "?ref=" + encodeURIComponent(r.code) + HASH : ""; }   /* the site's own address, wherever it was opened */
var SAY = "I just got early access to Studio. One prompt takes the idea in your head to a finished video. Join with my link and we both move up the list:";
function showDone(r, quiet) {
  var again = sheet.classList.contains("done");
  wall("in");
  rec = r;
  var ranked = typeof r.position === "number" && r.position > 0;
  sheet.querySelector("[data-wl-dhi]").textContent = "You're in, " + r.first + ".";
  var pos = sheet.querySelector("[data-wl-dpos]");
  pos.innerHTML = ranked ? '<b class="wl-roll"></b> ' + (r.front ? "at the front." : "on the list.") : "Welcome to Studio.";
  if (ranked) roll(pos.querySelector(".wl-roll"), "#" + place(r).toLocaleString("en-US"), again ? 0 : .9);
  var got = Math.min(GOAL, r.referrals || 0), front = !!r.front;
  sheet.querySelector("[data-wl-rhead]").textContent = !ranked ? "Know someone who'd want this?" : front ? "You're at the front of the line." : "Get 3 friends on the list. You all skip to the front.";
  sheet.querySelector("[data-wl-rboost]").textContent = !ranked ? "Send them your link. They get early access too."
    : front ? (got >= GOAL ? "3 friends joined with your link, so you and every friend from it are at the front for early access." : "A friend of yours got 3 friends on the list, so you're at the front with them.")
    : "When 3 friends join with your link, you and all 3 of them move to the front of the line for early access.";
  var gp = sheet.querySelector("[data-wl-goal]"); gp.hidden = !ranked; gp.style.setProperty("--p", front ? 1 : got / GOAL); gp.querySelector("em").textContent = (front ? GOAL : got) + "/" + GOAL; gp.classList.toggle("full", front);
  sheet.querySelector("[data-wl-slots]").hidden = !ranked;
  sheet.querySelectorAll("[data-wl-slots] li").forEach(function (li, i) { li.classList.toggle("got", i < (r.referrals || 0)); li.querySelector("span").textContent = i < (r.referrals || 0) ? "Joined" : "Friend " + (i + 1); });
  var url = link(r), urlEl = sheet.querySelector("[data-wl-url]"), shareBox = sheet.querySelector("[data-wl-share]"), copyB = sheet.querySelector("[data-wl-copy]");
  urlEl.textContent = url ? url.replace(/^https?:\/\//, "") : "Making your link…"; /* never "undefined": no code yet, no link yet */
  urlEl.classList.toggle("wait", !url); copyB.disabled = !url; shareBox.style.pointerEvents = url ? "" : "none"; shareBox.style.opacity = url ? "" : ".4";
  pass2.set({ name: (r.first + " " + (r.last || "")).trim(), mail: ranked ? "On the list since " + new Date(r.at || Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "On the list", k1: "Place", no: ranked ? "#" + place(r).toLocaleString("en-US") : "In", k3: "Friends", v3: Math.min(3, r.referrals || 0) + " of 3", sig: ranked ? "No. " + ("000" + place(r)).slice(-4) : "Studio", seed: r.code || r.first });
  var t = encodeURIComponent(SAY), u = encodeURIComponent(url);
  var hrefs = { sms: "sms:?&body=" + encodeURIComponent(SAY + " " + url), x: "https://twitter.com/intent/tweet?text=" + t + "&url=" + u, mail: "mailto:?subject=" + encodeURIComponent("Get early access to Studio") + "&body=" + encodeURIComponent(SAY + "\n\n" + url) };
  sheet.querySelectorAll("[data-sh]").forEach(function (a) { var k = a.getAttribute("data-sh"); if (hrefs[k]) a.href = hrefs[k]; });
  sheet.querySelector('[data-sh="more"]').hidden = !navigator.share;
  loopTok++; pass1.stop();
  if (!again) {
    /* the pass on the invite step glides into its place on You're in (one object, not a cut); without it in view, it spins in */
    var p1 = sheet.querySelector("[data-wl-pass1]"), r1 = p1.getBoundingClientRect();
    var glide = !SK.reduced && innerWidth > 960 && r1.width > 80 && r1.right > 0 && r1.left < innerWidth && sheet.getAttribute("data-step") !== "name";
    sheet.classList.add("done"); sheet.classList.remove("shown");
    sheet.scrollTop = 0; doneEl.scrollTop = 0;
    if (glide) {
      var ds = sheet.querySelector(".wl-dstage"), p2 = sheet.querySelector("[data-wl-pass2]"), r2 = p2.getBoundingClientRect(), dr = ds.getBoundingClientRect();
      var cx2 = r2.left + r2.width / 2, cy2 = r2.top + r2.height / 2, k = r1.width / r2.width;
      ds.style.transition = "none"; ds.style.transformOrigin = (cx2 - dr.left) + "px " + (cy2 - dr.top) + "px";
      ds.style.transform = "translate(" + (r1.left + r1.width / 2 - cx2) + "px, " + (r1.top + r1.height / 2 - cy2) + "px) scale(" + k.toFixed(4) + ")";
      void ds.offsetWidth;
      ds.style.transition = "transform 1.15s cubic-bezier(.65, 0, .25, 1)"; ds.style.transform = "";
      pass2.start();
      setTimeout(function () { ds.style.transition = ""; ds.style.transformOrigin = ""; pass2.land(); }, 1180);
    } else pass2.enter(2100);
    var dh = sheet.querySelector(".wl-dh");
    if (!SK.reduced) { var n = 0; dh.querySelectorAll("span").forEach(function (sp) { if (!sp.closest(".wl-roll")) n = words(sp, n); }); doneEl.classList.add("w0"); void doneEl.offsetWidth; setTimeout(function () { doneEl.classList.remove("w0"); }, 500); }
    setTimeout(function () { sheet.classList.add("shown"); }, SK.reduced ? 0 : 900);
    SFX.bed.swell();
    KAY.say(["in", "share"]);
  }
  if (!quiet) setTimeout(function () { doneEl.focus({ preventScroll: true }); }, 600);
  var pl = sheet.querySelector("[data-wl-plink]"); pl.hidden = !r.pass;
  if (API && r.code) fetch(API + (r.pass ? "/pass?t=" + encodeURIComponent(r.pass) : "/status?code=" + encodeURIComponent(r.code))).then(function (x) { return x.json(); }).then(function (j) {
    if (!j || !j.ok || !rec || rec.code !== r.code) return;
    if (j.position === r.position && j.referrals === r.referrals && !!j.front === !!r.front) return;
    var n = Object.assign({}, r, { position: j.position, total: j.total, referrals: j.referrals, boost: j.boost, front: !!j.front });
    try { localStorage.setItem(KEY, JSON.stringify(n)); } catch (x) {}
    showDone(n, true);
  }).catch(function () {});
}
sheet.querySelector("[data-wl-copy]").addEventListener("click", function () {
  if (!rec || !rec.code) return;
  var url = link(rec), b = this, sp = b.querySelector("span:not(.gx-beam):not([data-beam-bloom])");
  var ok = function () { sp.textContent = "Copied"; toast("Link copied. Send it to three friends."); setTimeout(function () { sp.textContent = "Copy link"; }, 2200); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(ok, function () { old(url); ok(); }); else { old(url); ok(); }
});
function old(text) { var t = document.createElement("textarea"); t.value = text; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0"; document.body.appendChild(t); t.select(); try { document.execCommand("copy"); } catch (e) {} t.remove(); }
sheet.querySelector('[data-sh="more"]').addEventListener("click", function (e) { e.preventDefault(); if (rec && rec.code && navigator.share) navigator.share({ title: "Studio", text: SAY, url: link(rec) }).catch(function () {}); });
sheet.querySelector('[data-sh="ig"]').addEventListener("click", function (e) { e.preventDefault(); if (rec && rec.code) story(rec, "story"); });
sheet.querySelector('[data-sh="save"]').addEventListener("click", function (e) { e.preventDefault(); if (rec && rec.code) story(rec, "save"); });
sheet.querySelector("[data-wl-fliph]").textContent = fine ? "Drag to turn · click to flip" : "Tap to flip";

/* ---------- start over: "Not you?" on the done screen, and Restart on localhost or with ?early. Clears the saved sign-up. ---------- */
function startOver() {
  try { localStorage.removeItem(KEY); } catch (e) {}
  savePend(null); clearOtp(); cerr(""); clearInterval(resendT); clearDraft();
  rec = null; ans = { roles: [], brands: "", claude: "" }; loopTok++; pass2.stop();
  sheet.querySelectorAll(".wl-opt.sel").forEach(function (o) { o.classList.remove("sel"); o.setAttribute("aria-pressed", "false"); });
  inputs.forEach(function (i) { i.value = ""; }); form.elements.company.value = ""; form.elements.sms_notify.checked = false; form.elements.sms_marketing.checked = false; other.hidden = true;
  mark([], ""); sheet.querySelectorAll(".wl-err").forEach(function (e) { e.textContent = ""; });
  steps.forEach(function (s, i) { s.classList.remove("past"); s.classList.toggle("on", i === 0); });
  Object.keys(scenes).forEach(function (k) { scenes[k].classList.remove("past"); scenes[k].classList.toggle("on", k === SCENE[ORDER[0]]); });
  box.style.height = "";
  at = 0; sheet.classList.remove("done", "shown");
  drawHome(); drawBrands(); drawClaude(); setStep(0, true);
  sheet.scrollTop = 0;
  KAY.say(["name"]); focusStep(300);
}
sheet.querySelector("[data-wl-over]").addEventListener("click", startOver);
sheet.querySelector("[data-wl-plink]").addEventListener("click", function () {
  if (!rec || !rec.pass) return;
  var u = (local ? location.origin + location.pathname : "https://askstudio.ai/") + "?pass=" + rec.pass;
  var ok = function () { toast("Your pass link is copied. It's just for you: open it on any device to see your friends join."); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(u).then(ok, function () { old(u); ok(); }); else { old(u); ok(); }
});
var restartB = sheet.querySelector("[data-wl-restart]");
restartB.hidden = !(local || Q.has("review"));   /* review only: never on the live site */
restartB.addEventListener("click", startOver);

/* the story image (Story and Save image): 1080 x 1920, drawn here on a canvas. Their pass floating on the You're in sky, the Studio app
   large and running off the right edge (as on the site's phone hero), askstudio.ai. Phones share it (Instagram, Save Image); elsewhere
   it downloads. Glass is real: each pane is the sky blurred behind it, then the pane drawn over. No video. */
function img(src) { return new Promise(function (res) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = function () { res(null); }; i.src = src; }); }
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
var storyBusy = false;
async function story(r, mode) {
  if (storyBusy) return; storyBusy = true;
  try {
    var url = link(r), W = 1080, Hh = 1920, cv = document.createElement("canvas"); cv.width = W; cv.height = Hh;
    var g = cv.getContext("2d"), sky0 = await img("assets/wl/in-m.jpg"), ui = await img("assets/wl/story-ui.webp"), mark = await img("assets/email/studio-lockup.png");   /* the crisp white lockup, never the glass mark */
    try { await document.fonts.ready; } catch (e) {}
    var F = "'Hanken Grotesk', 'Helvetica Neue', Helvetica, sans-serif", MO = "'IBM Plex Mono', Menlo, monospace";
    /* the sky, and a blurred copy of it for the glass */
    var sky = document.createElement("canvas"); sky.width = W; sky.height = Hh; var sg = sky.getContext("2d");
    sg.fillStyle = "#0E191E"; sg.fillRect(0, 0, W, Hh);
    if (sky0) { var s0 = Math.max(W / sky0.width, Hh / sky0.height); sg.drawImage(sky0, (W - sky0.width * s0) / 2, (Hh - sky0.height * s0) / 2, sky0.width * s0, sky0.height * s0); }
    var fr = document.createElement("canvas"); fr.width = W; fr.height = Hh; var fg = fr.getContext("2d"); fg.filter = "blur(34px) saturate(1.35)"; fg.drawImage(sky, 0, 0); fg.filter = "none";
    g.drawImage(sky, 0, 0);
    var gr = g.createLinearGradient(0, 0, 0, Hh); gr.addColorStop(0, "rgba(5,9,10,.34)"); gr.addColorStop(.38, "rgba(5,9,10,.06)"); gr.addColorStop(1, "rgba(5,9,10,.42)"); g.fillStyle = gr; g.fillRect(0, 0, W, Hh);
    /* the app: large, from the left margin, off the right edge */
    if (ui) {
      var uw = 1560, uh = Math.round(uw * ui.height / ui.width), ux = 84, uy = 1196;   /* the real Home, large, off the right edge */
      var m = document.createElement("canvas"); m.width = W; m.height = Hh; var mg = m.getContext("2d");
      mg.drawImage(fr, 0, 0); mg.globalCompositeOperation = "destination-in"; mg.drawImage(ui, ux, uy, uw, uh);
      g.drawImage(m, 0, 0); g.drawImage(ui, ux, uy, uw, uh);
      /* their own greeting and brand chip on the Home (the image is captured without them; positions are the app's, at 1440 wide) */
      var k = uw / 1440, nm = r.first || "", bn = nm ? nm + "'s brand" : "Your brand";
      g.save(); g.textBaseline = "top"; g.fillStyle = "#fff"; g.font = "300 " + Math.round(58 * k) + "px " + F; try { g.letterSpacing = (-0.035 * 58 * k).toFixed(1) + "px"; } catch (e) {}
      g.fillText(greet() + (nm ? ", " + nm : ""), ux + 289 * k, uy + 73 * k + 2); try { g.letterSpacing = "0px"; } catch (e) {}
      var dstr = new Date().toLocaleDateString("en-US", { weekday: "long" }) + " · " + new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" });
      g.font = "500 " + Math.round(10.5 * k) + "px " + MO; g.fillStyle = "rgba(255,255,255,.92)"; try { g.letterSpacing = (0.2 * 10.5 * k).toFixed(1) + "px"; } catch (e) {}
      g.fillText(dstr.toUpperCase(), ux + 292 * k, uy + 40 * k); try { g.letterSpacing = "0px"; } catch (e) {}
      g.font = "400 " + Math.round(13.5 * k) + "px " + F; var cw = g.measureText(bn).width, cx = ux + 292 * k, cy = uy + 325 * k, ch = 36 * k, chw = cw + 50 * k;
      rr(g, cx, cy, chw, ch, ch / 2); g.fillStyle = "rgba(12,19,28,.42)"; g.fill(); g.strokeStyle = "rgba(255,255,255,.32)"; g.lineWidth = 1.2; g.stroke();
      var mg2 = g.createLinearGradient(cx, cy, cx + 26 * k, cy + 26 * k); mg2.addColorStop(0, "#DFEAE8"); mg2.addColorStop(1, "#536878");
      rr(g, cx + 5 * k, cy + 5 * k, 26 * k, 26 * k, 8 * k); g.fillStyle = mg2; g.fill();
      g.fillStyle = "#05090A"; g.font = "600 " + Math.round(12 * k) + "px " + F; g.textAlign = "center"; g.fillText((nm || "Y").charAt(0).toUpperCase(), cx + 18 * k, cy + 11 * k);
      g.textAlign = "left"; g.fillStyle = "#fff"; g.font = "400 " + Math.round(13.5 * k) + "px " + F; g.fillText(bn, cx + 39 * k, cy + 11 * k);
      g.restore();
      var fade = g.createLinearGradient(0, Hh - 260, 0, Hh); fade.addColorStop(0, "rgba(5,9,10,0)"); fade.addColorStop(1, "rgba(5,9,10,.55)"); g.fillStyle = fade; g.fillRect(0, Hh - 260, W, 260);
    }
    /* the words */
    g.fillStyle = "#fff"; g.textAlign = "left"; g.textBaseline = "alphabetic";
    if (mark) g.drawImage(mark, 84, 120, 236, Math.round(236 * mark.height / mark.width));
    g.font = "300 112px " + F; g.fillText("I'm on the list.", 80, 380);
    g.fillStyle = "rgba(245,243,238,.82)"; g.font = "400 42px " + F; g.fillText("One prompt. A finished video.", 84, 450);
    g.fillStyle = "#fff"; g.font = "400 34px " + MO; g.fillText("askstudio.ai", 84, 510);
    /* the pass: glass over the sky, tilted a little */
    var pw = 880, ph = Math.round(pw * .62), px = (W - pw) / 2, py = 590;
    g.save(); g.translate(W / 2, py + ph / 2); g.rotate(-.045); g.translate(-W / 2, -(py + ph / 2));
    g.shadowColor = "rgba(0,0,0,.45)"; g.shadowBlur = 90; g.shadowOffsetY = 40; rr(g, px, py, pw, ph, 58); g.fillStyle = "rgba(14,19,28,.5)"; g.fill(); g.shadowColor = "transparent";
    g.save(); rr(g, px, py, pw, ph, 58); g.clip(); g.drawImage(fr, 0, 0);
    var pg = g.createLinearGradient(px, py, px + pw, py + ph); pg.addColorStop(0, "rgba(255,255,255,.2)"); pg.addColorStop(.46, "rgba(255,255,255,.05)"); pg.addColorStop(1, "rgba(160,200,255,.12)");
    g.fillStyle = "rgba(14,19,28,.6)"; g.fillRect(px, py, pw, ph); g.fillStyle = pg; g.fillRect(px, py, pw, ph); g.restore();
    rr(g, px + 1, py + 1, pw - 2, ph - 2, 57); g.strokeStyle = "rgba(255,255,255,.42)"; g.lineWidth = 2; g.stroke();
    var L = px + 62;
    if (mark) g.drawImage(mark, L, py + 50, 150, Math.round(150 * mark.height / mark.width));
    g.textAlign = "right"; g.fillStyle = "rgba(245,243,238,.78)"; g.font = "500 21px " + MO; g.fillText("EARLY ACCESS · INVITE", px + pw - 62, py + 80); g.textAlign = "left";
    g.fillStyle = "rgba(245,243,238,.55)"; g.font = "500 20px " + MO; g.fillText("INVITE FOR", L, py + 158);
    g.fillStyle = "#fff"; g.font = "300 84px " + F; g.fillText(((r.first || "") + " " + (r.last || "")).trim() || "You", L, py + 242);
    var ranked = typeof r.position === "number" && r.position > 0;
    g.fillStyle = "rgba(245,243,238,.55)"; g.font = "500 20px " + MO; g.fillText(ranked ? "PLACE" : "STATUS", L, py + 330); g.fillText("TRIAL", L + 390, py + 330);
    g.fillStyle = "#fff"; g.font = "400 76px " + MO; g.fillText(ranked ? "#" + place(r).toLocaleString("en-US") : "IN", L, py + 408);
    g.font = "500 38px " + F; g.fillText("14 days, free", L + 390, py + 402);
    g.fillStyle = "rgba(245,243,238,.86)"; for (var bx = L, k = 7; bx < px + pw - 62; k = (k * 16807) % 2147483647) { var bw = 2 + (k % 4) * 2.2; g.fillRect(bx, py + 452, bw, 46); bx += bw + 6; }
    g.restore();
    /* the address */
    g.textAlign = "left";
    var blob = await new Promise(function (res) { cv.toBlob(res, "image/png"); });
    if (!blob) return;
    var file = new File([blob], "studio-pass.png", { type: "image/png" });
    if (!fine && navigator.canShare && navigator.canShare({ files: [file] })) {   /* phones: the share sheet (Instagram, Save Image); computers: a download */
      try { await navigator.share(mode === "story" ? { files: [file], text: SAY + " " + url } : { files: [file] }); return; } catch (e) { if (e && e.name === "AbortError") return; }
    }
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
    if (mode === "story" && navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).catch(function () {});
    toast(mode === "story" ? "Image saved. Post it, and add your link with the link sticker (copied)." : "Image saved.");
  } finally { storyBusy = false; }
}

/* first paint */
var draftAt = loadDraft();
drawHome(); drawBrands(); drawClaude(); drawPass(); setStep(draftAt, true);
