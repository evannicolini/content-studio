/* Start: the website sign-up, 14 days for $1 (section.html). The early-access sheet's design, step for step:
   1 sign in (Google, Apple, or email), 2 the email code, 3 the plan, 4 pay $1 inside the page (Stripe's Payment Element, in our glass),
   then You're in: the pass, the download starts by itself, Open Studio. A friend's invite (?i=CODE#signup) skips the plan and the card.
   The contract with the licence server (App & releases): scratchpad/accounts/WEB-SIGNUP.md.
   Off on the live site: it opens only on this Mac, or with ?review. On this Mac it runs on a stand-in (no account, no charge) unless
   ?live is in the address; Stripe's own test card (4242 4242 4242 4242) goes through the stand-in too. */
var Q = new URLSearchParams(location.search), H = new URLSearchParams(location.hash.replace(/^#[^&]*&?/, ""));
var local = /^(127\.0\.0\.1|localhost|\[::1\])$/.test(location.hostname);
var sheet = document.getElementById("signup");
if (!sheet) return;
var EMBED = window.parent !== window, PAYWALL0 = /^#paywall(&|$)/.test(location.hash) || Q.has("paywall");
if (!(local || Q.has("review") || Q.has("app") || EMBED && PAYWALL0)) { sheet.remove(); return; }   /* not a live CTA yet: this Mac, ?review, or Studio's own window (?app#paywall) */
var LIVE = !local || Q.has("live"), MOCK = !LIVE;
var CFG = {
  worker: "https://studio-licence.studio-licence.workers.dev",
  supabase: "https://nxbnmwxyocbqcjwzxtxi.supabase.co", supakey: "sb_publishable_LRI7yb4xTKyN5VehjqxQuQ_vuSVY7Hk",   /* public keys, made for browsers */
  stripe: Q.get("pk") || "", oauth: Q.has("oauth")
};
var DEMO_PK = "pk_test_TYooMQauvdEDq54NiTphI7jx";   /* Stripe's public demo key: draws the real card form on the stand-in */
var html = document.documentElement, HASH = /^#paywall/.test(location.hash) ? "#paywall" : "#signup", DEEP = /^#(signup|paywall)(&|$)/;
var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
var M = "assets/media/", fine = matchMedia("(pointer: fine)").matches, PHONE = matchMedia("(max-width: 700px) and (max-aspect-ratio: 3/4)").matches;
var $ = function (s) { return sheet.querySelector(s); }, $$ = function (s) { return [].slice.call(sheet.querySelectorAll(s)); };
var INV = (Q.get("i") || H.get("i") || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 24);
if (MOCK) $("[data-st-mode]").hidden = false;

/* ---------- sound: the app's own takes, as in early access; the same speaker setting ---------- */
var SOUND = true;
try { SOUND = localStorage.getItem("studio-wl-sound") !== "off"; } catch (e) {}
var SFX = (function () {
  var AC = window.AudioContext || window.webkitAudioContext, ctx = null, buf = {}, last = {};
  var GAIN = { click: .5, tick: .16, key: .26, move: .38, send: .6, land: .45, done: .5 };
  function wake() {
    if (!AC || ctx) { if (ctx && ctx.state === "suspended") ctx.resume(); return; }
    try { ctx = new AC(); } catch (e) { return; }
    Object.keys(GAIN).forEach(function (n) { fetch("assets/sfx/" + n + ".wav").then(function (r) { return r.ok ? r.arrayBuffer() : null; }).then(function (d) { if (d) ctx.decodeAudioData(d, function (b) { buf[n] = b; }, function () {}); }).catch(function () {}); });
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
    if (o.pan && ctx.createStereoPanner) { var p = ctx.createStereoPanner(); p.pan.value = o.pan; g.connect(p); p.connect(ctx.destination); } else g.connect(ctx.destination);
    s.connect(g); s.start();
  }
  return { wake: wake, play: play };
})();
var sndB = $("[data-st-snd]");
function setSound(on) { SOUND = on; sndB.setAttribute("aria-pressed", on ? "true" : "false"); sndB.setAttribute("aria-label", on ? "Sound on" : "Sound off"); try { localStorage.setItem("studio-wl-sound", on ? "on" : "off"); } catch (e) {} }
setSound(SOUND);
sndB.addEventListener("click", function () { setSound(!SOUND); if (SOUND) { SFX.wake(); SFX.play("click"); } });
sheet.addEventListener("pointerover", function (e) { if (!fine) return; var t = e.target.closest && e.target.closest(".st-way, .st-plan, button, a"); if (t && !t.contains(e.relatedTarget)) SFX.play("tick"); });
sheet.addEventListener("pointerdown", function (e) { SFX.wake(); if (e.target.closest && e.target.closest(".st-way, .st-plan, button, a")) SFX.play("click"); });
sheet.addEventListener("input", function (e) { if (e.target.matches("input")) SFX.play("key"); });

/* ---------- what we know ---------- */
var me = { first: "", email: "", session: null, hand: null, plan: "pro", period: "month", invite: null, paid: null, promo: null, notrial: null };
var form = $(".wl-form"), box = $(".wl-steps"), steps = $$(".wl-q");
sheet.appendChild($(".wl-dock"));
/* the website sign-up is free: sign in, the code, then You're in and the download. The plan and the $1 live in the paywall
   (#paywall), which Studio opens at the first export ("Keep your Studio: 14 days for $1"). */
var ORDER_ALL = ["in", "code", "plan", "pay"], ORDER = ["in", "code"];
/* the in-app paywall ("Unlock it: 14 days for $1"): only the plan and the pay steps, for someone already signed in to Studio.
   Studio opens #paywall in its own window and calls window.StudioPaywall.open({ token, first, email, handoff }) with the session it
   has; on this Mac #paywall alone opens it on the stand-in. When it's paid, it calls window.webkit.messageHandlers.studio (if there)
   with { unlocked: true, plan, period }, and its button goes back to Studio. */
var PAYWALL = /^#paywall(&|$)/.test(location.hash) || Q.has("paywall");
if (PAYWALL) { ORDER = ["plan", "pay"]; sheet.classList.add("paywall"); }
var SCENE = { "in": "home", code: "home", plan: "home", pay: "pass" };
var segs = $$("[data-st-seg] i"), scenes = {};
$$(".wl-sc").forEach(function (s) { scenes[s.getAttribute("data-sc")] = s; });
var back = $("[data-st-back]"), next = $("[data-st-next]"), go = $(".wl-go"), sky = $(".wl-sky"), fit = $(".wl-fit"), stage = $(".wl-stage"), toastEl = $("[data-st-toast]");
var at = 0, busy = false, pushed = false, lastFocus = null;
function toast(t) { toastEl.textContent = t; toastEl.classList.add("on"); clearTimeout(toastEl._t); toastEl._t = setTimeout(function () { toastEl.classList.remove("on"); }, 2600); }
function val(n) { return (form.elements[n].value || "").trim(); }
function first() { return (me.first || val("first")).split(/\s+/)[0] || ""; }
function stepEl(q) { return steps.filter(function (s) { return s.getAttribute("data-q") === q; })[0]; }
function err(msg) { var e = stepEl(ORDER[at]).querySelector(".wl-err"); if (e) e.textContent = msg || ""; }

/* plans: the site's own prices (pricing.py checks them against the app's pricing.json), people from the contract */
var P = window.SK_PRICES || {}, NOW = new Date(), RENEW = new Date(NOW.getTime() + 14 * 864e5);
var renew = RENEW.toLocaleDateString("en-US", { month: "short", day: "numeric" }), renewLong = RENEW.toLocaleDateString("en-US", { month: "long", day: "numeric" });
/* a friends' code makes the first month free: the plan starts a calendar month from today instead of in 14 days */
var MONTH = (function () { var d = new Date(NOW); d.setMonth(d.getMonth() + 1); if (d.getDate() !== NOW.getDate()) d.setDate(0); return d; })();
function starts() { return me.promo ? MONTH : RENEW; }
function startsShort() { return starts().toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
function startsLong() { return starts().toLocaleDateString("en-US", { month: "long", day: "numeric" }); }
function trialWord() { return me.promo ? "First month · $0" : "14 days · $1"; }
var PLANS = [
  { id: "creator", name: "Creator", brands: 1, people: 1, blurb: "One brand.", feats: [["1 brand", 1], ["Full edits with takes and reviews", 1], ["Claude, Higgsfield and ElevenLabs built in", 1], ["Run any edit as a Meta ad", 0]] },
  { id: "pro", name: "Pro", best: true, brands: 3, people: 3, blurb: "Three brands.", feats: [["3 brands, 3 people", 1], ["Run any edit as a Meta ad", 1], ["One calendar across your brands", 1], ["Everything in Creator", 1]] },
  { id: "unlimited", name: "Unlimited", brands: 99, people: 10, blurb: "Every brand you run.", feats: [["Every brand, 10 people", 1], ["Run any edit as a Meta ad", 1], ["One calendar across your brands", 1], ["Everything in Pro", 1]] }
];
function price(id, per) { var v = (P[per] || {})[id + ".per"]; return v || { creator: "$99", pro: "$199", unlimited: "$299" }[id]; }
function bill(id, per) { return per === "year" ? ((P.year || {})[id + ".bill"] || "Billed yearly") : "Billed monthly"; }
function then(id, per) { return per === "year" ? ((P.year || {})[id + ".bill"] || "").replace(/^Billed\s*/, "").replace(/\s*yearly$/, "/yr") || price(id, per) + "/mo" : price(id, per) + "/mo"; }
function planOf(id) { return PLANS.filter(function (p) { return p.id === id; })[0] || PLANS[1]; }

/* ---------- the stage: the app, signing you in ---------- */
var BRANDS = [
  { n: "Your brand", s: "Brand kit ready", bg: "linear-gradient(140deg, #DFEAE8, #BBC9C7 50%, #536878)", ink: "#05090A", sw: ["#05090A", "#0E191E", "#BBC9C7", "#DFEAE8"] },
  { n: "Halden", s: "Running gear", m: "h", bg: "linear-gradient(140deg, #536878, #0E191E)", ink: "#E5E4E2", sw: ["#0E191E", "#536878", "#BBC9C7", "#E5E4E2"] },
  { n: "Northwind", s: "Coffee roasters", m: "N", bg: "linear-gradient(140deg, #2B2B2B, #0A0A0A)", ink: "#E6EAE3", sw: ["#0A0A0A", "#2B2B2B", "#BED2C3", "#E6EAE3"] },
  { n: "Fourth brand", s: "Ready when you are", m: "4", bg: "linear-gradient(140deg, #BBC9C7, #536878)", ink: "#05090A", sw: ["#05090A", "#536878", "#BBC9C7", "#DFEAE8"] },
  { n: "Fifth brand", s: "Ready when you are", m: "5", bg: "linear-gradient(140deg, #BED2C3, #0E191E)", ink: "#05090A", sw: ["#0E191E", "#536878", "#BED2C3", "#E5E4E2"] }
];
function greet() { var h = new Date().getHours(); return h < 5 ? "Good evening" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; }
function brandList(n) { var f = first(); return BRANDS.slice(0, Math.min(5, n)).map(function (b, i) { return Object.assign({}, b, i === 0 ? { n: f ? f + "'s brand" : "Your brand", m: f ? f.charAt(0).toUpperCase() : "Y" } : {}); }); }
function mono(b) { return '<span class="bm" style="background:' + (b.bg || "#0E191E") + ";color:" + (b.ink || "#fff") + '">' + (b.img ? '<img src="' + b.img + '" alt="">' : esc(b.m)) + "</span>"; }
var MADE = [["cofounder-whiteboard", "Film", "Your launch film"], ["surfing", "Reels", "A reel a day"], ["tennis-forehand", "Ads", "Five to test"], ["get-together", "Social", "The month, planned"]];
function drawHome(typing) {
  var f = first(), pl = planOf(me.plan), signed = !!(me.session || me.paid || me.invite && me.invite.done);
  $("[data-st-hi-home]").innerHTML = esc(greet()) + (f ? ", <b>" + esc(f) + "</b>" : "") + (typing ? "<i></i>" : "");
  $("[data-st-date]").textContent = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }).replace(",", " ·");
  $("[data-st-state]").textContent = signed ? "Signed in · " + (me.email || "you") : me.email ? "Signing in · " + me.email : "Not signed in";
  var n = ORDER[at] === "plan" || ORDER[at] === "pay" || me.paid ? pl.brands : 1;
  /* the plan shows as chips on Home (its brands, then "+ more" and the seats), never as an open menu over the card */
  var shown = brandList(n).slice(0, n > 3 ? 2 : 3).map(function (b) { return '<span class="wl-chip">' + mono(b) + esc(b.n) + "</span>"; });
  if (n > 3) shown.push('<span class="wl-chip more">+ more</span>');
  if (ORDER[at] === "plan" || ORDER[at] === "pay") shown.push('<span class="wl-chip seats"><span class="av">' + new Array(Math.min(3, pl.people) + 1).join("<i></i>") + "</span>" + pl.people + (pl.people === 1 ? " person" : " people") + "</span>");
  $("[data-st-chips]").innerHTML = shown.join("");
  $("[data-st-av]").textContent = (f || "Y").charAt(0).toUpperCase();
  $("[data-st-mename]").textContent = f ? (me.first || val("first")) : "You";
  $("[data-st-meplan]").textContent = me.invite ? "Pro · on " + ((me.invite.from || "a friend").split(/\s+/)[0]) : signed ? pl.name + " · 14-day trial" : me.email ? "Checking your email…" : "Not signed in yet";
  $("[data-st-me]").classList.toggle("in", signed);
  $("[data-st-for]").textContent = signed ? "Made for " + (f || "you") : "Ready when you are";
  var made = $("[data-st-made]");
  if (!made.children.length || made._signed !== signed) {
    made._signed = signed;
    made.innerHTML = signed ? MADE.map(function (m, i) { return '<span class="wl-mc wl-in-a" style="--i:' + i + '"><img src="' + M + "selects/" + m[0] + '.jpg" alt=""><i>v01</i><span><em>' + esc(m[1]) + "</em><b>" + esc(m[2]) + "</b></span></span>"; }).join("")
      : '<span class="wl-ph"></span><span class="wl-ph"></span><span class="wl-ph"></span><span class="wl-ph"></span>';
  }
}
function drawPlanStage() {
  var pl = planOf(me.plan), bl = brandList(pl.brands), ul = $("[data-st-bl]");
  ul.innerHTML = bl.map(function (b, i) {
    return '<li class="wl-br wl-in-a' + (i === 0 ? " on" : "") + '" style="--i:' + i + '">' + mono(b) + '<span class="wl-bt"><b>' + esc(b.n) + "</b><span>" + esc(b.s) + '</span></span><span class="wl-sw">' + b.sw.map(function (c) { return '<i style="background:' + c + '"></i>'; }).join("") + "</span></li>";
  }).join("") + (pl.brands > 5 ? '<li class="wl-more wl-in-a" style="--i:5">And every brand you run</li>' : "");
  $("[data-st-menuh]").textContent = "Studio " + pl.name + " · " + (pl.brands > 5 ? "every brand" : pl.brands + (pl.brands === 1 ? " brand" : " brands"));
  var av = ""; for (var i = 0; i < Math.min(3, pl.people); i++) av += "<i></i>"; if (pl.people > 3) av += '<i class="more">+' + (pl.people - 3) + "</i>";
  $("[data-st-seats]").innerHTML = "<span>" + av + "</span>" + pl.people + (pl.people === 1 ? " person" : " people");
  $("[data-st-allb]").textContent = pl.brands === 1 ? bl[0].n : pl.brands > 5 ? "Every brand" : "All brands · " + pl.brands;
  drawHome();
}
function sizeStage() {
  var r = stage.getBoundingClientRect(); if (!r.width) return;
  var mob = SK.mobile() || innerWidth <= 960;
  var s = mob ? Math.min(r.width / 980, 220 / 680) : Math.min((r.height || 680) / 660, (r.width + 150) / 980, 1.22);
  fit.style.setProperty("--s", Math.max(.2, s).toFixed(3));
}
window.addEventListener("resize", function () { requestAnimationFrame(sizeStage); });

/* ---------- a wallpaper per step, decoded ahead and crossfaded (as in early access) ---------- */
var WALL = { "in": PHONE ? "assets/hero/sky-m.jpg" : "assets/hero/sky.jpg" };
[["code", "you"], ["plan", "brands"], ["pay", "claude"], ["done", "in"]].forEach(function (k) { WALL[k[0]] = "assets/wl/" + k[1] + (PHONE ? "-m" : "") + ".jpg"; });
var wallCache = {}, wallTok = 0, wallNow = "";
function want(k) {
  var u = WALL[k]; if (!u) return Promise.resolve("");
  if (!wallCache[u]) { var i = new Image(); i.decoding = "async"; i.src = u; wallCache[u] = (i.decode ? i.decode() : new Promise(function (r) { i.onload = r; })).then(function () { return u; }, function () { return u; }); }
  return wallCache[u];
}
function wall(k) {
  var u = WALL[k] || WALL["in"]; if (u === wallNow) return; wallNow = u; var tok = ++wallTok, bg = sky.parentNode;
  want(k).then(function () {
    if (tok !== wallTok) return;
    var nx = document.createElement("img"); nx.className = "wl-sky nx"; nx.alt = ""; nx.src = u; bg.appendChild(nx);
    requestAnimationFrame(function () { requestAnimationFrame(function () { nx.classList.add("in"); }); });
    setTimeout(function () { if (tok !== wallTok) return; $$(".wl-sky").forEach(function (o) { if (o !== nx && o !== sky) o.remove(); }); }, 1400);
    $$(".pass .frost").forEach(function (f) { f.src = u; });
  });
}

/* ---------- the pass (the same 3D object as early access, written for a member) ---------- */
function passHTML() {
  var frost = '<img class="frost" src="' + (sky.getAttribute("src") || "assets/hero/sky.jpg") + '" alt="">';
  return '<div class="side front"><div class="plate"></div><div class="card">' + frost + '<div class="foil"></div><div class="sweep"></div><span class="pbeam" data-beam="cx" data-active><span data-beam-bloom></span></span></div>' +
    '<div class="lift top"><span class="mark"><svg viewBox="36 36 440 440"><use href="#studio-mark"/></svg>Studio</span><span class="mono" data-p="kind">Pro · Trial</span></div>' +
    '<div class="lift who"><span class="mono dim">Member</span><div class="name" data-p="name"></div><div class="mail" data-p="mail"></div></div>' +
    '<div class="lift row"><div><span class="mono dim">Plan</span><b data-p="no">Pro</b></div><div><span class="mono dim">Trial</span><b class="s" data-p="trial">14 days · $1</b></div><div><span class="mono dim" data-p="k3">Renews</span><b class="s" data-p="v3">' + esc(renew) + "</b></div></div>" +
    '<div class="lift cut"></div><div class="lift bars" data-p="bars"></div></div>' +
    '<div class="side back"><div class="plate"></div><div class="card">' + frost + '<div class="foil"></div><span class="pbeam" data-beam="cx" data-active><span data-beam-bloom></span></span></div>' +
    '<svg class="lift big" viewBox="36 36 440 440"><use href="#studio-mark"/></svg>' +
    '<div class="lift what"><span class="mono dim">What\'s yours</span><h4>Your whole content team, on your Mac.</h4><ul data-p="list"><li><i></i>Every feature, from day one</li><li><i></i>Claude does the work</li><li><i></i>Cancel anytime before day 14</li></ul></div>' +
    '<div class="lift sig"><span class="mono dim">See you inside</span><span class="mono" data-p="sig">Studio</span></div></div>';
}
function bars(el, seed) {
  var s = 0, out = "", x = 0; for (var i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0; s = s || 7;
  while (x < 96) { s = (s * 16807) % 2147483647; var w = .35 + (s % 4) * .3; out += '<i style="width:' + w.toFixed(2) + '%"></i>'; x += w + .7; }
  el.innerHTML = out;
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
  function up() { if (!st.drag) return; var d = st.drag; st.drag = null; if (!d.moved) { st.flip += 180; SFX.play("move", { gain: .8 }); } else st.flip += Math.round(st.try_ / 180) * 180; st.try_ = 0; st.trx = 0; }
  window.addEventListener("pointerup", up); window.addEventListener("pointercancel", up);
  el.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); st.flip += 180; } });
  el.tabIndex = 0; el.setAttribute("role", "button"); el.setAttribute("aria-label", "Your Studio pass. Press to flip it.");
  var q = function (k) { return el.querySelector('[data-p="' + k + '"]'); };
  return {
    start: function () { if (!st.live) { st.live = true; requestAnimationFrame(frame); } },
    stop: function () { st.live = false; },
    enter: function (ms) { st.flip = 0; st.intro = SK.reduced ? null : { t0: performance.now(), ms: ms || 2000, ry0: -385 }; this.start(); },
    set: function (d) {
      ["kind", "mail", "no", "trial", "k3", "v3", "sig"].forEach(function (k) { if (k in d) q(k).textContent = d[k]; });
      if ("name" in d) q("name").innerHTML = d.name ? esc(d.name) : '<span class="ph">Your name</span>';
      if ("list" in d) q("list").innerHTML = d.list.map(function (t) { return "<li><i></i>" + esc(t) + "</li>"; }).join("");
      if ("seed" in d) bars(q("bars"), d.seed || "studio");
    }
  };
}
var pass1 = Pass($("[data-st-pass1]")), pass2 = Pass($("[data-st-pass2]"), { onLanded: function () { SFX.play("land"); } });
function drawPass(p) {
  var pl = planOf(me.plan), nm = (me.first || val("first") || "").trim();
  p.set(me.invite ? { kind: "Pro · Invite", name: nm, mail: me.email || "", no: "Pro", trial: "On " + ((me.invite.from || "a friend").split(/\s+/)[0]), k3: "Card", v3: "None", sig: "No card · nothing to cancel", seed: (nm + me.email) || "studio", list: ["Studio Pro, on a friend", "No card, nothing to cancel", "Claude does the work"] }
    : !PAYWALL ? { kind: "Studio · Member", name: nm, mail: me.email || "", no: "Free", trial: "Start free", k3: "For", v3: "Mac", sig: "See you inside", seed: (nm + me.email) || "studio", list: ["Your first video, before you pay", "Claude does the work", "14 days for $1 when you keep it"] }
    : { kind: pl.name + (me.promo ? " · Friend's code" : " · Trial"), name: nm || (PAYWALL ? "Studio member" : ""), mail: me.email || "", no: pl.name, trial: trialWord(), k3: "Renews", v3: startsShort(), sig: "Then " + then(pl.id, me.period), seed: (nm + me.email) || "studio" });
}

/* ---------- the word reveal and the self-typing examples (as in early access) ---------- */
function words(el, n) {
  var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), list = [], t;
  while ((t = w.nextNode())) if (!(t.parentNode.classList && t.parentNode.classList.contains("wl-bw")) && t.nodeValue.trim()) list.push(t);
  list.forEach(function (node) {
    var frag = document.createDocumentFragment();
    node.nodeValue.split(/(\s+)/).forEach(function (bit) { if (!bit) return; if (/^\s+$/.test(bit)) { frag.appendChild(document.createTextNode(bit)); return; } var sp = document.createElement("span"); sp.className = "wl-bw"; sp.textContent = bit; frag.appendChild(sp); });
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
var TY = { first: "Alex", email: "you@studio.com" }, tyTok = 0;   /* neutral examples on a public page */
form.querySelectorAll("input[name]").forEach(function (inp) {
  var t = TY[inp.name], bx = inp.closest(".wl-box"); if (!t || !bx) return;
  var o = document.createElement("span"); o.className = "wl-ty still"; o.setAttribute("aria-hidden", "true"); o.innerHTML = "<span></span><i></i>"; bx.appendChild(o);
  inp.setAttribute("aria-placeholder", t);
  var sync = function () { bx.classList.toggle("filled", !!inp.value); };
  inp.addEventListener("input", sync); inp.addEventListener("change", sync);
  inp.addEventListener("focus", function () { o.classList.add("still"); });
  inp._ty = o; sync();
});
function typeFields() {
  var tok = ++tyTok, list = [].slice.call(form.querySelectorAll("[data-st-mail] input")).filter(function (i) { return i._ty && !i.value; });
  list.forEach(function (i) { i._ty.classList.add("still"); i._ty.firstChild.textContent = SK.reduced ? TY[i.name] : ""; });
  if (SK.reduced) return;
  var k = 0;
  (function nextField() {
    var inp = list[k++]; if (!inp) return;
    var o = inp._ty, t = TY[inp.name], n = 0; o.classList.toggle("still", inp === document.activeElement);
    (function tick() {
      if (tok !== tyTok) return;
      if (n >= t.length) { o.firstChild.textContent = t; if (list[k]) o.classList.add("still"); return setTimeout(nextField, 120); }
      o.firstChild.textContent = t.slice(0, ++n); setTimeout(tick, 46 + Math.random() * 50);
    })();
  })();
}
$$(".wl-box").forEach(function (b) { var fb = b.querySelector(".wl-fb"); b.addEventListener("focusin", function () { fb.setAttribute("data-active", ""); }); b.addEventListener("focusout", function () { if (!b.closest(".wl-f.bad")) fb.removeAttribute("data-active"); }); });

/* ---------- moving between steps ---------- */
function personal() { var f = first(); $$("[data-st-hi]").forEach(function (h) { var t = h.getAttribute("data-st-hi"); h.textContent = f ? t.replace("{first}", f) : t.replace(", {first}", ""); }); }
function ready() {
  var q = ORDER[at];
  if (q === "in") return !$("[data-st-mail]").hidden && !!val("first") && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val("email"));
  if (q === "code") return code().length === 6;
  if (q === "plan") return !!me.plan;
  return true;
}
function setStep(n, quiet) {
  var cur = stepEl(ORDER[at]), q = ORDER[n], nx = stepEl(q), dir = n > at ? 1 : -1;
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
  if (sheet.classList.contains("open") && !sheet.classList.contains("done")) { wall(q); want(ORDER[n + 1] || "done"); }
  segs.forEach(function (s, i) { s.hidden = i >= ORDER.length; s.classList.toggle("on", i === n); s.classList.toggle("ok", i < n); });
  $$("[data-st-k]").forEach(function (k) { var i = ORDER.indexOf(k.closest(".wl-q").getAttribute("data-q")); k.textContent = (PAYWALL ? "Keep · " : me.invite ? "Invite · " : "Start · ") + (i + 1) + " of " + ORDER.length; });
  back.disabled = n === 0;
  var last = q === "pay";
  next.hidden = last; go.hidden = !last;
  $("[data-st-next-t]").textContent = q === "in" ? ($("[data-st-mail]").hidden ? "Continue" : "Send my code") : q === "code" ? "Verify" : "Continue";
  next.disabled = !ready();
  scenes.home.classList.remove("menu");
  $("[data-st-look]").hidden = !(PAYWALL && q === "plan");
  if (q === "plan") drawPlanStage(); else drawHome();
  if (SCENE[q] === "pass") { drawPass(pass1); pass1.start(); } else pass1.stop();
  if (q === "pay") payStep();
  if (!quiet) focusStep(SK.reduced ? 0 : 420);
}
function focusStep(delay) {
  setTimeout(function () {
    if (!sheet.classList.contains("open") || sheet.classList.contains("done")) return;
    var q = ORDER[at], t = q === "in" ? ($("[data-st-mail]").hidden ? null : form.elements[val("first") ? "email" : "first"]) : q === "code" ? otp[Math.min(5, code().length)] : q === "plan" ? $(".st-plan.sel") : null;
    if (t && !(SK.mobile() && t.tagName === "INPUT")) t.focus({ preventScroll: true });
  }, delay);
}
back.addEventListener("click", function () {
  if (busy) return;
  var q = ORDER[at];
  if (q === "plan" && me.session) { toast("You're signed in as " + me.email + "."); return; }
  if (at > 0) setStep(at - 1);
});
next.addEventListener("click", function () { advance(); });
function advance() {
  if (busy) return;
  var q = ORDER[at];
  if (q === "in") return startEmail();
  if (q === "code") return verify();
  if (!ready()) return;
  setStep(at + 1);
}

/* ---------- step 1: the ways in ---------- */
var mailBox = $("[data-st-mail]"), emailWay = sheet.querySelector('[data-way="email"]');
$$(".st-way").forEach(function (b) {
  var way = b.getAttribute("data-way");
  if ((way === "google" || way === "apple") && LIVE && !CFG.oauth) { b.disabled = true; b.querySelector(".soon").hidden = false; }
  b.addEventListener("click", function () {
    err("");
    if (way === "email") {
      var on = mailBox.hidden; mailBox.hidden = !on; b.setAttribute("aria-expanded", on ? "true" : "false");
      box.style.height = ""; setStep(at, true);
      if (on) { typeFields(); setTimeout(function () { form.elements.first.focus(); }, 80); }
      return;
    }
    oauth(way, b);
  });
});
form.elements.first.addEventListener("input", function () { drawHome(true); clearTimeout(this._t); this._t = setTimeout(function () { drawHome(); }, 900); personal(); next.disabled = !ready(); });
form.elements.email.addEventListener("input", function () { next.disabled = !ready(); });
[form.elements.first, form.elements.email].forEach(function (inp) {
  inp.addEventListener("keydown", function (e) { if (e.key !== "Enter") return; e.preventDefault(); if (inp.name === "first") form.elements.email.focus(); else startEmail(); });
});
function markBad(names, msg) {
  $$(".wl-f.bad").forEach(function (f) { f.classList.remove("bad"); });
  names.forEach(function (n) { var f = form.elements[n].closest(".wl-f"); void f.offsetWidth; f.classList.add("bad"); f.querySelectorAll(".wl-fb").forEach(function (fb) { fb.setAttribute("data-active", ""); }); });
  err(msg);
}
function startEmail() {
  if (mailBox.hidden) { emailWay.click(); return; }
  var f = val("first"), e = val("email"), bad = [];
  if (!f) bad.push("first");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) bad.push("email");
  if (bad.length) { markBad(bad, bad.length === 2 ? "Add your first name and email." : bad[0] === "first" ? "Add your first name." : e ? "That email doesn't look quite right." : "Add your email."); form.elements[bad[0]].focus(); return; }
  markBad([], "");
  busy = true; next.classList.add("busy"); $("[data-st-next-t]").textContent = "Sending"; SFX.play("send");
  me.first = f; me.email = e.toLowerCase();
  sendCode().then(function () {
    $("[data-st-to]").textContent = me.email;
    clearOtp(); resendIn(30);
    setStep(at + 1);
  }, function (x) { err(say(x)); }).then(function () { busy = false; next.classList.remove("busy"); $("[data-st-next-t]").textContent = ORDER[at] === "code" ? "Verify" : "Send my code"; });
}

/* ---------- step 2: six boxes; typing, paste and the phone's autofill all fill them ---------- */
var otp = $$("[data-st-otp] input"), otpBox = $("[data-st-otp]");
function code() { return otp.map(function (i) { return i.value; }).join("").replace(/\D/g, ""); }
var otpBeam = $(".st-otpb");
function badOtp(on) { otpBox.classList.toggle("bad", on); if (on) otpBeam.setAttribute("data-active", ""); else otpBeam.removeAttribute("data-active"); }
function clearOtp() { otp.forEach(function (i) { i.value = ""; i.classList.remove("has"); }); otpBox.classList.remove("ok", "busy"); badOtp(false); }
function fill(from, digits) {
  digits = digits.replace(/\D/g, "").slice(0, 6 - from);
  for (var k = 0; k < digits.length; k++) { otp[from + k].value = digits[k]; otp[from + k].classList.add("has"); }
  var nx = Math.min(5, from + digits.length);
  otp[nx].focus();
  next.disabled = !ready(); badOtp(false); err("");
  if (code().length === 6) setTimeout(verify, 180);
}
otp.forEach(function (inp, i) {
  inp.addEventListener("input", function () {
    var v = inp.value.replace(/\D/g, "");
    if (v.length > 1) { inp.value = ""; fill(i, v); return; }   /* autofill or a fast paste puts the whole code in one box */
    inp.value = v; inp.classList.toggle("has", !!v);
    if (v && i < 5) otp[i + 1].focus();
    next.disabled = !ready(); badOtp(false); err("");
    if (code().length === 6) setTimeout(verify, 180);
  });
  inp.addEventListener("keydown", function (e) {
    if (e.key === "Backspace" && !inp.value && i > 0) { e.preventDefault(); otp[i - 1].value = ""; otp[i - 1].classList.remove("has"); otp[i - 1].focus(); next.disabled = true; }
    else if (e.key === "ArrowLeft" && i > 0) { e.preventDefault(); otp[i - 1].focus(); }
    else if (e.key === "ArrowRight" && i < 5) { e.preventDefault(); otp[i + 1].focus(); }
    else if (e.key === "Enter") { e.preventDefault(); verify(); }
  });
  inp.addEventListener("paste", function (e) { var t = (e.clipboardData || window.clipboardData).getData("text") || ""; if (/\d/.test(t)) { e.preventDefault(); fill(0, t); } });
  inp.addEventListener("focus", function () { setTimeout(function () { if (document.activeElement === inp) try { inp.select(); } catch (x) {} }, 0); });   /* only if still here: a fast typist has moved on */
});
var resendB = $("[data-st-resend]"), waitEl = $("[data-st-wait]"), resendT = 0;
var hintT = 0;
function resendIn(s) {
  var hint = $("[data-st-hint]"); hint.hidden = true; clearTimeout(hintT); hintT = setTimeout(function () { if (ORDER[at] === "code" && code().length < 6) hint.hidden = false; }, 20000);
  clearInterval(resendT); resendB.disabled = true; waitEl.textContent = "in " + s + "s";
  resendT = setInterval(function () { s--; if (s <= 0) { clearInterval(resendT); resendB.disabled = false; waitEl.textContent = ""; } else waitEl.textContent = "in " + s + "s"; }, 1000);
}
resendB.addEventListener("click", function () { if (resendB.disabled) return; err(""); sendCode().then(function () { toast("A new code is on its way to " + me.email + "."); clearOtp(); otp[0].focus(); resendIn(30); }, function (x) { err(say(x)); }); });
$("[data-st-other]").addEventListener("click", function () { clearOtp(); setStep(0); setTimeout(function () { form.elements.email.focus(); form.elements.email.select(); }, 450); });
function verify() {
  if (busy || code().length !== 6) return;
  busy = true; otpBox.classList.add("busy"); next.classList.add("busy"); $("[data-st-next-t]").textContent = "Checking";
  checkCode(code()).then(function (session) {
    otpBox.classList.remove("busy"); otpBox.classList.add("ok"); SFX.play("land");
    me.session = session;
    return signedIn();
  }).catch(function (x) {
    otpBox.classList.remove("busy"); badOtp(true); err(say(x)); SFX.play("tick");
    setTimeout(function () { otp.forEach(function (i) { i.value = ""; i.classList.remove("has"); }); otp[0].focus(); next.disabled = true; }, 650);
  }).then(function () { busy = false; next.classList.remove("busy"); $("[data-st-next-t]").textContent = "Verify"; });
}

/* signed in: hand the session to the server for the Mac app at once, then the plan (or, for an invite, redeem it) */
function signedIn() {
  drawHome();
  if (me.invite) return redeem().then(function (r) { me.hand = r; me.invite.done = true; showDone(); });
  return handoff().then(function (h) {
    me.hand = h;
    setTimeout(showDone, 520);   /* free: straight to You're in, and the download */
  }, function (x) {
    if (x && x.state === "has_plan") { me.hand = x; showDone("has"); return; }
    if (x && /sales_off|test_mode_only/.test(x.code || "")) { err("Studio is not on sale yet. Join the waitlist and we'll tell you first."); return; }
    throw x;
  });
}

/* ---------- step 3: the plan ---------- */
var plansEl = $("[data-st-plans]"), perEl = $("[data-st-per]");
var TICK = '<svg viewBox="0 0 16 16"><path d="M3.5 8.4l2.8 2.8 6.2-6.4"/></svg>', DASH = '<svg viewBox="0 0 16 16"><path d="M4 8h8"/></svg>';
function drawPlans() {
  plansEl.innerHTML = PLANS.map(function (p) {
    return '<button type="button" class="st-plan' + (p.id === me.plan ? " sel" : "") + '" data-plan="' + p.id + '" aria-pressed="' + (p.id === me.plan) + '"><span class="st-sb" data-beam="cx" data-active aria-hidden="true"><span data-beam-bloom></span></span>' +
      '<span class="nm">' + esc(p.name) + (p.best ? '<span class="tag">Most picked</span>' : "") + "</span>" +
      '<span class="pr">' + esc(price(p.id, me.period)) + "<small> /mo</small></span>" +
      '<span class="bl">' + esc(me.period === "year" ? bill(p.id, "year") : p.blurb) + "</span>" +
      "<ul>" + p.feats.map(function (f) { return '<li class="' + (f[1] ? "" : "off") + '">' + (f[1] ? TICK : DASH) + esc(f[0]) + "</li>"; }).join("") + "</ul></button>";
  }).join("");
  plansEl.querySelectorAll(".st-plan").forEach(function (b) {
    b.addEventListener("click", function () { me.plan = b.getAttribute("data-plan"); me.notrial = null; drawPlans(); drawPlanStage(); next.disabled = !ready(); line(); pwHead(); });
  });
  line();
}
function line() {
  var pl = planOf(me.plan), t = then(pl.id, me.period);
  $("[data-st-line]").innerHTML = me.promo ? "<b>Your first month is free, then " + esc(t) + ".</b> Cancel anytime before " + esc(startsLong()) + " and you won't be charged. Your plan starts " + esc(startsLong()) + "."
    : "<b>14 days for $1, then " + esc(t) + ".</b> Cancel anytime before day 14 and you won't be charged again. Your plan starts " + esc(renewLong) + ".";
}
perEl.querySelectorAll("button").forEach(function (b) {
  b.addEventListener("click", function () {
    me.period = b.getAttribute("data-per"); if (me.notrial) me.notrial = null;
    if (me.period === "year" && me.promo) { setPromo(null); toast("Codes work on monthly plans. Your code was taken off."); }
    perEl.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-checked", x === b ? "true" : "false"); });
    slidePer(); drawPlans(); pwHead();
  });
});
function slidePer() { var on = perEl.querySelector('[aria-checked="true"]'); if (!on || !on.offsetWidth) return; perEl.style.setProperty("--w", on.offsetWidth + "px"); perEl.style.setProperty("--x", (on.offsetLeft - 4) + "px"); }
$("[data-st-save]").textContent = "Save " + ((P.save || 20)) + "%";

/* ---------- step 4: $1, inside the page. Stripe's Payment Element in our glass (the Appearance API), never a redirect ---------- */
var stripe = null, elements = null, peMounted = false, stripeP = null;
function loadStripe() {
  if (stripeP) return stripeP;
  stripeP = new Promise(function (res, rej) {
    if (window.Stripe) return res();
    var s = document.createElement("script"); s.src = "https://js.stripe.com/v3/"; s.onload = res; s.onerror = function () { rej(new Error("net")); }; document.head.appendChild(s);
  });
  return stripeP;
}
var APPEARANCE = {
  theme: "night", labels: "above",
  variables: { fontFamily: "'Hanken Grotesk', 'Helvetica Neue', Helvetica, sans-serif", fontSizeBase: "15px", colorPrimary: "#4aa3ff", colorBackground: "#121923", colorText: "#f5f3ee", colorTextSecondary: "rgba(245, 243, 238, 0.66)", colorTextPlaceholder: "rgba(245, 243, 238, 0.36)", colorDanger: "#ffb08a", borderRadius: "14px", spacingUnit: "3px", gridRowSpacing: "10px", gridColumnSpacing: "10px", tabSpacing: "8px" },
  rules: {
    ".Label": { fontFamily: "'IBM Plex Mono', ui-monospace, Menlo, monospace", fontSize: "10.5px", fontWeight: "500", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(245, 243, 238, 0.82)", marginBottom: "6px" },
    ".Input": { backgroundColor: "rgba(255, 255, 255, 0.07)", border: "none", boxShadow: "inset 1px 1px 1px -1px rgba(255, 255, 255, 0.6), inset -1px -1px 1px -1px rgba(255, 255, 255, 0.5), inset 0 8px 16px -10px rgba(0, 0, 0, 0.42)", padding: "12px 14px", fontSize: "16px" },
    ".Input:focus": { boxShadow: "inset 1px 1px 1px -1px rgba(255, 255, 255, 0.9), inset -1px -1px 1px -1px rgba(255, 255, 255, 0.7), 0 0 0 1px rgba(74, 163, 255, 0.55), 0 0 24px -6px rgba(74, 163, 255, 0.55)" },
    ".Input--invalid": { boxShadow: "inset 1px 1px 1px -1px rgba(255, 255, 255, 0.6), 0 0 0 1px rgba(255, 150, 110, 0.6)" },
    ".Tab": { backgroundColor: "rgba(255, 255, 255, 0.06)", border: "none", boxShadow: "inset 1px 1px 1px -1px rgba(255, 255, 255, 0.6), inset -1px -1px 1px -1px rgba(255, 255, 255, 0.5)" },
    ".Tab--selected": { backgroundColor: "rgba(255, 255, 255, 0.13)", color: "#ffffff", boxShadow: "inset 1px 1px 1px -1px rgba(255, 255, 255, 0.95), inset -1px -1px 1px -1px rgba(255, 255, 255, 0.75), inset 2px 2px 5px -2px rgba(196, 214, 238, 0.62), inset -2px -2px 5px -2px rgba(242, 226, 220, 0.62)" },
    ".TabIcon--selected": { fill: "#ffffff" }, ".TabLabel--selected": { color: "#ffffff" }, ".Tab:hover": { backgroundColor: "rgba(255, 255, 255, 0.1)" },
    ".CheckboxInput": { backgroundColor: "rgba(255, 255, 255, 0.07)", border: "none", boxShadow: "inset 1px 1px 1px -1px rgba(255, 255, 255, 0.6), inset -1px -1px 1px -1px rgba(255, 255, 255, 0.5)" },
    ".PickerItem": { backgroundColor: "rgba(255, 255, 255, 0.06)", border: "none" },
    ".Block": { backgroundColor: "rgba(255, 255, 255, 0.05)", boxShadow: "inset 1px 1px 1px -1px rgba(255, 255, 255, 0.5)", border: "none" },
    ".Error": { fontSize: "13px" }
  }
};
/* the checkout words (Studio legal, consent copy b, checkout-v1): the real price and the real renewal date, never "in 14 days" */
var RENEW_FULL = RENEW.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }), CONSENT = "checkout-v1";
var MONTH_FULL = MONTH.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
function seats(pl) { return pl.people + (pl.people === 1 ? " seat · up to 2 Macs" : " seats · up to 2 Macs each"); }
function priceWord(pl) { return me.period === "year" ? then(pl.id, "year").replace("/yr", "/year") : price(pl.id, "month") + "/month"; }
var agree = form.elements.renew_ok, agreeL = $("[data-st-agree]");
function payStep() {
  var pl = planOf(me.plan), pw = priceWord(pl), per = me.period === "year" ? "year" : "month", bare = pw.replace(/\/(month|year)$/, "");
  $("[data-st-sname]").textContent = "Studio " + pl.name;
  $("[data-st-seats2]").textContent = seats(pl);
   /* the price and date live in the today row, written below */
  $("[data-st-then]").textContent = "Then " + bare + " a " + per + ".";
  var legal = ' By paying, you agree to the <a href="terms/" target="_blank" rel="noopener">Terms</a> and <a href="privacy/" target="_blank" rel="noopener">Privacy Policy</a>.';
  if (me.notrial && !me.promo) {   /* this account or card already had its trial (checkout-notrial-v1): the full price today, every month after */
    var np = me.notrial.price, npm = np + "/" + per, nextD = (function () { var d = new Date(NOW); if (per === "year") d.setFullYear(d.getFullYear() + 1); else { d.setMonth(d.getMonth() + 1); if (d.getDate() !== NOW.getDate()) d.setDate(0); } return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }); })();
    $("[data-st-payh]").textContent = "You've had your free trial.";
    $("[data-st-then]").textContent = "Studio " + pl.name + " is " + npm + ".";
    $("[data-st-today]").innerHTML = "<b>" + esc(np) + " today</b>, then <b>" + esc(npm) + "</b> plus tax every " + per + ", until you cancel.";
    $("[data-st-agree-t]").textContent = "I agree that Studio " + pl.name + " starts today at " + npm + " plus tax and renews automatically every " + per + ", until I cancel. I can cancel anytime in the app or online; I won't be charged again after I cancel.";
    $("[data-st-under]").innerHTML = "You pay " + esc(np) + " today. It renews every " + per + " (next on " + esc(nextD) + ") until you cancel. Cancel anytime in Settings → Billing or at <mark class=\"ph\">[manage billing link]</mark>." + legal;
    $("[data-st-go-t]").textContent = "Start for " + np;
  } else if (me.promo) {   /* the friends' code (checkout-promo-v1): $0 today, the first charge a month from today */
    $("[data-st-payh]").textContent = "Your first month is free.";
    $("[data-st-today]").innerHTML = "<b>$0 today</b> for your first month. Then <b>" + esc(pw) + "</b> plus tax, starting <b>" + esc(MONTH_FULL) + "</b>, until you cancel.";
    $("[data-st-agree-t]").textContent = "I agree that Studio " + pl.name + " renews automatically at " + pw + " plus tax, starting " + MONTH_FULL + " and every month after that, until I cancel. I can cancel anytime in the app or online, and if I cancel before " + MONTH_FULL + ", I won't be charged.";
    $("[data-st-under]").innerHTML = "You pay $0 today. From " + esc(MONTH_FULL) + " you'll be charged " + esc(pw) + " until you cancel. Cancel anytime in Settings → Billing or at <mark class=\"ph\">[manage billing link]</mark>." + legal;
    $("[data-st-go-t]").textContent = PAYWALL ? "Start for $0" : "Start my free month";
  } else {
    $("[data-st-payh]").textContent = "14 days for $1.";
    $("[data-st-today]").innerHTML = "<b>$1 today</b> for a 14-day trial. Then <b>" + esc(pw) + "</b> plus tax, starting <b>" + esc(RENEW_FULL) + "</b>, until you cancel.";
    $("[data-st-agree-t]").textContent = "I agree that after my 14-day trial for $1, Studio " + pl.name + " renews automatically at " + pw + " plus tax, starting " + RENEW_FULL + " and every " + per + " after that, until I cancel. I can cancel anytime in the app or online, and if I cancel before " + RENEW_FULL + ", I won't be charged " + bare + ".";
    $("[data-st-under]").innerHTML = "You pay $1 today. From " + esc(RENEW_FULL) + " you'll be charged " + esc(pw) + " until you cancel. Cancel anytime in Settings → Billing or at <mark class=\"ph\">[manage billing link]</mark>. The $1 trial fee isn't refundable." + legal;
    $("[data-st-go-t]").textContent = PAYWALL ? "Start for $1" : "Start 14 days for $1";
  }
  drawPromo();
  agree.checked = false; go.classList.add("off");   /* the terms just changed (or are new): ask again */
  reveal(stepEl("pay"));
  mountCard();
}
/* the card form: a $1 subscription, or with a code a setup (the card is kept, nothing is charged today). Stripe can't change that
   mode on a live form, so a change of mode draws a new one. */
var peMode = "", pe = null;
function mountCard() {
  var cents = me.notrial && !me.promo ? me.notrial.cents : 100, mode = me.promo ? "setup" : "subscription";
  if (peMounted && peMode === mode + cents) return;
  if (peMounted && elements && peMode.indexOf(mode) === 0 && mode === "subscription") { try { elements.update({ amount: cents }); peMode = mode + cents; return; } catch (x) {} }   /* same form, new amount: the card typed stays */
  var pk = MOCK ? DEMO_PK : CFG.stripe;
  if (!pk) { $("[data-st-pe]").innerHTML = '<p class="wl-fine">The card form opens once the payment key is set.</p>'; return; }
  if (pe) { try { pe.destroy(); } catch (x) {} pe = null; peMounted = false; elements = null; $("[data-st-pe]").innerHTML = '<div class="st-load"><i></i><i></i><i></i></div>'; }
  peMode = mode + cents; var want = peMode;
  loadStripe().then(function () {
    if (peMode !== want || peMounted) return;
    stripe = stripe || Stripe(pk);
    var opts = { mode: mode, currency: "usd", paymentMethodTypes: ["card"], appearance: APPEARANCE, fonts: [{ cssSrc: "https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500&family=IBM+Plex+Mono:wght@500&display=swap" }] };
    if (mode === "subscription") opts.amount = cents;
    elements = stripe.elements(opts);
    pe = elements.create("payment", { layout: { type: "tabs" }, defaultValues: { billingDetails: { email: me.email, name: me.first } }, terms: { card: "never" }, wallets: { applePay: "auto", googlePay: "auto", link: "never" } });
    var host = $("[data-st-pe]");
    pe.on("ready", function () { var l = host.querySelector(".st-load"); if (l) l.remove(); });
    pe.on("focus", function () { host.closest(".st-card").classList.add("focus"); }); pe.on("blur", function () { host.closest(".st-card").classList.remove("focus"); });
    pe.on("change", function (e) { if (e.error) err(e.error.message); else err(""); });
    pe.mount(host); peMounted = true;
  }, function () { err("No internet connection. Check it, then try again."); });
}
form.addEventListener("submit", function (e) {
  e.preventDefault();
  if (ORDER[at] !== "pay") { advance(); return; }
  if (go.classList.contains("busy")) return;
  if (!agree.checked) { err("Please check the box to confirm the renewal terms."); agreeL.classList.remove("bad"); void agreeL.offsetWidth; agreeL.classList.add("bad"); SFX.play("tick"); return; }
  if (!elements) { if (MOCK) return paid({ mock: true }); err("The card form hasn't loaded. Check your connection."); return; }
  go.classList.add("busy"); SFX.play("send"); err("");
  elements.submit().then(function (r) {
    if (r.error) throw { human: r.error.message };
    return checkout();
  }).then(function (c) {
    if (c.mock) return c;
    try { sessionStorage.setItem("studio-checkout", JSON.stringify({ subscription: c.subscription, handoff: me.hand && me.hand.code, first: me.first, email: me.email, plan: me.plan, period: me.period })); } catch (e) {}
    var opts = { elements: elements, clientSecret: c.client_secret, confirmParams: { return_url: location.origin + location.pathname + (local ? "?live&paid=1" : "?review&paid=1") + HASH }, redirect: "if_required" };
    return (c.intent === "setup" ? stripe.confirmSetup(opts) : stripe.confirmPayment(opts)).then(function (r) { if (r.error) throw { human: r.error.message }; return status(c.subscription); });
  }).then(paid, function (x) {
    if (x && (x.code === "trial_used" || x.code === "trial_used_after") && !me.promo) { var m = noTrial(x); setTimeout(function () { err(m); }, 30); return; }
    err(say(x));
  }).then(function () { go.classList.remove("busy"); });
});
function paid(c) {
  me.paid = c || {};
  var d = c && c.download ? c : me.hand || {};
  me.hand = Object.assign({}, me.hand, { download: d.download || (me.hand && me.hand.download), open: d.open || (me.hand && me.hand.open) });
  showDone();
}
$("[data-st-change]").addEventListener("click", function () { setStep(ORDER.indexOf("plan")); });

/* ---------- a friends' code: "Have a code?" opens one field; an accepted code becomes a chip with ✕ ---------- */
var pfield = $("[data-st-pfield]"), pin = form.elements.promo, applyB = $("[data-st-apply]");
function drawPromo() {
  $("[data-st-havecode]").hidden = !!me.promo || !pfield.hidden;
  $("[data-st-pchip]").hidden = !me.promo;
  if (me.promo) { pfield.hidden = true; $("[data-st-pchip-t]").textContent = me.promo.code + " · " + me.promo.label; }
}
function setPromo(p) {
  me.promo = p; line(); drawPass(pass1); pwHead();
  if (ORDER[at] === "pay") payStep(); else drawPromo();
}
$("[data-st-havecode]").addEventListener("click", function () { pfield.hidden = false; drawPromo(); setTimeout(function () { pin.focus(); }, 30); });
function applyCode() {
  var code = (pin.value || "").trim().toUpperCase().replace(/\s+/g, "");
  if (!code) { pin.focus(); return; }
  if (me.period === "year") { err("Codes work on monthly plans. Switch to monthly to use it."); return; }
  applyB.classList.add("busy"); err(""); pfield.classList.remove("bad");
  promoCheck(code).then(function (j) {
    SFX.play("land"); pin.value = ""; setPromo({ code: j.code || code, months: j.months || 1, label: j.label || "First month free" });
    toast((j.code || code) + " applied. Your first month is free.");
  }, function (x) { void pfield.offsetWidth; pfield.classList.add("bad"); SFX.play("tick"); err(say(x)); }).then(function () { applyB.classList.remove("busy"); });
}
applyB.addEventListener("click", applyCode);
pin.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); applyCode(); } });
pin.addEventListener("input", function () { pfield.classList.remove("bad"); });
$("[data-st-pdel]").addEventListener("click", function () { setPromo(null); pfield.hidden = true; drawPromo(); toast("Code removed. Back to 14 days for $1."); });
agree.addEventListener("change", function () { go.classList.toggle("off", !agree.checked); agreeL.classList.remove("bad"); if (agree.checked) err(""); me.agreedAt = agree.checked ? new Date().toISOString() : null; });

/* ---------- the server and Supabase (or, on this Mac, a stand-in that answers the same way) ---------- */
function E(code, human, extra) { var e = new Error(code); e.code = code; e.human = human; return Object.assign(e, extra || {}); }
function say(x) {
  if (x && x.human) return x.human;
  var c = x && (x.code || x.error || x.message) || "";
  return ({ bad_token: "Your sign-in ran out. Sign in again.", bad_refresh_token: "Sign in again.", bad_handoff: "Sign in again.", sales_off: "Studio is not on sale yet.", test_mode_only: "Studio is not on sale yet.",
    no_such_plan: "That plan is not on sale.", too_many: "Too many tries. Wait a little, then try again.", stripe: "Checkout could not open just now. Try again in a moment.", checkout_off: "Checkout could not open just now. Try again in a moment.",
    handoff_off: "Checkout could not open just now. Try again in a moment.", net: "No internet connection. Check it, then try again.", wait: "Wait a minute, then send a new code.", bad_code: "That code isn't right. Check the email, or send a new one.",
    expired_code: "That code ran out. Send a new one.", promo_invalid: "That code isn't valid. Check it and try again.", promo_month_only: "Codes work on monthly plans. Switch to monthly to use it.",
    promo_elements_only: "That code can't be used here. Try again in a moment.", promo_used: (x && x.message && x.message !== c ? x.message : "") || "That code can't be used on this account. It may be used up, or it's for first-time customers." })[c] || "That didn't go through. Try again in a moment.";
}
var sb = null;
function supa() {
  if (sb) return Promise.resolve(sb);
  return new Promise(function (res, rej) {
    var s = document.createElement("script"); s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js";
    s.onload = function () { sb = window.supabase.createClient(CFG.supabase, CFG.supakey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: true, flowType: "implicit" } }); res(sb); };
    s.onerror = function () { rej(E("net")); }; document.head.appendChild(s);
  });
}
function api(path, body) {
  return fetch(CFG.worker + path, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}).then(function (r) {
    return r.json().catch(function () { return {}; }).then(function (j) { if (r.ok) return j; throw E(j.error || j.state || "http" + r.status, null, Object.assign({ status: r.status }, j)); });
  }, function () { throw E("net"); });
}
var wait = function (ms) { return SK.sleep(SK.reduced ? 0 : ms); };
var SLOW = Q.has("slow") ? 9000 : 0;   /* ?slow: the stand-in answers slowly, to see the slow-network states */
function slowly(promise, what) {
  if (navigator.onLine === false) return Promise.reject(E("net"));
  var el = stepEl(ORDER[at]).querySelector(".wl-err"), t1 = setTimeout(function () { el.classList.add("slow"); el.textContent = (what || "Still working") + "… your connection is slow. Hang on."; }, 6000);
  var t2, gave = new Promise(function (_, rej) { t2 = setTimeout(function () { rej(E("slow", "That's taking too long. Check your connection, then try again.")); }, 25000); });
  return Promise.race([promise, gave]).then(function (v) { clearTimeout(t1); clearTimeout(t2); el.classList.remove("slow"); if (el.textContent.indexOf("Hang on") > -1) el.textContent = ""; return v; },
    function (x) { clearTimeout(t1); clearTimeout(t2); el.classList.remove("slow"); throw x; });
}
function sendCode() {
  if (MOCK) return slowly(wait(700 + SLOW), "Sending your code");
  return slowly(supa().then(function (c) { return c.auth.signInWithOtp({ email: me.email, options: { shouldCreateUser: true, data: { first_name: me.first } } }); }).then(function (r) { if (r.error) throw E(r.error.status === 429 ? "wait" : "send", r.error.status === 429 ? null : r.error.message); }), "Sending your code");
}
function checkCode(token) {
  if (MOCK) return slowly(wait(800 + SLOW), "Checking").then(function () { if (token === "000000") throw E("bad_code"); return { access_token: "mock", refresh_token: "mock" }; });
  return slowly(supa().then(function (c) { return c.auth.verifyOtp({ email: me.email, token: token, type: "email" }); }), "Checking").then(function (r) { if (r.error || !r.data || !r.data.session) throw E(/expired/i.test(r.error && r.error.message || "") ? "expired_code" : "bad_code"); return r.data.session; });
}
function oauth(way, b) {
  if (MOCK) {
    b.classList.add("busy"); b.querySelector(".t").textContent = "Opening " + (way === "apple" ? "Apple" : "Google") + "…"; SFX.play("send");
    return wait(900).then(function () { me.first = "Evan"; me.email = "evan@" + (way === "apple" ? "icloud.com" : "gmail.com"); form.elements.first.value = "Evan"; me.session = { access_token: "mock", refresh_token: "mock" }; b.classList.remove("busy"); b.querySelector(".t").textContent = "Continue with " + (way === "apple" ? "Apple" : "Google"); toast("Signed in with " + (way === "apple" ? "Apple" : "Google") + " (stand-in)."); return signedIn(); });
  }
  return supa().then(function (c) { return c.auth.signInWithOAuth({ provider: way, options: { redirectTo: location.origin + location.pathname + location.search + HASH } }); });
}
function handoff() {
  if (MOCK) return slowly(wait(400), "Getting Studio ready").then(function () { return { code: "STANDIN", download: "#download", open: "studio://handoff?code=STANDIN", expires_in: 3600 }; });
  var s = me.session; me.session = { access_token: s.access_token };   /* the refresh token is the app's now: never used here again */
  return slowly(api("/web/handoff", { access_token: s.access_token, refresh_token: s.refresh_token }), "Getting Studio ready");
}
function promoCheck(code) {
  if (MOCK) return wait(600).then(function () { if (code !== "STUDIOK7") throw E("promo_invalid"); return { ok: true, code: "STUDIOK7", months: 1, label: "First month free" }; });
  return api("/web/promo", { code: code, period: me.period });
}
function checkout() {
  if (MOCK) return wait(1200).then(function () {   /* ?trialused / ?trialafter on this Mac: the server's two no-trial answers */
    if (!me.promo && !me.notrial && Q.has("trialused")) throw E("trial_used", null, { status: 409, price: price(me.plan, me.period) });
    if (!me.promo && !me.notrial && Q.has("trialafter")) throw E("trial_used_after", null, { state: "failed", reason: "trial_used" });
    return { mock: true };
  });
  var pl = planOf(me.plan), body = { token: me.session.access_token, plan: me.plan, period: me.period, handoff: me.hand && me.hand.code, ui: "elements",
    consent: { version: me.promo ? "checkout-promo-v1" : me.notrial ? "checkout-notrial-v1" : CONSENT, text: $("[data-st-agree-t]").textContent, price: priceWord(pl), renewal_date: starts().toISOString().slice(0, 10), agreed_at: me.agreedAt, signin_terms: "signup-a-v1" } };
  if (me.promo) body.promo = me.promo.code;
  else if (me.notrial) { body.trial = false; body.consent.renewal_date = new Date().toISOString().slice(0, 10); }
  return api("/web/checkout", body).then(function (c) {
    if (c.url && !c.client_secret) throw E("checkout_off", "Checkout is still on Stripe's page; the in-page card isn't switched on yet.");
    return c;
  });
}
/* after Stripe: the server asks Stripe itself, and gives the download and Open Studio links (it covers a bank's 3-D Secure return too) */
function status(sub) {
  var h = me.hand && me.hand.code, t0 = Date.now(), watch = !me.promo && !me.notrial;   /* a trial: hold ~8 s, the card check lands after the $1 */
  function once() {
    return api("/web/checkout/status?subscription=" + encodeURIComponent(sub || "") + "&handoff=" + encodeURIComponent(h || "")).then(function (j) {
      if (j.state === "failed" && j.reason === "trial_used") throw E("trial_used_after", null, j);
      if (j.state === "failed") throw E("failed", "Your bank didn't approve the payment. Try another card.");
      if (j.state === "incomplete") throw E("incomplete", "The payment isn't finished yet. Try again, or use another card.");
      if (watch && Date.now() - t0 < 8000) return SK.sleep(1500).then(once);
      return j;
    });
  }
  return slowly(once(), "Confirming");
}
/* no trial for this account or card: the full price, the card form redrawn for it, the words changed, and the box asked again */
function noTrial(x) {
  var pl = planOf(me.plan), raw = x && x.price != null ? x.price : price(pl.id, me.period), num = parseFloat(String(raw).replace(/[^0-9.]/g, "")) || 0;
  if (me.period === "year" && !(x && x.price != null)) num = parseFloat(String(then(pl.id, "year")).replace(/[^0-9.]/g, "")) || num;
  me.notrial = { price: "$" + (num % 1 ? num.toFixed(2) : num), cents: Math.round(num * 100) };
  payStep();
  return x && x.code === "trial_used_after" ? "This card already had a free trial. Your $1 was refunded. Start at " + me.notrial.price + "/" + (me.period === "year" ? "yr" : "mo") + " instead?"
    : "You've had your free trial. Studio " + pl.name + " is " + me.notrial.price + "/" + (me.period === "year" ? "year" : "month") + ".";
}
function lookup(code) {
  if (MOCK) return wait(300).then(function () { var s = { used: "joined", gone: "revoked", old: "expired", nope: "unknown" }[code.toLowerCase()] || "open"; return { state: s, from: "Evan Nicolini", name: "", plan: "pro" }; });
  return api("/web/invite?code=" + encodeURIComponent(code)).catch(function (x) { if (x.status === 404) return { state: "unknown" }; throw x; });
}
function redeem() {
  if (MOCK) return wait(700).then(function () { return { code: "STANDIN", download: "#download", open: "studio://handoff?code=STANDIN", account: { role: "friend", plan: "pro" } }; });
  var s = me.session; me.session = { access_token: s.access_token };
  return api("/web/invite/redeem", { access_token: s.access_token, refresh_token: s.refresh_token, code: INV }).catch(function (x) {
    throw E(x.code, { invite_joined: "This invite was already used. Ask the person who sent it for a new one.", invite_used: "This invite was already used. Ask the person who sent it for a new one.", invite_revoked: "This invite was taken back. Ask the person who sent it for a new one.", invite_expired: "This invite ran out. Ask the person who sent it for a new one.", invite_unknown: "This invite is not one we know. Check the link, or ask for a new one." }[x.code] || null);
  });
}

/* ---------- a friend's invite: no plan, no card ---------- */
function setInvite(inv) {
  me.invite = inv; var f = (inv.from || "").split(/\s+/)[0];
  var fromP = $("[data-st-from]"); fromP.hidden = false;
  $("[data-st-fi]").textContent = (f || "S").charAt(0).toUpperCase();
  $("[data-st-badge]").textContent = "Invite";
  var h = $("[data-st-in-h]"), s = $("[data-st-in-s]");
  if (inv.state !== "open") {
    var why = { joined: "This invite was already used.", revoked: "This invite was taken back.", expired: "This invite ran out.", unknown: "This invite is not one we know." }[inv.state] || "This invite can't be used.";
    $("[data-st-ft]").textContent = why;
    h.innerHTML = esc(why.replace(/\.$/, "")) + "<span>Ask for a new one.</span>";
    s.textContent = inv.state === "unknown" ? "Check the link, or ask the person who sent it for a new one." : "Ask the person who sent it for a new one.";
    $("[data-st-ways]").hidden = true; $("[data-st-fine]").hidden = true; next.hidden = true;
    return;
  }
  $("[data-st-ft]").textContent = (f ? f + " invited you" : "You're invited") + (inv.name ? ". For " + inv.name + "." : ".");
  $("[data-st-fine]").innerHTML = esc(f ? f + " invited you to Studio." : "You're invited to Studio.") + ' By continuing, you agree to the <a href="terms/" target="_blank" rel="noopener">Terms</a> and <a href="privacy/" target="_blank" rel="noopener">Privacy Policy</a>. Free invite access is up to Studio and can change or end at any time.';
  h.innerHTML = esc(f ? f + " invited you." : "You're invited.") + "<span>Studio Pro, on us.</span>";
  s.textContent = "No card, no plan. Sign in and Studio downloads.";
  ORDER = ["in", "code"]; setStep(at, true);
}

/* ---------- You're in ---------- */
var doneEl = $("[data-st-done]");
function showDone(has) {
  var f = first() || "there", pl = planOf(me.plan), h = me.hand || {};
  wall("done");
  $("[data-st-dk]").textContent = PAYWALL ? "Unlocked" : has ? "You have Studio" : "You're in";
  $("[data-st-dhi]").textContent = has ? "Welcome back, " + f + "." : "You're in, " + f + ".";
  $("[data-st-dsub2]").textContent = PAYWALL ? "Studio is unlocked." : "Studio is downloading.";
  if (PAYWALL) { $("[data-st-dhi]").textContent = "You're all set, " + f + "."; $$("[data-st-open] span").forEach(function (sp) { if (sp.textContent === "Open Studio") sp.textContent = PW.action === "export" ? "Back to your export" : "Back to Studio"; }); }
  $("[data-st-dsub]").textContent = has ? "Your plan is already on this account. Download Studio, or open it if it's on this Mac."
    : me.invite ? "Studio Pro, on " + ((me.invite.from || "a friend").split(/\s+/)[0]) + ". No card, nothing to cancel."
    : PAYWALL && me.promo ? "Your free month runs until " + startsLong() + ". Then " + then(pl.id, me.period) + ", unless you cancel before. Stripe will remind you before the first charge."
    : PAYWALL ? "Your 14 days run until " + renewLong + ". Then " + then(pl.id, me.period) + ", unless you cancel before. We'll remind you 3 days before."
    : "Free to start. Make your first video, and keep it for 14 days for $1 when you're ready.";
  var open = $("[data-st-open]"), dl = $("[data-st-dl]");
  if (STUDIO && h.code) { h.download = h.open = STUDIO + "/_launch/download?code=" + encodeURIComponent(h.code); }
  open.href = h.open || "studio://"; dl.href = h.download || "#";
  drawPass(pass2);
  pass1.stop();
  if (!sheet.classList.contains("done")) {
    sheet.classList.add("done"); sheet.classList.remove("shown");
    sheet.scrollTop = 0; doneEl.scrollTop = 0;
    pass2.enter(2100);
    setTimeout(function () { sheet.classList.add("shown"); }, SK.reduced ? 0 : 900);
    SFX.play("done");
    setTimeout(function () { doneEl.focus({ preventScroll: true }); }, 600);
    if (PAYWALL) { tell({ type: "studio-paywall:unlocked", plan: me.plan, period: me.period }); try { window.webkit.messageHandlers.studio.postMessage({ unlocked: true, plan: me.plan, period: me.period }); } catch (e) {} }
    else setTimeout(download, 1800);   /* the download starts by itself */
  }
}
var STUDIO = (Q.get("studio") || "").replace(/\/+$/, "");
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d{2,5}$/.test(STUDIO)) STUDIO = "";   /* the Hub's launch journey: a test Studio on this Mac */
function download() {
  var u = me.hand && me.hand.download;
  if (STUDIO && u) { location.href = u; return; }
  if (!u || u === "#download" || MOCK) { toast("Downloading Studio (stand-in)."); return; }
  var a = document.createElement("a"); a.href = u; a.rel = "noopener"; document.body.appendChild(a); a.click(); a.remove();
}
$("[data-st-dl]").addEventListener("click", function (e) { e.preventDefault(); download(); });
$("[data-st-open]").addEventListener("click", function (e) {
  if (PAYWALL) { e.preventDefault(); tell({ type: "studio-paywall:close" }); try { window.webkit.messageHandlers.studio.postMessage({ close: true }); } catch (x) { if (!EMBED) close(); } return; }
  if (MOCK) { e.preventDefault(); toast("Opens Studio, signed in (studio://handoff)."); }
});

/* ---------- open / close ---------- */
function open() {
  if (sheet.classList.contains("open")) return;
  lastFocus = document.activeElement;
  if (!sky.getAttribute("src")) { sky.src = WALL["in"]; $$(".pass .frost").forEach(function (f) { f.src = sky.src; }); }
  SFX.wake();
  sheet.hidden = false; sheet.scrollTop = 0;
  html.classList.add("wl-open");
  if (SK.kayla && SK.kayla.pause) SK.kayla.pause();
  if (!DEEP.test(location.hash)) { try { history.pushState({ st: 1 }, "", location.pathname + location.search + HASH); pushed = true; } catch (e) {} }
  requestAnimationFrame(function () { sizeStage(); slidePer(); requestAnimationFrame(function () { sheet.classList.add("open"); sizeStage(); }); });
  wallNow = sky.getAttribute("src");
  wall(ORDER[at]); want(ORDER[at + 1] || "done"); personal();
  intro().then(function () { reveal(stepEl(ORDER[at])); });
  drawHome();
  focusStep(SK.reduced ? 0 : 560);
}
/* Studio's logo animation opens it: the mark splits, slides, "Studio" blurs in; then the sky and the first question come through */
var introEl = $("[data-st-intro]"), introDone = false, logoP = null;
function intro() {
  if (introDone || SK.reduced || PAYWALL) { introDone = true; introEl.hidden = true; return Promise.resolve(); }
  introDone = true; sheet.classList.add("intro");
  logoP = logoP || new Promise(function (res) { if (window.StudioLogo) return res(); var s = document.createElement("script"); s.src = "assets/studio-logo-anim.js"; s.onload = res; s.onerror = res; document.head.appendChild(s); });
  return logoP.then(function () {
    if (!window.StudioLogo) return;
    var el = $("[data-st-logo]"), skip = false;
    introEl.addEventListener("pointerdown", function () { skip = true; }, { once: true });
    SFX.play("land", { gain: .6 });
    return Promise.race([StudioLogo.play(el, { mode: "lockup", ink: "#ffffff", width: "100%", height: "100%" }), new Promise(function (r) { (function w() { skip ? r() : setTimeout(w, 80); })(); })]).then(function () { return SK.sleep(skip ? 0 : 350); });
  }).then(function () {
    sheet.classList.remove("intro"); introEl.classList.add("out");
    setTimeout(function () { introEl.hidden = true; }, 900);
  });
}
function hide() {
  if (!sheet.classList.contains("open")) return;
  sheet.classList.remove("open"); html.classList.remove("wl-open"); pass1.stop(); pass2.stop();
  setTimeout(function () { if (!sheet.classList.contains("open")) sheet.hidden = true; }, SK.reduced ? 0 : 460);
  if (lastFocus && lastFocus.focus) try { lastFocus.focus({ preventScroll: true }); } catch (e) {}
}
function close() {
  if (pushed) { pushed = false; history.back(); return; }
  hide();
  if (DEEP.test(location.hash)) try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
}
window.addEventListener("popstate", function () { if (DEEP.test(location.hash)) open(); else { pushed = false; hide(); } });
window.addEventListener("hashchange", function () { if (DEEP.test(location.hash)) open(); });
document.addEventListener("click", function (e) { var t = e.target.closest && e.target.closest("[data-start], a[href='" + HASH + "']"); if (!t || sheet.contains(t)) return; e.preventDefault(); open(); });
$("[data-st-close]").addEventListener("click", function () { if (EMBED && PAYWALL) { tell({ type: "studio-paywall:close" }); return; } close(); });
$("[data-st-look]").addEventListener("click", function () { tell({ type: "studio-paywall:look" }); try { window.webkit.messageHandlers.studio.postMessage({ look: true }); } catch (e) {} });
sheet.addEventListener("keydown", function (e) {
  if (e.key === "Escape") { e.preventDefault(); close(); return; }
  if (e.key !== "Tab") return;
  var f = [].slice.call(sheet.querySelectorAll("button, input, a[href], [tabindex='0']")).filter(function (x) { return !x.disabled && x.offsetParent !== null && getComputedStyle(x).visibility !== "hidden"; });
  if (!f.length) return;
  var i = f.indexOf(document.activeElement);
  if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
});

/* Restart (this Mac only): back to the first step, nothing kept */
var restartB = $("[data-st-restart]");
restartB.hidden = !local;
restartB.addEventListener("click", function () { location.href = location.pathname + location.search.replace(/[?&]paid=1/, "") + HASH; location.reload(); });

/* live: the payment key comes from the server, never from this file (App & releases: a Worker var) */
if (LIVE && !CFG.stripe) fetch(CFG.worker + "/pricing.json").then(function (r) { return r.json(); }).then(function (j) { if (j && j.publishable_key) CFG.stripe = j.publishable_key; }).catch(function () {});

/* Studio shows #paywall in an iframe and talks to it with postMessage (no token ever in a URL). Only Studio's own window, on
   this Mac (127.0.0.1 / localhost), is listened to; everything goes back to that exact origin, never "*" (except "ready"). */
var PARENT = "", PW = { mode: "onboarding", action: "" };
function tell(msg) { if (EMBED && PARENT) try { window.parent.postMessage(msg, PARENT); } catch (e) {} }
window.addEventListener("message", function (e) {
  if (!EMBED || e.source !== window.parent || !/^http:\/\/(127\.0\.0\.1|localhost):\d{2,5}$/.test(e.origin)) return;
  var d = e.data || {};
  if (d.type === "studio-paywall:open") { PARENT = e.origin; window.StudioPaywall.open(d); }
});
var HEADS = { export: "Export it with Studio.", post: "Post it with Studio.", generate: "Make it with Studio." };
function pwHead() {
  if (!PAYWALL) return;
  var pl = planOf(me.plan), pq = stepEl("plan"), head = PW.mode === "locked" ? (HEADS[PW.action] || "Keep making with Studio.") : "Keep your Studio.";
  pq.querySelector(".wl-qh").innerHTML = esc(head) + "<span>" + (me.promo ? "Your first month is free, then " : "14 days for $1, then ") + esc(then(pl.id, me.period)) + ".</span>";
  pq.querySelector(".wl-qs").textContent = me.promo ? "Cancel anytime before " + startsLong() + " and you won't be charged. Your plan starts " + startsLong() + "."
    : "Cancel anytime before day 14 and you won't be charged again. Your plan starts " + renewLong + ".";
  $("[data-st-look]").textContent = PW.mode === "locked" ? "Not now" : "Look around first";
}
function paywall(o) {
  o = o || {};
  PW.mode = o.mode === "locked" ? "locked" : "onboarding"; PW.action = HEADS[o.action] ? o.action : "";
  if (o.plan && planOf(o.plan).id === o.plan) me.plan = o.plan;
  if (o.period === "year" || o.period === "month") me.period = o.period;
  me.first = String(o.first || o.first_name || o.given_name || o.name || o.full_name || "").trim().split(/\s+/)[0]; me.email = o.email || "";   /* Studio sends first; the other names are taken too */ me.session = { access_token: o.token || "mock" }; me.hand = { code: o.handoff || "" };
  $("[data-st-badge]").textContent = "Unlock";
  perEl.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-checked", x.getAttribute("data-per") === me.period ? "true" : "false"); });
  drawPlans(); slidePer(); pwHead();
  if (MOCK && !me.first) { me.first = "Evan"; me.email = "evan@studio.com"; }
  steps.forEach(function (q) { q.classList.remove("past"); q.classList.toggle("on", q.getAttribute("data-q") === "plan"); });   /* straight to the plan */
  at = 0; setStep(0, true); drawPlanStage();
}
window.StudioPaywall = { open: function (o) { paywall(o); open(); } };

if (EMBED && PAYWALL0) { try { window.parent.postMessage({ type: "studio-paywall:ready" }, "*"); } catch (e) {} }
if (EMBED) sheet.classList.add("embed");

/* first paint */
drawPlans(); drawHome(); setStep(0, true);
if (PAYWALL) paywall({});
if (INV) lookup(INV).then(setInvite, function () { setInvite({ state: "open", from: "" }); });
/* back from Google/Apple (the session is in the address), or from a bank's 3-D Secure page (?paid=1) */
if (LIVE && /access_token=/.test(location.hash)) supa().then(function (c) { return c.auth.getSession(); }).then(function (r) {
  var s = r && r.data && r.data.session; if (!s) return;
  var u = s.user || {}, md = u.user_metadata || {};
  me.session = s; me.email = u.email || ""; me.first = (md.given_name || md.first_name || md.full_name || md.name || "").split(/\s+/)[0];
  try { history.replaceState(null, "", location.pathname + location.search + HASH); } catch (e) {}
  open(); signedIn().catch(function (x) { err(say(x)); });
});
if (Q.has("paid") && LIVE) {   /* back from the bank: pick up where Pay left off */
  var back = null; try { back = JSON.parse(sessionStorage.getItem("studio-checkout") || "null"); } catch (e) {}
  if (back) {
    me.first = back.first || ""; me.email = back.email || ""; me.plan = back.plan || "pro"; me.period = back.period || "month"; me.hand = { code: back.handoff };
    open();
    status(back.subscription).then(paid, function (x) { setStep(ORDER.indexOf("pay")); err(Q.get("redirect_status") === "failed" ? "Your bank didn't approve the $1. Try another card." : say(x)); });
  }
}
if (DEEP.test(location.hash)) setTimeout(open, SK.reduced ? 0 : 250);
