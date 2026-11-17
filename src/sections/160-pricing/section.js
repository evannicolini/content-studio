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
  sub.textContent = SK.mobile() ? "You're in. Studio is a Mac app: open this page on your Mac to download it." : "You're in. Your download is ready.";
  fine.textContent = "Apple Silicon · macOS 13 or later" + (info.size ? " · " + info.size + " MB" : "");
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
if (saved) tryCode(saved).then(function (info) { unlocked(info, false); }).catch(function () {});
