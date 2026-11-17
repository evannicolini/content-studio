// Screenshots of the local site in headless Chrome.
//   node tools/shot.js <out.png> [--sel "#work"] [--wait 2500] [--mobile] [--w 1440] [--h 900] [--full] [--y 1200] [--port 8760] [--click "sel"]
// --sel scrolls that element to the top of the viewport first (offset -80). Prints page errors and failed requests.
const pw = require("playwright-core"); // npm i playwright-core, or set NODE_PATH to a folder that has it
const a = process.argv.slice(2), out = a[0];
const opt = (k, d) => { const i = a.indexOf("--" + k); return i < 0 ? d : (a[i + 1] && !a[i + 1].startsWith("--") ? a[i + 1] : true); };
(async () => {
  const mobile = !!opt("mobile", false);
  const w = +opt("w", mobile ? 390 : 1440), h = +opt("h", mobile ? 844 : 900);
  const b = await pw.chromium.launch({ channel: "chrome", headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push("PAGEERROR " + String(e.message).slice(0, 240)));
  p.on("console", (m) => { if (m.type() === "error") errs.push("console " + m.text().slice(0, 240)); });
  p.on("requestfailed", (r) => errs.push("FAILED " + r.url().slice(0, 160)));
  p.on("response", (r) => { if (r.status() >= 400) errs.push(r.status() + " " + r.url().slice(0, 160)); });
  await p.goto("http://127.0.0.1:" + opt("port", "8760") + "/?s=" + Date.now(), { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(1200);
  const sel = opt("sel", null), y = opt("y", null), click = opt("click", null);
  if (sel) await p.evaluate((s) => { const e = document.querySelector(s); if (e) window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - 80); }, sel);
  if (y) await p.evaluate((v) => window.scrollTo(0, +v), y);
  if (click) { const c = await p.$(click); if (c) await c.click(); }
  await p.waitForTimeout(+opt("wait", 2500));
  await p.screenshot({ path: out, fullPage: !!opt("full", false), type: out.endsWith(".jpg") ? "jpeg" : "png", quality: out.endsWith(".jpg") ? 82 : undefined });
  const ov = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, h: document.documentElement.scrollHeight }));
  console.log(out, JSON.stringify(ov), ov.sw > ov.cw ? "HORIZONTAL OVERFLOW" : "");
  if (errs.length) console.log([...new Set(errs)].slice(0, 12).join("\n"));
  await b.close();
})();
