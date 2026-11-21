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
  var AC = window.AudioContext || window.webkitAudioContext, ctx = null, buf = {}, last = {};
  var GAIN = { click: .5, tick: .16, key: .26, move: .38, send: .6, land: .45, done: .5 };
  function wake() {
    if (!AC || ctx) { if (ctx && ctx.state === "suspended") ctx.resume(); return; }
    try { ctx = new AC(); } catch (e) { return; }
    Object.keys(GAIN).forEach(function (n) {
      fetch("assets/sfx/" + n + ".wav").then(function (r) { return r.ok ? r.arrayBuffer() : null; }).then(function (d) {
        if (d) ctx.decodeAudioData(d, function (b) { buf[n] = b; }, function () {});
      }).catch(function () {});
    });
  }
  function play(n, o) {
    o = o || {};
    if (!SOUND || !ctx || !buf[n] || SK.reduced && n === "tick") return;
    var now = performance.now(), gap = { tick: 60, key: 55 }[n] || 0;
    if (gap && last[n] && now - last[n] < gap) return;
    last[n] = now;
    var s = ctx.createBufferSource(), g = ctx.createGain();
    s.buffer = buf[n]; s.playbackRate.value = o.rate || (n === "key" || n === "tick" ? .94 + Math.random() * .12 : 1);
    g.gain.value = (GAIN[n] || .4) * (o.gain || 1);
    var out = g;
    if (o.pan && ctx.createStereoPanner) { var p = ctx.createStereoPanner(); p.pan.value = o.pan; g.connect(p); p.connect(ctx.destination); } else g.connect(ctx.destination);
    s.connect(g); s.start();
  }
  return { wake: wake, play: play };
})();

/* Kayla, inside the sign-up: one line per step, her face and her voice moving, the words as she says them. Tap her to hear it again. */
var KAY = (function () {
  var LINES = {
    hello: "Hi, I'm Kayla. Let's get you into Studio. It only takes a minute.", name: "First things first. What should I call you?",
    roles: "Nice to meet you. So, what do you do? Pick everything that fits.", brands: "And how many brands are you making content for?",
    claude: "Studio runs on Claude. If you don't use it yet, that's totally fine. We'll help you set it up later.",
    invite: "Last thing. Where should we send your invite?", in: "You're in. Welcome to Studio. When your invite lands, you get fourteen days of everything, free.",
    share: "Want to move up the list? Share your link with three friends."
  };
  var pill = sheet.querySelector("[data-wl-kay]"), cap = sheet.querySelector("[data-wl-kt]"), kw = sheet.querySelector("[data-wl-kw]"), a = new Audio(), queue = [], cur = null, blocked = false, tok = 0, dur = {}, peaks = {};
  a.preload = "auto";
  Object.keys(LINES).forEach(function (k) { fetch("assets/audio/wl-" + k + ".json").then(function (r) { return r.json(); }).then(function (j) { dur[k] = j.duration; peaks[k] = j.peaks; }).catch(function () {}); });
  function wave(k) {
    var p = peaks[k] || [], n = 34, out = "";
    for (var i = 0; i < n; i++) { var v = p.length ? p[Math.floor(i * p.length / n)] : .3 + .5 * Math.abs(Math.sin(i * 1.7)); out += '<i style="height:' + Math.max(12, Math.round(v * 100)) + '%"></i>'; }
    kw.innerHTML = out;
  }
  a.addEventListener("timeupdate", function () { var bars = kw.children, f = a.duration ? a.currentTime / a.duration : 0; for (var i = 0; i < bars.length; i++) bars[i].classList.toggle("on", i / bars.length < f); });
  function words(k, all) {
    cap.innerHTML = LINES[k].split(" ").map(function (w) { return "<span" + (all ? ' class="on"' : "") + ">" + esc(w) + "</span>"; }).join(" ");
  }
  function reveal(k, my) {
    var spans = cap.querySelectorAll("span"), d = Math.max(1.2, (dur[k] || 6) - 3) * 1000, step = d / Math.max(1, spans.length);
    spans.forEach(function (s, i) { setTimeout(function () { if (my === tok) s.classList.add("on"); }, 600 + i * step); });
  }
  function next() {
    var my = ++tok;
    cur = queue.shift();
    if (!cur) { pill.classList.remove("talk"); return; }
    words(cur, !SOUND); wave(cur);
    if (!SOUND) { pill.classList.remove("talk"); return; }
    a.src = "assets/audio/wl-" + cur + ".mp3";
    var p = a.play();
    pill.classList.add("talk"); pill.classList.remove("ask");
    reveal(cur, my);
    if (p && p.catch) p.catch(function () { if (my !== tok) return; blocked = true; pill.classList.remove("talk"); pill.classList.add("ask"); words(cur, true); });
  }
  a.addEventListener("ended", function () { setTimeout(next, 250); });
  function say(keys) { queue = [].concat(keys); a.pause(); next(); }
  function stop() { tok++; queue = []; a.pause(); pill.classList.remove("talk"); }
  pill.addEventListener("click", function () { if (cur) { blocked = false; say([cur].concat(queue)); } });
  /* a sign-up opened by a link has had no click yet, so the first line may be refused: the first tap anywhere in it plays her */
  sheet.addEventListener("pointerdown", function () { if (blocked && cur) { blocked = false; say([cur].concat(queue)); } }, true);
  return { say: say, stop: stop, text: function (k) { return LINES[k]; } };
})();
var sndB = sheet.querySelector("[data-wl-snd]");
function setSound(on) {
  SOUND = on; sndB.setAttribute("aria-pressed", on ? "true" : "false"); sndB.setAttribute("aria-label", on ? "Sound on" : "Sound off");
  try { localStorage.setItem("studio-wl-sound", on ? "on" : "off"); } catch (e) {}
  if (!on) KAY.stop();
}
setSound(SOUND);
sndB.addEventListener("click", function () { setSound(!SOUND); if (SOUND) { SFX.wake(); SFX.play("click"); } });
/* the pointer: a soft tick on hover (mouse only), a click on press; a key for every few letters typed */
sheet.addEventListener("pointerover", function (e) { if (!fine) return; var t = e.target.closest && e.target.closest(".wl-opt, button, .wl-sh, a"); if (t && !t.contains(e.relatedTarget)) SFX.play("tick"); });
sheet.addEventListener("pointerdown", function (e) { SFX.wake(); if (e.target.closest && e.target.closest(".wl-opt, button, .wl-sh, a")) SFX.play("click"); });
sheet.addEventListener("input", function (e) { if (e.target.matches("input")) SFX.play("key"); });

/* ---------- the sheet ---------- */
var form = sheet.querySelector(".wl-form"), box = sheet.querySelector(".wl-steps"), steps = [].slice.call(sheet.querySelectorAll(".wl-q"));
sheet.appendChild(sheet.querySelector(".wl-dock")); /* the bar and Kayla sit on the sheet, above both the questions and You're in (the submit button stays tied to the form) */
var ORDER = steps.map(function (s) { return s.getAttribute("data-q"); });
/* a wallpaper per step, from the app's own set; the next one is fetched and decoded ahead, then crossfaded in */
var PHONE = matchMedia("(max-width: 700px) and (max-aspect-ratio: 3/4)").matches;
var WALL = { name: PHONE ? "assets/hero/sky-m.jpg" : "assets/hero/sky.jpg" };
["roles", "brands", "claude", "you", "in"].forEach(function (k) { WALL[k] = "assets/wl/" + k + (PHONE ? "-m" : "") + ".jpg"; });
var wallCache = {}, wallTok = 0, wallNow = "";
function want(k) {
  var u = WALL[k]; if (!u) return Promise.resolve("");
  if (!wallCache[u]) { var i = new Image(); i.decoding = "async"; i.src = u; wallCache[u] = (i.decode ? i.decode() : new Promise(function (r) { i.onload = r; })).then(function () { return u; }, function () { return u; }); }
  return wallCache[u];
}
function wall(k) {
  var u = WALL[k] || WALL.name; if (u === wallNow) return; wallNow = u; var tok = ++wallTok, bg = sky.parentNode;
  want(k).then(function () {
    if (tok !== wallTok) return;
    var nx = document.createElement("img"); nx.className = "wl-sky nx"; nx.alt = ""; nx.src = u; bg.appendChild(nx);
    requestAnimationFrame(function () { requestAnimationFrame(function () { nx.classList.add("in"); }); });
    setTimeout(function () { if (tok !== wallTok) return; [].slice.call(bg.querySelectorAll(".wl-sky")).forEach(function (o) { if (o !== nx && o !== sky) o.remove(); else if (o === sky) sky.classList.add("gone"); }); }, 1400);
    sheet.querySelectorAll(".pass .frost").forEach(function (f) { f.src = u; });
  });
}
var LINE = { name: "name", roles: "roles", brands: "brands", claude: "claude", you: "invite" };
var SCENE = { name: "home", roles: "home", brands: "home", claude: "claude", you: "you" }; /* question 3 opens Home's All brands menu */
var segs = [].slice.call(sheet.querySelectorAll(".wl-seg i")), scenes = {};
sheet.querySelectorAll(".wl-sc").forEach(function (s) { scenes[s.getAttribute("data-sc")] = s; });
var back = sheet.querySelector("[data-wl-back]"), next = sheet.querySelector("[data-wl-next]"), go = sheet.querySelector(".wl-go");
var sky = sheet.querySelector(".wl-sky"), fit = sheet.querySelector(".wl-fit"), stage = sheet.querySelector(".wl-stage");
var sel = sheet.querySelector(".wl-cc select"), ccv = sheet.querySelector(".wl-ccv"), toastEl = sheet.querySelector("[data-wl-toast]");
var other = sheet.querySelector("[data-wl-other]"), otherIn = form.elements.other;
var at = 0, busy = false, pushed = false, lastFocus = null, from = "link", ans = { roles: [], brands: "", claude: "" };

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
function drawHome(typing) {
  var f = first(), hi = sheet.querySelector("[data-wl-hi-home]");
  hi.innerHTML = esc(greet()) + (f ? ", <b>" + esc(f) + "</b>" : "") + (typing ? "<i></i>" : "");
  sheet.querySelector("[data-wl-date]").textContent = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }).replace(",", " ·");
  sheet.querySelector("[data-wl-chips]").innerHTML = brandList().slice(0, 3).map(function (b) { return '<span class="wl-chip">' + mono(b) + esc(b.n) + "</span>"; }).join("");
  var r = ans.roles.map(function (x) { return x === "Something else" && val("other") ? val("other") : x; });
  sheet.querySelector("[data-wl-for]").textContent = r.length ? "For " + article(r[0]) + " " + list(r.map(function (x) { return x.toLowerCase(); })) : "Tell Studio who you are";
  var made = sheet.querySelector("[data-wl-made]"), have = [].slice.call(made.querySelectorAll(".wl-mc")).map(function (c) { return c.getAttribute("data-r"); });
  var want = ans.roles.slice(0, 4);
  if (have.join("|") === want.join("|") && made.children.length) return;
  var out = want.map(function (k, i) {
    var m = MADE[k], fresh = have.indexOf(k) < 0, t = k === "Something else" && val("other") ? val("other") : m[2];
    return '<span class="wl-mc' + (fresh ? " wl-in-a" : "") + '" data-r="' + esc(k) + '" style="--i:' + i + '"><img src="' + M + "selects/" + m[0] + '.jpg" alt=""><i>v01</i><span><em>' + esc(m[1]) + "</em><b>" + esc(t) + "</b></span></span>";
  });
  for (var i = want.length; i < 4; i++) out.push('<span class="wl-ph"></span>');
  made.innerHTML = out.join("");
}
function drawBrands() {
  var bl = brandList(), ul = sheet.querySelector("[data-wl-bl]"), have = ul.querySelectorAll(".wl-br").length;
  ul.innerHTML = bl.map(function (b, i) {
    return '<li class="wl-br' + (i === 0 ? " on" : "") + (i >= have ? " wl-in-a" : "") + '" style="--i:' + Math.max(0, i - have) + '">' + mono(b) + '<span class="wl-bt"><b>' + esc(b.n) + "</b><span>" + esc(b.s) + '</span></span><span class="wl-sw">' + b.sw.map(function (c) { return '<i style="background:' + c + '"></i>'; }).join("") + "</span></li>";
  }).join("") + (bl.length === 5 ? '<li class="wl-more wl-in-a" style="--i:5">And every brand you run</li>' : "");
  sheet.querySelector("[data-wl-allb-t]").textContent = ans.brands ? (bl.length === 1 ? bl[0].n : "All brands · " + ans.brands) : "All brands";
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
  if (!r.width) return;
  var mob = SK.mobile() || innerWidth <= 960;
  var s = mob ? Math.min(r.width / 980, 220 / 680) : Math.min((r.height || 680) / 660, (r.width + 150) / 980, 1.22); /* desktop: as tall as the space allows, running off the right edge like the opening film */
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
var pass2 = Pass(sheet.querySelector("[data-wl-pass2]"), { onLanded: function () { SFX.play("land"); } });
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
  return !!ans[q];
}
function personal() {
  var f = first();
  sheet.querySelectorAll("[data-wl-hi]").forEach(function (h) { var t = h.getAttribute("data-wl-hi"); h.textContent = f ? t.replace("{first}", f) : t.replace(", {first}", ""); });
}
function setStep(n, quiet) {
  var cur = steps[at], nx = steps[n], q = ORDER[n], dir = n > at ? 1 : -1;
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
  var last = q === "you";
  next.hidden = last; go.hidden = !last;
  scenes.home.classList.toggle("menu", q === "brands");
  next.disabled = !ready(n);
  if (SCENE[q] === "claude") { drawClaude(); claudeLoop(); } else loopTok++;
  if (SCENE[q] === "you") { drawPass(); pass1.start(); } else pass1.stop();
  if (SCENE[q] === "home") drawHome();
  if (!quiet && sheet.classList.contains("open")) KAY.say([LINE[q]]);
  if (!quiet) focusStep(SK.reduced ? 0 : 420);
  setTimeout(function () { typeStep(); }, quiet ? 0 : 520);
}
/* each empty field types its own example, left to right with a caret, when its step comes up; focus stops it where a normal
   placeholder would be, and any text hides it */
var TY = { first: "Evan", last: "Nicolini", other: "Photographer, coach, musician…", email: "you@studio.com", phone: "(555) 123-4567" };
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
  while ((t = w.nextNode())) if (!(t.parentNode.classList && t.parentNode.classList.contains("wl-bw")) && t.nodeValue.trim()) list.push(t);
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
  if (busy || at >= ORDER.length - 1) return;
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
      }
      next.disabled = !ready(at);
      if (q === "roles") drawHome(); else if (q === "brands") drawBrands(); else if (q === "claude") drawClaude();
      if (!multi) setTimeout(advance, SK.reduced ? 60 : 520); /* one answer: on to the next, once it has landed on the right */
    });
  });
});
next.addEventListener("click", advance);
back.addEventListener("click", function () { if (at > 0 && !busy) setStep(at - 1); });

/* ---------- the details: the beam runs round the field you're in; a field that needs you turns it auburn ---------- */
var inputs = [].slice.call(form.querySelectorAll("input:not(.wl-hp)"));
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
  });
  inp.addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    var here = [].slice.call(steps[at].querySelectorAll("input:not(.wl-hp)")).filter(function (x) { return x.offsetParent; }), i = here.indexOf(inp);
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
  if (local) { console.info("[early access] not connected yet (src/waitlist.json). Would send:", d); return SK.sleep(900).then(function () { return { ok: true, code: mine, first: d.first, position: 118 + Math.floor(Math.random() * 60), total: 412, referrals: 0, boost: 10 }; }); }
  return Promise.reject(new Error("not connected"));
}
form.addEventListener("submit", function (e) {
  e.preventDefault();
  if (ORDER[at] !== "you") { advance(); return; }
  if (go.classList.contains("busy")) return;
  var email = val("email"), phone = val("phone"), digits = phone.replace(/\D/g, ""), c = cc(), bad = [], msg = "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { bad.push("email"); msg = email ? "That email doesn't look quite right." : "Add your email."; }
  if (digits.length < 6 || digits.length > 15) { bad.push("phone"); msg = bad.length > 1 ? "Add your email and phone number." : phone ? "That phone number looks too short." : "Add your phone number."; }
  mark(bad, msg);
  if (bad.length) { form.elements[bad[0]].focus(); return; }
  var intl = /^\s*\+/.test(phone), roles = ans.roles.map(function (r) { return r === "Something else" && val("other") ? "Something else: " + val("other") : r; });
  var d = { first: val("first"), last: val("last"), email: email, phone: intl ? "+" + digits : digits.replace(/^0+/, ""), cc: intl ? "" : c[1], roles: roles, brands: ans.brands, claude: ans.claude, source: (local ? "hub-test · " : "") + SRC + " · " + from, ref: REF, hp: val("company") };
  go.classList.add("busy"); SFX.play("send");
  send(d).then(function (j) {
    var rec = { first: d.first, last: d.last, code: j.code, position: j.position, total: j.total, referrals: j.referrals || 0, boost: j.boost || 0, at: Date.now() };
    try { localStorage.setItem(KEY, JSON.stringify(rec)); sessionStorage.removeItem("studio-ref"); } catch (x) {}
    showDone(rec);
  }, function (x) {
    mark([], x && x.human ? x.message : "That didn't go through. Check your connection and try again.");
  }).then(function () { go.classList.remove("busy"); });
});

/* ---------- open / close ---------- */
function joined() { try { var j = JSON.parse(localStorage.getItem(KEY) || "null"); return j && j.first && j.code ? j : null; } catch (e) { return null; } } /* a sign-up saved without a code (the first version) counts as none */
function open(src) {
  from = src || from;
  if (sheet.classList.contains("open")) return;
  lastFocus = document.activeElement;
  if (!sky.getAttribute("src")) { sky.src = matchMedia("(max-width: 700px) and (max-aspect-ratio: 3/4)").matches ? "assets/hero/sky-m.jpg" : "assets/hero/sky.jpg"; sheet.querySelectorAll(".pass .frost").forEach(function (f) { f.src = sky.src; }); }
  SFX.wake();
  var j = joined();
  sheet.hidden = false; sheet.scrollTop = 0;
  html.classList.add("wl-open");
  if (SK.kayla && SK.kayla.pause) SK.kayla.pause();
  if (!DEEP.test(location.hash)) { try { history.pushState({ wl: 1 }, "", location.pathname + location.search + HASH); pushed = true; } catch (e) {} }
  requestAnimationFrame(function () { sizeStage(); requestAnimationFrame(function () { sheet.classList.add("open"); sizeStage(); }); });
  wallNow = sky.getAttribute("src");
  if (j) showDone(j, true);
  else {
    wall(ORDER[at]); want(ORDER[at + 1]); personal(); reveal(steps[at]);
    if (SCENE[ORDER[at]] === "claude") claudeLoop();
    if (SCENE[ORDER[at]] === "you") pass1.start();
    drawHome();
    KAY.say(at === 0 ? ["hello", "name"] : [LINE[ORDER[at]]]);
    focusStep(SK.reduced ? 0 : 560);
    setTimeout(typeStep, 700);
  }
}
function hide() {
  if (!sheet.classList.contains("open")) return;
  sheet.classList.remove("open"); html.classList.remove("wl-open"); loopTok++; KAY.stop(); pass1.stop(); pass2.stop();
  setTimeout(function () { if (!sheet.classList.contains("open")) sheet.hidden = true; }, SK.reduced ? 0 : 460);
  if (lastFocus && lastFocus.focus) try { lastFocus.focus({ preventScroll: true }); } catch (e) {}
}
function close() {
  if (pushed) { pushed = false; history.back(); return; } /* popstate hides it */
  hide();
  if (DEEP.test(location.hash)) try { history.replaceState(null, "", location.pathname + location.search.replace(/[?&]ref=[^&]*/, "").replace(/^&/, "?")); } catch (e) {}
}
window.addEventListener("popstate", function () { if (DEEP.test(location.hash)) open("link"); else { pushed = false; hide(); } });
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
  if (e.key === "Enter" && !sheet.classList.contains("done") && !/^(name|you)$/.test(ORDER[at]) && !e.target.closest(".wl-opt, .wl-back, input, .pass")) { e.preventDefault(); advance(); return; }
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
function link(r) { return r && r.code ? location.origin + location.pathname + "?ref=" + encodeURIComponent(r.code) + HASH : ""; }
var SAY = "I just got early access to Studio. One prompt takes the idea in your head to a finished video. Get on the list:";
function showDone(r, quiet) {
  var again = sheet.classList.contains("done");
  wall("in");
  rec = r;
  var ranked = typeof r.position === "number" && r.position > 0;
  sheet.querySelector("[data-wl-dhi]").textContent = "You're in, " + r.first + ".";
  var pos = sheet.querySelector("[data-wl-dpos]");
  pos.innerHTML = ranked ? "<b>#" + r.position.toLocaleString("en-US") + "</b> on the list." : "Welcome to Studio.";
  sheet.querySelector("[data-wl-rboost]").textContent = ranked && r.boost ? "Every friend who joins with your link moves you up " + r.boost + " spots." : "Send them your link. They get early access too.";
  sheet.querySelector(".wl-rtop b").textContent = ranked ? "Share with 3 friends to move up the list" : "Know someone who'd want this?";
  sheet.querySelector("[data-wl-slots]").hidden = !ranked;
  sheet.querySelectorAll("[data-wl-slots] li").forEach(function (li, i) { li.classList.toggle("got", i < (r.referrals || 0)); li.querySelector("span").textContent = i < (r.referrals || 0) ? "Joined" : "Friend " + (i + 1); });
  var url = link(r), urlEl = sheet.querySelector("[data-wl-url]"), shareBox = sheet.querySelector("[data-wl-share]"), copyB = sheet.querySelector("[data-wl-copy]");
  urlEl.textContent = url ? url.replace(/^https?:\/\//, "") : "Making your link…"; /* never "undefined": no code yet, no link yet */
  urlEl.classList.toggle("wait", !url); copyB.disabled = !url; shareBox.style.pointerEvents = url ? "" : "none"; shareBox.style.opacity = url ? "" : ".4";
  pass2.set({ name: (r.first + " " + (r.last || "")).trim(), mail: ranked ? "On the list since " + new Date(r.at || Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "On the list", k1: "Place", no: ranked ? "#" + r.position.toLocaleString("en-US") : "In", k3: "Friends", v3: Math.min(3, r.referrals || 0) + " of 3", sig: ranked ? "No. " + ("000" + r.position).slice(-4) : "Studio", seed: r.code || r.first });
  var t = encodeURIComponent(SAY), u = encodeURIComponent(url);
  var hrefs = { sms: "sms:?&body=" + encodeURIComponent(SAY + " " + url), wa: "https://wa.me/?text=" + encodeURIComponent(SAY + " " + url), x: "https://twitter.com/intent/tweet?text=" + t + "&url=" + u, mail: "mailto:?subject=" + encodeURIComponent("Get early access to Studio") + "&body=" + encodeURIComponent(SAY + "\n\n" + url) };
  sheet.querySelectorAll("[data-sh]").forEach(function (a) { var k = a.getAttribute("data-sh"); if (hrefs[k]) a.href = hrefs[k]; });
  sheet.querySelector('[data-sh="more"]').hidden = !navigator.share;
  loopTok++; pass1.stop();
  if (!again) {
    sheet.classList.add("done"); sheet.classList.remove("shown");
    sheet.scrollTop = 0; doneEl.scrollTop = 0;
    pass2.enter(2100);
    setTimeout(function () { sheet.classList.add("shown"); }, SK.reduced ? 0 : 900);
    SFX.play("done");
    KAY.say(["in", "share"]);
  }
  if (!quiet) setTimeout(function () { doneEl.focus({ preventScroll: true }); }, 600);
  if (API && r.code) fetch(API + "/status?code=" + encodeURIComponent(r.code)).then(function (x) { return x.json(); }).then(function (j) {
    if (!j || !j.ok || !rec || rec.code !== r.code) return;
    if (j.position === r.position && j.referrals === r.referrals) return;
    var n = Object.assign({}, r, { position: j.position, total: j.total, referrals: j.referrals, boost: j.boost });
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
sheet.querySelector('[data-sh="ig"]').addEventListener("click", function (e) { e.preventDefault(); if (rec && rec.code) story(rec); });

/* ---------- start over: "Not you?" on the done screen, and Restart on localhost or with ?early. Clears the saved sign-up. ---------- */
function startOver() {
  try { localStorage.removeItem(KEY); } catch (e) {}
  rec = null; ans = { roles: [], brands: "", claude: "" }; loopTok++; pass2.stop();
  sheet.querySelectorAll(".wl-opt.sel").forEach(function (o) { o.classList.remove("sel"); o.setAttribute("aria-pressed", "false"); });
  inputs.forEach(function (i) { i.value = ""; }); form.elements.company.value = ""; other.hidden = true;
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
var restartB = sheet.querySelector("[data-wl-restart]");
restartB.hidden = !(local || Q.has("review"));   /* review only: never on the live site */
restartB.addEventListener("click", startOver);

/* an Instagram story: a 1080 x 1920 picture of the pass. Phones share it straight to Instagram; elsewhere it saves, and the link is copied */
function img(src) { return new Promise(function (res) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = function () { res(null); }; i.src = src; }); }
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
async function story(r) {
  var url = link(r), W = 1080, Hh = 1920, cv = document.createElement("canvas"); cv.width = W; cv.height = Hh;
  var g = cv.getContext("2d"), bg = await img("assets/hero/sky-m.jpg"), mark = await img("assets/studio-mark.png");
  try { await document.fonts.ready; } catch (e) {}
  g.fillStyle = "#05090A"; g.fillRect(0, 0, W, Hh);
  if (bg) { var s = Math.max(W / bg.width, Hh / bg.height); g.drawImage(bg, (W - bg.width * s) / 2, (Hh - bg.height * s) * .4, bg.width * s, bg.height * s); }
  var gr = g.createLinearGradient(0, 0, 0, Hh); gr.addColorStop(0, "rgba(5,9,10,.35)"); gr.addColorStop(.5, "rgba(5,9,10,.15)"); gr.addColorStop(1, "rgba(5,9,10,.72)"); g.fillStyle = gr; g.fillRect(0, 0, W, Hh);
  var F = "'Hanken Grotesk', 'Helvetica Neue', Helvetica, sans-serif", MO = "'IBM Plex Mono', Menlo, monospace";
  g.fillStyle = "#fff"; g.textAlign = "center";
  if (mark) g.drawImage(mark, W / 2 - 150, 250, 64, 64);
  g.font = "600 56px " + F; g.textAlign = "left"; g.fillText("Studio", W / 2 - 66, 298); g.textAlign = "center";
  g.font = "300 118px " + F; g.fillText("I'm on the list.", W / 2, 560);
  g.fillStyle = "rgba(245,243,238,.8)"; g.font = "400 46px " + F; g.fillText("One prompt. A finished video.", W / 2, 650);
  g.save(); g.translate(W / 2, 1060); g.rotate(-.035);
  rr(g, -400, -250, 800, 500, 60); var pg = g.createLinearGradient(-400, -250, 400, 250); pg.addColorStop(0, "rgba(223,234,232,.3)"); pg.addColorStop(.45, "rgba(14,25,30,.72)"); pg.addColorStop(1, "rgba(5,9,10,.86)"); g.fillStyle = pg; g.fill();
  g.strokeStyle = "rgba(255,255,255,.4)"; g.lineWidth = 2; g.stroke();
  g.textAlign = "left"; g.fillStyle = "rgba(245,243,238,.7)"; g.font = "500 26px " + MO; g.fillText("EARLY ACCESS · INVITE", -340, -160);
  g.fillStyle = "#fff"; g.font = "300 92px " + F; g.fillText(r.first, -340, -40);
  g.fillStyle = "rgba(245,243,238,.6)"; g.font = "500 24px " + MO; g.fillText("PLACE", -340, 70); g.fillText("TRIAL", -80, 70);
  g.fillStyle = "#fff"; g.font = "500 52px " + MO; g.fillText(typeof r.position === "number" ? "#" + r.position : "IN", -340, 140);
  g.font = "500 42px " + F; g.fillText("14 days, free", -80, 136);
  g.restore();
  g.textAlign = "center"; g.fillStyle = "#fff"; g.font = "500 44px " + F; g.fillText("Get early access", W / 2, 1520);
  g.fillStyle = "rgba(245,243,238,.75)"; g.font = "400 34px " + MO; g.fillText(url.replace(/^https?:\/\//, "").replace(/#.*$/, ""), W / 2, 1580);
  var blob = await new Promise(function (res) { cv.toBlob(res, "image/png"); });
  if (!blob) return;
  var file = new File([blob], "studio-early-access.png", { type: "image/png" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], text: SAY + " " + url }); return; } catch (e) { if (e && e.name === "AbortError") return; }
  }
  var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).catch(function () {});
  toast("Story saved. Post it, and add your link with the link sticker (copied).");
}

/* first paint */
drawHome(); drawBrands(); drawClaude(); drawPass(); setStep(0, true);
