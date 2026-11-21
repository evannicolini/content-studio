/* 900 early: early access sign-ups, built like the app's onboarding (section.html, section.css).
   While sign-ups are on: every Download button (nav, hero, steps) says "Get early access", the plans' "Coming soon" too, a card above the
   plans offers it, a floating button follows you down the page, and all of them open the sign-up. So does any link ending in #early-access
   (the Instagram DM link, and every friend's ?ref= link; both skip the Enter site gate).
   The sign-up: who you are (pick all that fit), how many brands, Claude yet, then the invite details. Beside each question a piece of
   Studio answers it, live. Then "You're on the list": your place, your pass, and your own link: each friend who joins moves you up.
   Where sign-ups go (src/waitlist.json, inlined by build.py): "api" (the waitlist worker in worker/: places and referrals), else
   "brevo_form" (a Brevo form: no places), else "webhook" (JSON). With none, the live site stays on Download; localhost and ?early show
   the flow, and on localhost a sign-up is answered with a made-up place. ?api=<url> on localhost points it at a local worker. */
var cfg = Object.assign({}, window.SK_WAITLIST || {});
var Q = new URLSearchParams(location.search), H = new URLSearchParams(location.hash.replace(/^#[^&]*&?/, ""));
var local = /^(127\.0\.0\.1|localhost|\[::1\])$/.test(location.hostname);
if (local && Q.get("api")) cfg.api = Q.get("api");
var API = (cfg.api || "").replace(/\/+$/, "");
var wired = !!(API || cfg.brevo_form || cfg.webhook);
var sheet = document.getElementById("early-access");
if (!sheet) return;
if (!(wired || local || /[?&]early(=|&|$)/.test(location.search))) { sheet.remove(); return; }
SK.early = true;
var html = document.documentElement, KEY = "studio-early", HASH = "#early-access", DEEP = /^#early(-access)?(&|$)/;
var STAR = '<svg class="ea-ic" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 .9c.5 4.1 2.9 6.6 7.1 7.1-4.2.5-6.6 2.9-7.1 7.1C7.5 10.9 5 8.5.9 8 5 7.5 7.5 5 8 .9Z"/></svg>';
var ARROW = '<span class="go"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9.5M8.5 4l4 4-4 4"/></svg></span>';
var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
var M = "assets/media/";

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
  b.type = "button"; b.className = "pd-btn" + (s.classList.contains("best") || head.querySelector(".pd-tag") ? " go" : ""); /* the plan with the tag (Most popular) is the pearl one */
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

/* ---------- the sheet ---------- */
var form = sheet.querySelector(".wl-form"), box = sheet.querySelector(".wl-steps"), steps = [].slice.call(sheet.querySelectorAll(".wl-q"));
var ORDER = steps.map(function (s) { return s.getAttribute("data-q"); });
var dots = [].slice.call(sheet.querySelectorAll(".wl-dots li")), scenes = {};
sheet.querySelectorAll(".wl-sc").forEach(function (s) { scenes[s.getAttribute("data-sc")] = s; });
var back = sheet.querySelector("[data-wl-back]"), next = sheet.querySelector("[data-wl-next]"), go = sheet.querySelector(".wl-go"), fine = sheet.querySelector("[data-wl-fine]");
var sky = sheet.querySelector(".wl-sky"), err = sheet.querySelector(".wl-err"), fit = sheet.querySelector(".wl-fit"), stage = sheet.querySelector(".wl-stage");
var sel = sheet.querySelector(".wl-cc select"), ccv = sheet.querySelector(".wl-ccv"), toastEl = sheet.querySelector("[data-wl-toast]");
var at = 0, busy = false, pushed = false, lastFocus = null, from = "link", ans = { roles: [], brands: "", claude: "" };

function toast(t) { toastEl.textContent = t; toastEl.classList.add("on"); clearTimeout(toastEl._t); toastEl._t = setTimeout(function () { toastEl.classList.remove("on"); }, 2400); }

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

/* ---------- the stage: what Studio makes for who you are, your brands, Claude at work, your pass ---------- */
var MADE = {
  "Business owner": ["coffee-friend-arrives", "Ads", "This week's offer"], "Founder": ["cofounder-whiteboard", "Film", "Your launch film"],
  "Creator": ["surfing", "Reels", "A reel a day"], "Video editor": ["race-track", "Full edits", "First cut, ready"],
  "Social media manager": ["get-together", "Social", "The month, planned"], "Marketer": ["tennis-forehand", "Ads", "Five to test"],
  "Agency": ["private-jet", "Brands", "Every client, on brand"], "Something else": ["above-the-clouds", "Ask", "Whatever you dream up"]
};
var PROMPT = {
  "Business owner": "Make an ad for this week's offer", "Founder": "Make me a launch film for my company", "Creator": "Turn yesterday's shoot into three reels",
  "Video editor": "Cut my footage into a first edit", "Social media manager": "Plan and post this month on every channel", "Marketer": "Make five ad versions and test them",
  "Agency": "Make this week's posts for all my clients", "Something else": "Make me a launch commercial for my company"
};
var BRANDS = [
  { n: "Your brand", s: "Brand kit ready", m: "Y", bg: "linear-gradient(135deg,#f2efe8,#c9c3b8)", ink: "#111", sw: ["#111", "#f2efe8", "#e8613c", "#2b3a55"] },
  { n: "MIRRA", s: "14 posts this week", img: "assets/hero/brand-mirra.png", sw: ["#0b0d12", "#e9edf5", "#5b7cff", "#9fb4ff"] },
  { n: "Custom Esignature", s: "3 ads running", img: "assets/hero/brand-ces.png", sw: ["#06111f", "#ffffff", "#1f7aff", "#7fb4ff"] },
  { n: "Halden", s: "Running gear", m: "h", bg: "#151515", sw: ["#151515", "#f3f0ea", "#e8613c", "#d8c9b0"] },
  { n: "Northline", s: "Coffee roasters", m: "N", bg: "linear-gradient(135deg,#3a5a40,#1f3324)", sw: ["#1f3324", "#efe6d6", "#c98b4b", "#6d8a70"] }
];
function list(a) { return a.length < 2 ? (a[0] || "") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1]; }
function article(w) { return /^[AEIOU]/i.test(w) ? "an" : "a"; }
function drawRoles() {
  var r = ans.roles, made = sheet.querySelector("[data-wl-made]"), forEl = sheet.querySelector("[data-wl-for]");
  forEl.innerHTML = r.length ? "Made for " + article(r[0]) + " " + list(r.map(function (x) { return "<b>" + esc(x.toLowerCase().replace(/^(\w)/, function (c) { return c; })) + "</b>"; })) + "." : "Tell Studio who you are.";
  var have = [].slice.call(made.querySelectorAll(".wl-mc")).map(function (c) { return c.getAttribute("data-r"); });
  var want = r.slice(0, 4);
  if (have.join("|") === want.join("|")) return;
  var out = want.map(function (k, i) {
    var m = MADE[k], fresh = have.indexOf(k) < 0;
    return '<span class="wl-mc' + (fresh ? " wl-in-a" : "") + '" data-r="' + esc(k) + '" style="--i:' + i + '"><img src="' + M + "selects/" + m[0] + '.jpg" alt=""><i>v01</i><span><em>' + esc(m[1]) + "</em><b>" + esc(m[2]) + "</b></span></span>";
  });
  for (var i = want.length; i < 4; i++) out.push('<span class="wl-ph"></span>');
  made.innerHTML = out.join("");
}
function drawBrands() {
  var n = ans.brands === "4+" ? 5 : ans.brands === "2-3" ? 3 : 1, ul = sheet.querySelector("[data-wl-bl]");
  sheet.querySelector("[data-wl-bn]").textContent = ans.brands || "1";
  var have = ul.children.length;
  ul.innerHTML = BRANDS.slice(0, n).map(function (b, i) {
    var mono = b.img ? '<img src="' + b.img + '" alt="">' : '<span style="background:' + b.bg + ";color:" + (b.ink || "#fff") + '">' + b.m + "</span>";
    return '<li class="wl-br' + (i === 0 ? " on" : "") + (i >= have ? " wl-in-a" : "") + '" style="--i:' + (i - have) + '"><span class="wl-bm">' + mono.replace("<span", '<span class="x"') + '</span><span class="wl-bt"><b>' + esc(b.n) + "</b><span>" + esc(b.s) + '</span></span><span class="wl-sw">' + b.sw.map(function (c) { return '<i style="background:' + c + '"></i>'; }).join("") + "</span></li>";
  }).join("") + (n === 5 ? '<li class="wl-more wl-in-a" style="--i:5">And every brand you run</li>' : "");
  ul.querySelectorAll(".wl-bm .x").forEach(function (x) { x.style.cssText += ";display:grid;place-items:center;width:100%;height:100%"; });
}
function drawClaude() {
  var chip = sheet.querySelector("[data-wl-chip]"), t = chip.querySelector("span");
  var c = ans.claude;
  chip.classList.toggle("wait", c === "Free plan" || c === "Not yet");
  t.textContent = c === "Pro or Max" ? "Claude connected. You're ready." : c === "Free plan" ? "Claude Pro unlocks Studio. One click." : c === "Not yet" ? "We'll set Claude up with you." : "Claude, connected in one click";
}
/* the composer types a request that fits who you are, works, and the cuts land */
var typeTok = 0;
function typeLoop() {
  var my = ++typeTok, comp = sheet.querySelector(".wl-comp"), t = sheet.querySelector("[data-wl-type]"), res = sheet.querySelector("[data-wl-res]");
  var w = function (ms) { return SK.sleep(SK.reduced ? 0 : ms).then(function () { if (my !== typeTok) throw 0; }); };
  var picks = ans.roles.length ? ans.roles : ["Founder"];
  (async function () {
    try {
      for (var round = 0; ; round++) {
        var k = picks[round % picks.length], text = PROMPT[k] || PROMPT.Founder, film = MADE[k] || MADE.Founder;
        comp.classList.remove("has", "work"); t.textContent = ""; res.innerHTML = "";
        await w(500);
        for (var i = 1; i <= text.length; i++) { t.textContent = text.slice(0, i); comp.classList.toggle("has", i > 0); await w(38 + Math.random() * 30); }
        await w(450); comp.classList.add("work");
        await w(1300); comp.classList.remove("work");
        var shots = [film[0], (MADE[picks[(round + 1) % picks.length]] || MADE.Creator)[0], "golf"];
        res.innerHTML = shots.map(function (s, j) { return '<span class="wl-rc wl-in-a" style="--i:' + j + '"><span class="wl-mc"><img src="' + M + "selects/" + s + '.jpg" alt=""><i>v0' + (j + 1) + "</i><span><em>" + esc(film[1]) + "</em><b>" + (j ? "Version " + (j + 1) : esc(film[2])) + "</b></span></span></span>"; }).join("");
        await w(3600);
      }
    } catch (e) {}
  })();
}
function bars(svg, seed) {
  var s = 0, out = [], x = 0; for (var i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  s = s || 7;
  while (x < 300) { s = (s * 16807) % 2147483647; var w = 1 + (s % 4), gap = 1 + ((s >> 3) % 3); out.push('<rect x="' + x + '" y="0" width="' + w + '" height="34"/>'); x += w + gap; }
  svg.innerHTML = out.join("");
}
function drawPass() {
  var f = val("first"), l = val("last"), e = val("email");
  var nm = sheet.querySelector("[data-wl-pname]");
  nm.innerHTML = f || l ? esc((f + " " + l).trim()) : '<span class="ph">Your name</span>';
  sheet.querySelector("[data-wl-pmail]").textContent = e || "you@email.com";
  sheet.querySelector("[data-wl-pfor]").textContent = ans.roles[0] || "Mac";
  bars(sheet.querySelector("[data-wl-bars]"), (f + l + e) || "studio");
}
function sizeStage() {
  var r = stage.getBoundingClientRect();
  if (!r.width) return;
  var s = Math.min(r.width / 640, (r.height || 520) / 520, 1.12);
  fit.style.setProperty("--s", Math.max(.3, s).toFixed(3));
}
window.addEventListener("resize", function () { requestAnimationFrame(sizeStage); });

/* ---------- moving between questions ---------- */
function stepEl(n) { return steps[n]; }
function ready(n) { var q = ORDER[n]; return q === "roles" ? ans.roles.length > 0 : q === "you" ? true : !!ans[q]; }
function setStep(n, quiet) {
  var cur = stepEl(at), nx = stepEl(n), q = ORDER[n];
  if (cur !== nx) {
    var h0 = box.offsetHeight;
    cur.classList.remove("on"); cur.classList.toggle("past", n > at);
    nx.classList.remove("past"); nx.classList.add("on");
    var h1 = nx.offsetHeight;
    box.style.height = h0 + "px"; void box.offsetHeight; box.style.height = h1 + "px";
    clearTimeout(box._t); box._t = setTimeout(function () { box.style.height = ""; }, 560);
    var a = scenes[ORDER[at]], b = scenes[q];
    if (a) { a.classList.remove("on"); a.classList.toggle("past", n > at); }
    if (b) { b.classList.remove("past"); b.classList.add("on"); }
  }
  at = n;
  sheet.setAttribute("data-step", q);
  dots.forEach(function (d, i) { d.classList.toggle("on", i === n); d.classList.toggle("ok", i < n); });
  back.hidden = n === 0;
  var last = q === "you";
  next.hidden = last; go.hidden = !last; fine.hidden = !last;
  next.disabled = !ready(n);
  if (q === "claude") typeLoop(); else typeTok++;
  if (q === "you") drawPass();
  if (!quiet) focusStep(SK.reduced ? 0 : 420);
}
function focusStep(delay) {
  setTimeout(function () {
    if (!sheet.classList.contains("open")) return;
    if (sheet.classList.contains("done")) { sheet.querySelector("[data-wl-done]").focus({ preventScroll: true }); return; }
    var s = stepEl(at), t = s.querySelector(".wl-opt.sel") || s.querySelector(".wl-opt, input");
    if (t && !(SK.mobile() && t.tagName === "INPUT")) t.focus({ preventScroll: true }); /* phones: no keyboard until they tap */
  }, delay);
}
function advance() { if (busy || !ready(at) || at >= ORDER.length - 1) return; busy = true; setStep(at + 1); setTimeout(function () { busy = false; }, 450); }
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
      } else {
        s.querySelectorAll(".wl-opt").forEach(function (x) { x.classList.toggle("sel", x === o); x.setAttribute("aria-pressed", x === o ? "true" : "false"); });
        ans[q] = v;
      }
      next.disabled = !ready(at);
      if (q === "roles") drawRoles(); else if (q === "brands") drawBrands(); else if (q === "claude") drawClaude();
      if (!multi) setTimeout(advance, SK.reduced ? 60 : 480); /* one answer: on to the next, after it has landed on the right */
    });
  });
});
next.addEventListener("click", advance);
back.addEventListener("click", function () { if (at > 0 && !busy) setStep(at - 1); });

/* ---------- open / close ---------- */
function joined() { try { var j = JSON.parse(localStorage.getItem(KEY) || "null"); return j && j.first && j.code ? j : null; } catch (e) { return null; } } /* a sign-up saved without a code (the first version) counts as none */
function open(src) {
  from = src || from;
  if (sheet.classList.contains("open")) return;
  lastFocus = document.activeElement;
  if (!sky.getAttribute("src")) sky.src = matchMedia("(max-width: 700px) and (max-aspect-ratio: 3/4)").matches ? "assets/hero/sky-m.jpg" : "assets/hero/sky.jpg";
  var j = joined();
  if (j && j.first) showDone(j, true);
  sheet.hidden = false; sheet.scrollTop = 0;
  html.classList.add("wl-open");
  if (SK.kayla && SK.kayla.pause) SK.kayla.pause();
  if (!DEEP.test(location.hash)) { try { history.pushState({ wl: 1 }, "", location.pathname + location.search + HASH); pushed = true; } catch (e) {} }
  requestAnimationFrame(function () { sizeStage(); requestAnimationFrame(function () { sheet.classList.add("open"); sizeStage(); }); });
  if (ORDER[at] === "claude") typeLoop();
  focusStep(SK.reduced ? 0 : 560);
}
function hide() {
  if (!sheet.classList.contains("open")) return;
  sheet.classList.remove("open"); html.classList.remove("wl-open"); typeTok++;
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
  if (e.key === "Enter" && !sheet.classList.contains("done") && ORDER[at] !== "you" && !e.target.closest(".wl-opt, .wl-back")) { e.preventDefault(); advance(); return; }
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
  var say = function (first) {
    var face = refP.querySelector("[data-wl-ref-face]");
    if (face) face.outerHTML = '<span class="wl-ri">' + esc((first || "S").charAt(0).toUpperCase()) + "</span>";
    refP.querySelector("[data-wl-ref-t]").textContent = first ? first + " saved you a spot." : "A friend saved you a spot.";
    refP.hidden = false;
  };
  if (API) fetch(API + "/status?code=" + encodeURIComponent(REF)).then(function (r) { return r.json(); }).then(function (j) { say(j && j.ok ? j.first : ""); }, function () { say(""); });
  else say("");
}

/* ---------- the details, checked and sent ---------- */
var inputs = [].slice.call(form.querySelectorAll(".wl-fields input:not(.wl-hp)"));
inputs.forEach(function (inp, k) {
  inp.addEventListener("input", function () { var f = inp.closest(".wl-f"); if (f.classList.contains("bad")) { f.classList.remove("bad"); if (!form.querySelector(".wl-f.bad")) err.textContent = ""; } drawPass(); });
  inp.addEventListener("keydown", function (e) { if (e.key === "Enter" && k < inputs.length - 1) { e.preventDefault(); inputs[k + 1].focus(); } });
});
/* the composer's beam runs round the field you are typing in */
sheet.querySelectorAll(".wl-box").forEach(function (b) {
  var fb = b.querySelector(".wl-fb");
  b.addEventListener("focusin", function () { fb.setAttribute("data-active", ""); });
  b.addEventListener("focusout", function () { fb.removeAttribute("data-active"); });
});
function val(n) { return (form.elements[n].value || "").trim(); }
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
  var mine = code6(), sms = d.cc ? d.phone : d.phone, base = { code: mine, first: d.first, position: null, total: null, referrals: 0, boost: 0 };
  if (cfg.brevo_form) {
    var post = function (withSms) {
      var fd = new FormData(), f = { EMAIL: d.email, FIRSTNAME: d.first, LASTNAME: d.last, ROLE: d.roles.join(", "), BRANDS: d.brands, CLAUDE: d.claude, SOURCE: d.source, REF_CODE: mine, REFERRED_BY: d.ref || "" };
      if (withSms) { f.SMS = sms; if (d.cc) f.SMS__COUNTRY_CODE = "+" + d.cc; }
      Object.keys(f).forEach(function (k) { fd.append(k, f[k]); });
      fd.append("email_address_check", ""); fd.append("locale", "en");
      var url = cfg.brevo_form + (cfg.brevo_form.indexOf("?") < 0 ? "?" : "&") + "isAjax=1";
      return timed(fetch(url, { method: "POST", body: fd }), 15000).then(function (r) { return r.json().catch(function () { return {}; }); }, function () {
        return fetch(url, { method: "POST", body: fd, mode: "no-cors" }).then(function () { return { success: true }; }); /* no CORS: it still lands */
      });
    };
    /* Brevo refuses the whole sign-up when it doesn't like a phone number: then the name and email still go in, without the phone */
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
  var first = val("first"), last = val("last"), email = val("email"), phone = val("phone"), digits = phone.replace(/\D/g, ""), c = cc();
  var bad = [];
  if (!first) bad.push(["first", "Add your first name."]);
  if (!last) bad.push(["last", "Add your last name."]);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) bad.push(["email", email ? "That email doesn't look right." : "Add your email."]);
  if (digits.length < 6 || digits.length > 15) bad.push(["phone", phone ? "That phone number looks too short." : "Add your phone number."]);
  form.querySelectorAll(".wl-f.bad").forEach(function (f) { f.classList.remove("bad"); });
  if (bad.length) {
    bad.forEach(function (b) { var f = form.elements[b[0]].closest(".wl-f"); void f.offsetWidth; f.classList.add("bad"); });
    err.textContent = bad.length === 1 ? bad[0][1] : "Fill in the highlighted fields.";
    form.elements[bad[0][0]].focus();
    return;
  }
  err.textContent = "";
  var intl = /^\s*\+/.test(phone);
  var d = { first: first, last: last, email: email, phone: intl ? "+" + digits : digits.replace(/^0+/, ""), cc: intl ? "" : c[1], roles: ans.roles, brands: ans.brands, claude: ans.claude, source: SRC + " · " + from, ref: REF, hp: val("company") };
  go.classList.add("busy");
  send(d).then(function (j) {
    var rec = { first: first, last: last, code: j.code, position: j.position, total: j.total, referrals: j.referrals || 0, boost: j.boost || 0, at: Date.now() };
    try { localStorage.setItem(KEY, JSON.stringify(rec)); sessionStorage.removeItem("studio-ref"); } catch (x) {}
    showDone(rec);
  }, function (x) {
    err.textContent = x && x.human ? x.message : "That didn't go through. Check your connection and try again.";
  }).then(function () { go.classList.remove("busy"); });
});

/* ---------- You're on the list ---------- */
var doneEl = sheet.querySelector("[data-wl-done]"), rec = null;
function link(r) { return r && r.code ? location.origin + location.pathname + "?ref=" + encodeURIComponent(r.code) + HASH : ""; }
var SAY = "I just got early access to Studio. One prompt takes the idea in your head to a finished video. Get on the list:";
function showDone(r, quiet) {
  rec = r;
  if (!sheet.classList.contains("done")) sheet.querySelectorAll(".wl-settled").forEach(function (x) { x.classList.remove("wl-settled"); }); /* play the entrance again */
  var ranked = typeof r.position === "number" && r.position > 0;
  sheet.querySelector("[data-wl-dhi]").textContent = "You're in, " + r.first + ".";
  var pos = sheet.querySelector("[data-wl-dpos]");
  pos.innerHTML = ranked ? "<b>#" + r.position.toLocaleString("en-US") + "</b> on the list." : "";
  pos.hidden = !ranked;
  sheet.querySelector("[data-wl-rboost]").textContent = ranked && r.boost ? "Every friend who joins with your link moves you up " + r.boost + " spots." : "Send them your link. They get early access too.";
  sheet.querySelector(".wl-rtop b").textContent = ranked ? "Share with 3 friends to move up the list" : "Know someone who'd want this?";
  sheet.querySelector("[data-wl-slots]").hidden = !ranked;
  sheet.querySelectorAll("[data-wl-slots] li").forEach(function (li, i) { li.classList.toggle("got", i < (r.referrals || 0)); li.querySelector("span").textContent = i < (r.referrals || 0) ? "Joined" : "Friend " + (i + 1); });
  var url = link(r), urlEl = sheet.querySelector("[data-wl-url]"), shareBox = sheet.querySelector("[data-wl-share]"), copyB = sheet.querySelector("[data-wl-copy]");
  urlEl.textContent = url ? url.replace(/^https?:\/\//, "") : "Making your link…"; /* never "undefined": no code yet, no link yet */
  urlEl.classList.toggle("wait", !url); copyB.disabled = !url; shareBox.style.pointerEvents = url ? "" : "none"; shareBox.style.opacity = url ? "" : ".4";
  sheet.querySelector("[data-wl-pname2]").textContent = r.first + (r.last ? " " + r.last : "");
  sheet.querySelector("[data-wl-pmail2]").textContent = ranked ? "On the list since " + new Date(r.at || Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "On the list";
  sheet.querySelector("[data-wl-pno2]").textContent = ranked ? "#" + r.position.toLocaleString("en-US") : "In";
  sheet.querySelector("[data-wl-pref]").textContent = Math.min(3, r.referrals || 0) + " of 3";
  bars(sheet.querySelector("[data-wl-bars2]"), r.code || r.first);
  var t = encodeURIComponent(SAY), u = encodeURIComponent(url);
  var hrefs = { sms: "sms:?&body=" + encodeURIComponent(SAY + " " + url), wa: "https://wa.me/?text=" + encodeURIComponent(SAY + " " + url), x: "https://twitter.com/intent/tweet?text=" + t + "&url=" + u, mail: "mailto:?subject=" + encodeURIComponent("Get early access to Studio") + "&body=" + encodeURIComponent(SAY + "\n\n" + url) };
  sheet.querySelectorAll("[data-sh]").forEach(function (a) { var k = a.getAttribute("data-sh"); if (hrefs[k]) a.href = hrefs[k]; });
  sheet.querySelector('[data-sh="more"]').hidden = !navigator.share;
  sheet.classList.add("done");
  sheet.scrollTop = 0; doneEl.scrollTop = 0;
  typeTok++;
  if (!quiet) focusStep(500);
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
sheet.querySelector('[data-sh="more"]').addEventListener("click", function (e) { e.preventDefault(); if (rec && navigator.share) navigator.share({ title: "Studio", text: SAY, url: link(rec) }).catch(function () {}); });
sheet.querySelector('[data-sh="ig"]').addEventListener("click", function (e) { e.preventDefault(); if (rec && rec.code) story(rec); });

/* ---------- start over: "Not you?" on the done screen, and Restart on localhost or with ?early. Clears the saved sign-up. ---------- */
function startOver() {
  try { localStorage.removeItem(KEY); } catch (e) {}
  rec = null; ans = { roles: [], brands: "", claude: "" }; typeTok++;
  sheet.querySelectorAll(".wl-opt.sel").forEach(function (o) { o.classList.remove("sel"); o.setAttribute("aria-pressed", "false"); });
  inputs.forEach(function (i) { i.value = ""; }); form.elements.company.value = "";
  form.querySelectorAll(".wl-f.bad").forEach(function (f) { f.classList.remove("bad"); }); err.textContent = "";
  steps.forEach(function (s, i) { s.classList.remove("past"); s.classList.toggle("on", i === 0); });
  Object.keys(scenes).forEach(function (k) { scenes[k].classList.remove("past"); scenes[k].classList.toggle("on", k === ORDER[0]); });
  box.style.height = "";
  at = 0; sheet.classList.remove("done");
  drawRoles(); drawBrands(); drawClaude(); drawPass(); setStep(0);
  sheet.scrollTop = 0;
}
sheet.querySelector("[data-wl-over]").addEventListener("click", startOver);
doneEl.addEventListener("animationend", function (e) { if (e.target.matches(".wl-dl > *, .wl-dr")) e.target.classList.add("wl-settled"); });
var restartB = sheet.querySelector("[data-wl-restart]");
restartB.hidden = !(local || /[?&]early(=|&|$)/.test(location.search));
restartB.addEventListener("click", startOver);

/* an Instagram story: a 1080 x 1920 picture of the pass. Phones share it straight to Instagram; elsewhere it saves, and the link is copied */
function img(src) { return new Promise(function (res) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = function () { res(null); }; i.src = src; }); }
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
async function story(r) {
  var url = link(r), W = 1080, Hh = 1920, cv = document.createElement("canvas"); cv.width = W; cv.height = Hh;
  var g = cv.getContext("2d"), bg = await img("assets/hero/sky-m.jpg"), mark = await img("assets/studio-mark.png");
  try { await document.fonts.ready; } catch (e) {}
  g.fillStyle = "#0b1220"; g.fillRect(0, 0, W, Hh);
  if (bg) { var s = Math.max(W / bg.width, Hh / bg.height); g.drawImage(bg, (W - bg.width * s) / 2, (Hh - bg.height * s) * .4, bg.width * s, bg.height * s); }
  var gr = g.createLinearGradient(0, 0, 0, Hh); gr.addColorStop(0, "rgba(5,8,12,.35)"); gr.addColorStop(.5, "rgba(5,8,12,.15)"); gr.addColorStop(1, "rgba(5,8,12,.7)"); g.fillStyle = gr; g.fillRect(0, 0, W, Hh);
  var F = "'Hanken Grotesk', 'Helvetica Neue', Helvetica, sans-serif", MO = "'IBM Plex Mono', Menlo, monospace";
  g.fillStyle = "#fff"; g.textAlign = "center";
  if (mark) g.drawImage(mark, W / 2 - 150, 250, 64, 64);
  g.font = "600 56px " + F; g.textAlign = "left"; g.fillText("Studio", W / 2 - 66, 298); g.textAlign = "center";
  g.font = "300 118px " + F; g.fillText("I'm on the list.", W / 2, 560);
  g.fillStyle = "rgba(245,243,238,.8)"; g.font = "400 46px " + F; g.fillText("One prompt. A finished video.", W / 2, 650);
  // the pass
  g.save(); g.translate(W / 2, 1060); g.rotate(-.035);
  rr(g, -400, -250, 800, 500, 60); g.fillStyle = "rgba(10,14,22,.62)"; g.fill();
  var rim = g.createLinearGradient(-400, -250, 400, 250); rim.addColorStop(0, "rgba(120,170,255,.95)"); rim.addColorStop(.5, "rgba(255,255,255,.35)"); rim.addColorStop(1, "rgba(0,204,255,.9)"); g.strokeStyle = rim; g.lineWidth = 4; g.stroke();
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

/* first paint of the stage */
drawRoles(); drawBrands(); drawClaude(); drawPass(); setStep(0, true);
