// One pass over every section, desktop or phone: node tools/tour.js [--mobile] [--wait 3500] [--only id,id]
// Writes _shots/tour/<nn>-<id>-<d|m>.jpg and prints overflow, errors and 404s once.
const pw = require("playwright-core"); const { launch } = require("./browser");   // Playwright's own headless Chromium, never the owner's Chrome // npm i playwright-core, or set NODE_PATH to a folder that has it
const fs = require("fs"), a = process.argv.slice(2);
const opt = (k, d) => { const i = a.indexOf("--" + k); return i < 0 ? d : (a[i + 1] && !a[i + 1].startsWith("--") ? a[i + 1] : true); };
(async () => {
  const mobile = !!opt("mobile", false), tag = mobile ? "m" : "d", out = __dirname + "/../_shots/tour";
  fs.mkdirSync(out, { recursive: true });
  const b = await launch({ args: ["--use-mock-keychain", "--password-store=basic", "--autoplay-policy=no-user-gesture-required"] });
  const ctx = await b.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
  const p = await ctx.newPage(), errs = new Set();
  p.on("pageerror", (e) => errs.add("PAGEERROR " + String(e.message).slice(0, 200)));
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errs.add("console " + m.text().slice(0, 200)); });
  p.on("response", (r) => { if (r.status() >= 400) errs.add(r.status() + " " + r.url().replace(/^https?:\/\/[^/]+/, "").slice(0, 120)); });
  await p.goto("http://127.0.0.1:" + opt("port", "8760") + "/?s=" + Date.now(), { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(1500);
  let ids = await p.evaluate(() => [...document.querySelectorAll("main > section, main > div > section")].map((s) => s.id).filter(Boolean));
  const only = opt("only", null); if (only) ids = ids.filter((i) => only.split(",").includes(i));
  let n = 0;
  for (const id of ids) {
    n++;
    await p.evaluate((i) => { const e = document.getElementById(i); window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - (i === "hero" ? 0 : 70)); }, id);
    await p.waitForTimeout(+opt("wait", 3500));
    const f = out + "/" + String(n).padStart(2, "0") + "-" + id + "-" + tag + ".jpg";
    await p.screenshot({ path: f, type: "jpeg", quality: 78 });
    const h = await p.evaluate((i) => Math.round(document.getElementById(i).getBoundingClientRect().height), id);
    console.log(String(n).padStart(2, "0"), id.padEnd(12), "height", h);
  }
  const ov = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, h: document.documentElement.scrollHeight }));
  console.log(JSON.stringify(ov), ov.sw > ov.cw ? "HORIZONTAL OVERFLOW" : "no overflow");
  if (errs.size) console.log([...errs].slice(0, 20).join("\n"));
  await b.close();
})();
