// Codes are never dropped, typed fast or pasted: the paywall's "Have a code?" field, the sign-up's 6-digit code, and every text
// field opting out of macOS inline predictions (writingsuggestions="false": in Studio's own window they ate fast keys, so
// STUDIOK7 typed at 60 ms a key came out as "S"). Also: "Look around first" stays on one line beside the bar.
//   python3 build.py --serve   (PORT=8770 for another port)   then   node tools/test_codes.js [http://127.0.0.1:8760]
// Runs on this Mac's stand-in (no account, no charge). Exit code 1 if anything fails.
const pw = require("playwright-core"); // npm i playwright-core, or set NODE_PATH to a folder that has it
const BASE = (process.argv[2] || "http://127.0.0.1:8760").replace(/\/+$/, "");
let failed = 0;
const check = (name, ok, got) => { if (!ok) failed++; console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : "  (got " + JSON.stringify(got) + ")")); };
(async () => {
  const b = await pw.chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, permissions: ["clipboard-read", "clipboard-write"] });
  const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  const paste = async (sel, text) => { await p.evaluate((t) => navigator.clipboard.writeText(t), text); await p.click(sel); await p.keyboard.press(process.platform === "darwin" ? "Meta+V" : "Control+V"); };

  /* the paywall's code field */
  await p.goto(BASE + "/start/?ch=pay#paywall"); await p.waitForTimeout(3500);
  await p.click("[data-st-havecode]"); await p.waitForTimeout(200);
  await p.click('[name="promo"]'); await p.keyboard.type("STUDIOK7", { delay: 30 }); await p.waitForTimeout(300);
  check("paywall code typed at 30 ms a key", (await p.inputValue('[name="promo"]')) === "STUDIOK7", await p.inputValue('[name="promo"]'));
  await p.fill('[name="promo"]', ""); await paste('[name="promo"]', "STUDIOK7"); await p.waitForTimeout(200);
  check("paywall code pasted", (await p.inputValue('[name="promo"]')) === "STUDIOK7", await p.inputValue('[name="promo"]'));
  await p.click("[data-st-apply]"); await p.waitForTimeout(1500);
  const today = await p.textContent("[data-st-today]");
  check("STUDIOK7 applied: $0 today", /\$0 today/.test(today), today);

  /* the sign-up's 6-digit code */
  for (const [how, fill] of [["typed at 30 ms a key", async () => { await p.click("[data-st-otp] input"); await p.keyboard.type("123456", { delay: 30 }); }], ["pasted", async () => { await paste("[data-st-otp] input", "123456"); }]]) {
    await p.goto(BASE + "/start/?ch=code"); await p.waitForTimeout(3000);
    await p.evaluate(() => { window.__codeSeen = ""; const b = document.querySelector("[data-st-otp]"); const t = setInterval(() => { const v = [...b.querySelectorAll("input")].map((i) => i.value).join(""); if (v.length > window.__codeSeen.length) window.__codeSeen = v; }, 5); setTimeout(() => clearInterval(t), 4000); });
    await fill(); await p.waitForTimeout(600);
    const seen = await p.evaluate(() => window.__codeSeen), step = await p.evaluate(() => document.querySelector(".wl.open").getAttribute("data-step"));
    check("sign-up code " + how, seen === "123456" || step !== "code", { seen, step });
  }

  /* every text field opts out of inline predictions, on both pages */
  for (const page of ["/start/", "/early-access/"]) {
    await p.goto(BASE + page); await p.waitForTimeout(1500);
    const missing = await p.evaluate(() => [...document.querySelectorAll("input:not([type=checkbox]):not([type=hidden]):not(.wl-hp), textarea")].filter((i) => i.getAttribute("writingsuggestions") !== "false" && !i.closest("[data-st-pe]")).map((i) => i.name || i.className || i.tagName));
    check("no inline predictions on " + page, !missing.length, missing);
  }

  /* "Look around first": one line beside the bar, at Studio's window sizes */
  for (const [w, h] of [[1440, 900], [1180, 760], [1024, 700]]) {
    await p.setViewportSize({ width: w, height: h });
    await p.goto(BASE + "/start/#paywall"); await p.waitForTimeout(2500);
    const r = await p.evaluate(() => { const l = document.querySelector("[data-st-look]"); if (!l || l.hidden || !l.offsetParent) return null; const b = l.getBoundingClientRect(); return { h: Math.round(b.height), lines: Math.round(b.height / parseFloat(getComputedStyle(l).lineHeight || 16)) }; });
    check("Look around first on one line at " + w + "x" + h, !!r && r.h <= 50, r);
  }
  check("no page errors", !errs.length, errs);
  await b.close(); process.exit(failed ? 1 : 0);
})();
