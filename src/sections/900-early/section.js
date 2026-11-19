/* 900 early: early access sign-ups. While they are on, every Download button (nav, hero, steps) says "Get early access", the plans'
   "Coming soon" says it too, a card above the plans offers it, and all of them open the full-screen sign-up (section.html), as does any
   link ending in #early-access (the Instagram DM link; it skips the Enter site gate).
   On when src/waitlist.json names where sign-ups go (a Brevo form, or a webhook), and always on localhost or with ?early to look at it.
   With nothing named, the live site stays exactly as it was. On localhost with nothing named, a sign-up is only logged to the console.
   Sent: FIRSTNAME, LASTNAME, EMAIL, SMS (+ SMS__COUNTRY_CODE), ROLE, BRANDS, CLAUDE, SOURCE (utm_source / ref, then the button). */
var cfg = window.SK_WAITLIST || {};
var local = /^(127\.0\.0\.1|localhost|\[::1\])$/.test(location.hostname);
var wired = !!(cfg.brevo_form || cfg.webhook);
var sheet = document.getElementById("early-access");
if (!sheet) return;
if (!(wired || local || /[?&]early(=|&|$)/.test(location.search))) { sheet.remove(); return; }
SK.early = true;
var html = document.documentElement, KEY = "studio-early", HASH = "#early-access", DEEP = /^#early(-access)?(&|$)/;
var STAR = '<svg class="ea-ic" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 .9c.5 4.1 2.9 6.6 7.1 7.1-4.2.5-6.6 2.9-7.1 7.1C7.5 10.9 5 8.5.9 8 5 7.5 7.5 5 8 .9Z"/></svg>';

/* ---------- the buttons ---------- */
document.querySelectorAll("[data-download]").forEach(function (b) {
  b.removeAttribute("data-download");
  b.setAttribute("data-early", b.closest(".nav") ? "nav" : b.closest("#hero") ? "hero" : "steps");
  b.setAttribute("href", HASH);
  var svg = b.querySelector(":scope > svg");
  if (svg) svg.outerHTML = STAR; else b.insertAdjacentHTML("afterbegin", STAR);
  var sp = b.querySelector(":scope > span:not([data-beam-bloom])");
  if (sp) sp.textContent = "Get early access";
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
document.querySelectorAll("[data-early-band]").forEach(function (el) { el.hidden = false; });

/* ---------- the sheet ---------- */
var form = sheet.querySelector(".wl-form"), box = sheet.querySelector(".wl-steps"), steps = [].slice.call(sheet.querySelectorAll(".wl-q"));
var nEl = sheet.querySelector("[data-wl-n]"), bar = sheet.querySelector("[data-wl-bar]"), back = sheet.querySelector("[data-wl-back]");
var sky = sheet.querySelector(".wl-sky"), err = sheet.querySelector(".wl-err"), go = sheet.querySelector(".wl-go"), doneH = sheet.querySelector("[data-wl-done-h]");
var sel = sheet.querySelector(".wl-cc select"), ccv = sheet.querySelector(".wl-ccv");
var at = 0, busy = false, pushed = false, lastFocus = null, ans = {}, from = "link";

/* country codes for the phone: the visitor's own region first */
var CC = [["US", "1"], ["CA", "1"], ["GB", "44"], ["AU", "61"], ["NZ", "64"], ["IE", "353"], ["DE", "49"], ["FR", "33"], ["ES", "34"], ["IT", "39"], ["NL", "31"], ["BE", "32"], ["CH", "41"], ["AT", "43"], ["SE", "46"], ["NO", "47"], ["DK", "45"], ["FI", "358"], ["PT", "351"], ["PL", "48"], ["AE", "971"], ["SA", "966"], ["IL", "972"], ["TR", "90"], ["ZA", "27"], ["NG", "234"], ["KE", "254"], ["EG", "20"], ["IN", "91"], ["PK", "92"], ["SG", "65"], ["MY", "60"], ["ID", "62"], ["PH", "63"], ["TH", "66"], ["VN", "84"], ["JP", "81"], ["KR", "82"], ["HK", "852"], ["CN", "86"], ["BR", "55"], ["MX", "52"], ["AR", "54"], ["CO", "57"], ["CL", "56"], ["PE", "51"]];
var flag = function (c) { return String.fromCodePoint.apply(null, c.split("").map(function (x) { return 127397 + x.charCodeAt(0); })); };
var names = null; try { names = new Intl.DisplayNames(["en"], { type: "region" }); } catch (e) {}
var region = ((navigator.languages && navigator.languages[0]) || navigator.language || "").split("-")[1];
region = region && region.toUpperCase();
sel.innerHTML = CC.map(function (c) { return '<option value="' + c[0] + '">' + flag(c[0]) + "  " + (names ? names.of(c[0]) : c[0]) + " (+" + c[1] + ")</option>"; }).join("");
sel.value = CC.some(function (c) { return c[0] === region; }) ? region : "US";
function cc() { var c = CC.filter(function (x) { return x[0] === sel.value; })[0] || CC[0]; return c; }
function showCC() { var c = cc(); ccv.textContent = flag(c[0]) + " +" + c[1]; }
sel.addEventListener("change", showCC); showCC();

function setStep(n) {
  var cur = steps[at], nxt = steps[n];
  if (cur !== nxt) {
    var h0 = box.offsetHeight;
    cur.classList.remove("on"); cur.classList.toggle("past", n > at);
    nxt.classList.remove("past"); nxt.classList.add("on");
    var h1 = nxt.offsetHeight;
    box.style.height = h0 + "px"; void box.offsetHeight; box.style.height = h1 + "px";
    clearTimeout(box._t); box._t = setTimeout(function () { box.style.height = ""; }, 520);
  }
  at = n;
  var last = nxt.getAttribute("data-q") === "done";
  sheet.classList.toggle("done", last);
  if (!last) { nEl.textContent = "0" + (n + 1); bar.style.width = (n + 1) * 25 + "%"; }
  back.hidden = !(n > 0 && !last);
}
function focusStep(delay) {
  setTimeout(function () {
    var s = steps[at], t = s.querySelector(".wl-opt.sel") || s.querySelector(".wl-opt, input");
    if (s.getAttribute("data-q") === "done") t = s;
    if (t && sheet.classList.contains("open")) t.focus({ preventScroll: true });
  }, delay);
}
steps.forEach(function (s, n) {
  s.querySelectorAll(".wl-opt").forEach(function (o) {
    o.addEventListener("click", function () {
      if (busy) return;
      s.querySelectorAll(".wl-opt").forEach(function (x) { x.classList.toggle("sel", x === o); x.setAttribute("aria-pressed", x === o ? "true" : "false"); });
      ans[s.getAttribute("data-q")] = o.getAttribute("data-v");
      busy = true;
      setTimeout(function () { busy = false; setStep(n + 1); focusStep(380); }, SK.reduced ? 60 : 300);
    });
  });
});
back.addEventListener("click", function () { if (at > 0) { setStep(at - 1); focusStep(380); } });

/* ---------- open / close ---------- */
function joined() { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; } }
function open(src) {
  from = src || from;
  if (sheet.classList.contains("open")) return;
  lastFocus = document.activeElement;
  if (!sky.getAttribute("src")) sky.src = matchMedia("(max-width: 700px) and (max-aspect-ratio: 3/4)").matches ? "assets/hero/sky-m.jpg" : "assets/hero/sky.jpg";
  var j = joined();
  if (j) { doneH.textContent = j.first ? "You're on the list, " + j.first + "." : "You're on the list."; setStep(steps.length - 1); }
  sheet.hidden = false;
  sheet.scrollTop = 0;
  html.classList.add("wl-open");
  if (SK.kayla && SK.kayla.pause) SK.kayla.pause();
  if (!DEEP.test(location.hash)) { try { history.pushState({ wl: 1 }, "", location.pathname + location.search + HASH); pushed = true; } catch (e) {} }
  requestAnimationFrame(function () { requestAnimationFrame(function () { sheet.classList.add("open"); }); });
  focusStep(SK.reduced ? 0 : 520);
}
function hide() {
  if (!sheet.classList.contains("open")) return;
  sheet.classList.remove("open");
  html.classList.remove("wl-open");
  setTimeout(function () { if (!sheet.classList.contains("open")) sheet.hidden = true; }, SK.reduced ? 0 : 460);
  if (lastFocus && lastFocus.focus) try { lastFocus.focus({ preventScroll: true }); } catch (e) {}
}
function close() {
  if (pushed) { pushed = false; history.back(); return; } /* popstate hides it */
  hide();
  if (DEEP.test(location.hash)) try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
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
  if (e.key !== "Tab") return;
  var f = [].slice.call(sheet.querySelectorAll("button, input, select, [tabindex='0']")).filter(function (x) { return !x.disabled && !x.closest("[hidden]") && x.offsetParent !== null && getComputedStyle(x).visibility !== "hidden"; });
  if (!f.length) return;
  var i = f.indexOf(document.activeElement);
  if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
  else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
});
if (DEEP.test(location.hash)) setTimeout(function () { open("link"); }, SK.reduced ? 0 : 250);

/* ---------- the details, checked and sent ---------- */
var inputs = [].slice.call(form.querySelectorAll(".wl-fields input"));
inputs.forEach(function (inp, k) {
  inp.addEventListener("input", function () { var f = inp.closest(".wl-f"); if (f.classList.contains("bad")) { f.classList.remove("bad"); if (!form.querySelector(".wl-f.bad")) err.textContent = ""; } });
  inp.addEventListener("keydown", function (e) { if (e.key === "Enter" && k < inputs.length - 1) { e.preventDefault(); inputs[k + 1].focus(); } });
});
function val(n) { return (form.elements[n].value || "").trim(); }
var SRC = (function () {
  var q = new URLSearchParams(location.search), h = new URLSearchParams(location.hash.replace(/^#[^&]*&?/, ""));
  var s = q.get("utm_source") || h.get("src") || h.get("ref") || q.get("ref") || "";
  if (!s && document.referrer) { try { var r = new URL(document.referrer).hostname.replace(/^www\.|^l\.|^m\./, ""); if (r !== location.hostname) s = r.split(".")[0]; } catch (e) {} }
  return [s || "direct", q.get("utm_medium"), q.get("utm_campaign")].filter(Boolean).join(" · ");
})(); /* read once, on arrival: closing the sheet takes the hash off */
function send(d, c) {
  var ctl = window.AbortController ? new AbortController() : null, t = ctl && setTimeout(function () { ctl.abort(); }, 15000);
  var opt = function (o) { if (ctl) o.signal = ctl.signal; return o; };
  var done = function (x) { clearTimeout(t); return x; };
  if (cfg.brevo_form) {
    var post = function (withSms) {
      var fd = new FormData();
      Object.keys(d).forEach(function (k) { if (withSms || k !== "SMS") fd.append(k, d[k]); });
      if (withSms && c) fd.append("SMS__COUNTRY_CODE", "+" + c);
      fd.append("email_address_check", ""); fd.append("locale", "en");
      var url = cfg.brevo_form + (cfg.brevo_form.indexOf("?") < 0 ? "?" : "&") + "isAjax=1";
      return fetch(url, opt({ method: "POST", body: fd })).then(function (r) { return r.json().catch(function () { return {}; }); }, function () {
        return fetch(url, opt({ method: "POST", body: fd, mode: "no-cors" })).then(function () { return { success: true }; }); /* no CORS: it still lands */
      });
    };
    /* Brevo refuses the whole sign-up when it doesn't like a phone number: then the name and email still go in, without the phone */
    return post(true).then(function (j) { return j && j.success === false ? post(false) : j; }).then(function (j) { if (j && j.success === false) throw new Error("brevo"); return done(j); });
  }
  if (cfg.webhook) {
    return fetch(cfg.webhook, opt({ method: "POST", headers: { "Content-Type": "text/plain;charset=UTF-8" }, body: JSON.stringify(d) })).then(function (r) { if (!r.ok && r.type !== "opaque") throw new Error("hook " + r.status); return done(r); }, function () {
      return fetch(cfg.webhook, opt({ method: "POST", mode: "no-cors", body: JSON.stringify(d) })).then(done);
    });
  }
  if (local) { console.info("[early access] not connected yet (src/waitlist.json). Would send:", d); return SK.sleep(900); }
  return Promise.reject(new Error("not connected"));
}
form.addEventListener("submit", function (e) {
  e.preventDefault();
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
  var intl = /^\s*\+/.test(phone), sms = intl ? "+" + digits : digits.replace(/^0+/, "");
  var d = { FIRSTNAME: first, LASTNAME: last, EMAIL: email, SMS: sms, ROLE: ans.role || "", BRANDS: ans.brands || "", CLAUDE: ans.claude || "", SOURCE: SRC + " · " + from };
  go.classList.add("busy");
  send(d, intl ? "" : c[1]).then(function () {
    try { localStorage.setItem(KEY, JSON.stringify({ first: first, at: Date.now() })); } catch (x) {}
    doneH.textContent = "You're on the list, " + first + ".";
    setStep(steps.length - 1);
    focusStep(400);
  }, function () {
    err.textContent = "That didn't go through. Check your connection and try again.";
  }).then(function () { go.classList.remove("busy"); });
});

/* ---------- share, from the done screen ---------- */
var share = sheet.querySelector("[data-wl-share]");
share.addEventListener("click", function () {
  var url = location.origin + location.pathname + HASH, sp = share.querySelector("span");
  var copied = function () { sp.textContent = "Link copied"; setTimeout(function () { sp.textContent = "Share Studio"; }, 2200); };
  if (navigator.share) { navigator.share({ title: "Studio", text: "Studio: if you can dream it, you can post it. Get early access:", url: url }).catch(function () {}); return; }
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(copied, function () {}); else copied();
});
