// Public previews use made-up demo data only: no real brand, person or count from a real Studio in the app previews the site
// draws (the sign-up's and the paywall's app on the right, the early-access sheet's, SK.appHome / SK.BRANDS in kit.js), and the
// day-14 paywall (#paywall&action=trial) says "Your trial ended. Keep your Studio." with the plans: no $1, no "14 days for",
// no "Look around first", on its plan step or its pay step. No comment in the sources names a private person or brand, and the
// built output (what askstudio.ai serves) carries no comments at all (strip.py).
//   node tools/test_demo.js                         the sources and the built preview pages (no browser)
//   python3 build.py --serve  (PORT=8770 for another port)   then   node tools/test_demo.js http://127.0.0.1:8760
//                                                   also the pages themselves, in headless Chrome (playwright-core: npm i
//                                                   playwright-core, or NODE_PATH to a folder that has it)
// Exit code 1 if anything fails. Runs on this Mac's stand-in (no account, no charge).
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const BASE = (process.argv[2] || "").replace(/\/+$/, "");
let failed = 0;
const check = (name, ok, got) => { if (!ok) failed++; console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : "  (got " + JSON.stringify(got).slice(0, 400) + ")")); };

// The private names: the same list as the app's pre-commit audit (Studio_App tools/audit.sh, "private names" and "words that must
// not appear"). Keep the two in step.
const PRIVATE = [/mirra/i, /esignature/i, /custom e-signature/i, /nicolini/i, /(^|[^a-z])evan([^a-z]|$)/i, /evan_/i, /10\.1_claude/i, /04_mirra/i, /e-lnk/i,
                 /(^|[^a-z0-9_])(ces|signature|signatures|lobby)([^a-z0-9_]|$)/i];
const hits = (s) => PRIVATE.filter((rx) => rx.test(s)).map(String);

// ---------------------------------------------------------------- the sources and the built pages
// Comments are notes for the people who build the site, not what a preview shows: they are taken out first. So is the media
// catalogue (window.SK_MEDIA: the main site's own films, which no preview here draws) and the border beam's colour variant
// (a style id handed to the beam library, never drawn).
const FILES = ["src/kit.js", "src/sections/900-early/section.js", "src/sections/900-early/section.html", "src/sections/910-start/section.js",
               "src/sections/910-start/section.html", "start/page.js", "start/index.html", "early-access/page.js", "early-access/index.html"];
const strip = (s) => s.replace(/<!--[\s\S]*?-->/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[\s;{}(),])\/\/[^\n]*/g, "$1")
  .replace(/^window\.SK_MEDIA = .*$/m, "").replace(/variant:\s*"mirra"/g, "").replace(/\/\^mirra\/\.test\(o\.variant\)/g, "");
for (const f of FILES) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) { check(f + " is there", false, "missing"); continue; }
  const lines = strip(fs.readFileSync(p, "utf8")).split("\n").filter((l) => hits(l).length);
  check(f + ": no private name in what it draws", !lines.length, lines.map((l) => l.trim().slice(0, 160)));
}
// the demo brands are what SK.BRANDS and the stages list
const kit = fs.readFileSync(path.join(ROOT, "src/kit.js"), "utf8");
check("SK.BRANDS holds the demo brands", /SK\.BRANDS = \[\{ n: "Northwind"/.test(kit) && /Lowtide Coffee/.test(kit), (kit.match(/SK\.BRANDS = .{0,120}/) || [""])[0]);
// the day-14 words come from pricing.json (window.SK_PRICES.copy, written by pricing.py), never typed into the page
const start = fs.readFileSync(path.join(ROOT, "start/page.js"), "utf8"), sec = fs.readFileSync(path.join(ROOT, "src/sections/910-start/section.js"), "utf8");
const prices = (start.match(/^window\.SK_PRICES = (.*);$/m) || [])[1];
let copy = null; try { copy = JSON.parse(prices).copy.trial; } catch (e) {}
check("the built page carries pricing.json's day-14 words (SK_PRICES.copy.trial)", !!copy && copy.title === "Your trial ended." && copy.line === "Keep your Studio.", copy);
check("910-start does not type the day-14 words itself", !/Your trial ended/.test(sec.replace(/\/\*[\s\S]*?\*\//g, "")), "typed in section.js");

// ---------------------------------------------------------------- comments
// The sources' comments (src/, the Worker, tools/) never carry a private name either: they are public in the repo. And what the
// build emits (strip.py, run by build.py) carries no comment at all: the main page, every page of its own, the legal pages. Licence
// comments (/*! ... */, @license, @preserve) are the one kind kept. Comments are found by strip.py's own reader of JS, CSS and HTML
// (strings, template literals and regex literals are never taken for comments).
const { execFileSync } = require("child_process");
const PY = process.env.PYTHON || "python3", STRIP = path.join(ROOT, "strip.py");
const walk = (d) => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? (e.name === "node_modules" ? [] : walk(path.join(d, e.name))) : [path.join(d, e.name)]) : [];
const SOURCES = ["src", "worker/src", "worker/tests", "tools"].flatMap((d) => walk(path.join(ROOT, d))).filter((f) => /\.(m?js|css|html)$/.test(f));
const notes = execFileSync(PY, [STRIP, "--comments", ...SOURCES], { encoding: "utf8", maxBuffer: 64 << 20 }).split("\n").filter(Boolean).map((l) => JSON.parse(l));
const privNotes = notes.filter((c) => c.text.split("\n").some((l) => hits(l).length));
check("the sources' comments (" + notes.length + " in " + SOURCES.length + " files): no private name", !privNotes.length,
      privNotes.slice(0, 5).map((c) => path.relative(ROOT, c.file) + ": " + c.text.slice(0, 100)));
const BUILT = ["index.html", "site.js", "site.css", "terms/index.html", "privacy/index.html"].concat(...["start", "early-access"].map((s) => ["index.html", "page.js", "page.css"].map((n) => s + "/" + n)));
const LICENCE = /^\/\*!|@license|@preserve/;
for (const f of BUILT) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) { check(f + " is built", false, "missing"); continue; }
  const left = execFileSync(PY, [STRIP, "--comments", p], { encoding: "utf8", maxBuffer: 64 << 20 }).split("\n").filter(Boolean).map((l) => JSON.parse(l).text).filter((t) => !LICENCE.test(t));
  check(f + ": no comment in what the build emits", !left.length, left.slice(0, 3).map((t) => t.slice(0, 100)));
}
const kept = fs.readFileSync(path.join(ROOT, "site.js"), "utf8").match(/\/\*![^\n]*/g) || [];
check("the licence comment is kept (thinking-orbs, MIT)", kept.some((l) => /MIT License/.test(l)), kept);

if (!BASE) { console.log(failed ? "\n" + failed + " failed" : "\nall passed (sources; pass a site address to check the pages in Chrome too)"); process.exit(failed ? 1 : 0); }

// ---------------------------------------------------------------- the pages, as a person sees them
const { launch } = require("./browser");   // Playwright's own headless Chromium with audio muted, never the owner's Google Chrome
const DOLLAR1 = /\$1(?![\d.,])/;          // the trial fee: "$1", never "$199" or "$1,908"
(async () => {
  const b = await launch({ args: ["--use-mock-keychain", "--password-store=basic"] });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  // what a page shows: its text, every image's address and words, every label a screen reader reads
  const seen = () => p.evaluate(() => {
    const out = [document.body.innerText];
    document.querySelectorAll("img").forEach((i) => out.push(i.getAttribute("src") || "", i.getAttribute("alt") || ""));
    document.querySelectorAll("[aria-label],[title]").forEach((e) => out.push(e.getAttribute("aria-label") || "", e.getAttribute("title") || ""));
    return out.join("\n");
  });
  const visible = () => p.evaluate(() => document.body.innerText);
  for (const [name, url, wait] of [["the paywall (onboarding)", "/start/#paywall", 4500], ["the day-14 paywall", "/start/#paywall&action=trial", 4500],
                                    ["the sign-up", "/start/", 4500], ["early access", "/early-access/", 4500]]) {
    await p.goto(BASE + url + (url.includes("?") ? "&" : "?") + "s=" + Date.now(), { waitUntil: "load" });
    await p.waitForTimeout(wait);
    const t = await seen(), bad = t.split("\n").filter((l) => hits(l).length);
    check(name + ": no private name on the page or in its preview", !bad.length, bad.map((l) => l.trim().slice(0, 120)));
  }
  // the main page's Social preview (110-social): the calendar's brand chips, the ad's brand, the ad and day titles. (Its films
  // are the site's own showcase; their file names are not checked, only what the preview says.)
  await p.goto(BASE + "/?s=" + Date.now(), { waitUntil: "load" });
  await p.waitForTimeout(1500);
  await p.evaluate(() => { const s = document.getElementById("social"); if (s) s.scrollIntoView(); });
  await p.waitForTimeout(3000);
  const soc = await p.evaluate(() => { const s = document.getElementById("social"); if (!s) return null; const out = [s.innerText];
    s.querySelectorAll("img").forEach((i) => out.push(i.getAttribute("alt") || "", /brand-/.test(i.getAttribute("src") || "") ? i.getAttribute("src") : ""));
    s.querySelectorAll("[aria-label]").forEach((e) => out.push(e.getAttribute("aria-label"))); return out.join("\n"); });
  const sbad = (soc || "").split("\n").filter((l) => hits(l).length);
  check("the Social preview: demo brands only (chips, badges, the ad, the titles)", soc !== null && !sbad.length && /Northwind/.test(soc), soc === null ? "no #social" : sbad.map((l) => l.trim().slice(0, 120)));
  // the day-14 paywall: its words, the plans, and none of the trial's offer
  await p.goto(BASE + "/start/?s=" + Date.now() + "#paywall&action=trial", { waitUntil: "load" });
  await p.waitForTimeout(4000);
  let t = await visible();
  check("day 14: \"Your trial ended. Keep your Studio.\"", /Your trial ended\.\s*Keep your Studio\./.test(t), t.slice(0, 200));
  check("day 14: the plans are there", /Creator/.test(t) && /Pro/.test(t) && /Unlimited/.test(t), t.slice(0, 200));
  check("day 14: no $1, no \"14 days for\", no \"Look around first\"", !DOLLAR1.test(t) && !/14 days for/i.test(t) && !/Look around first/i.test(t), (t.match(/.{0,40}(\$1(?![\d.,])|14 days for|Look around first).{0,40}/i) || [""])[0]);
  await p.click("[data-st-next]").catch(() => {});
  await p.waitForTimeout(2500);
  t = await visible();
  check("day 14, the pay step: the plan at its own price, today", /today/i.test(t) && /\$199/.test(t), t.slice(0, 300));
  check("day 14, the pay step: no $1, no \"14 days for\"", !DOLLAR1.test(t) && !/14 days for/i.test(t), (t.match(/.{0,40}(\$1(?![\d.,])|14 days for).{0,40}/i) || [""])[0]);
  // the onboarding paywall still offers the trial (nothing else moved)
  await p.goto(BASE + "/start/?s=" + Date.now() + "#paywall", { waitUntil: "load" });
  await p.waitForTimeout(4000);
  t = await visible();
  // pricing.json "trial_fee": 0 (window.SK_PRICES.trial_fee): the trial is at sign-in, no card, so this paywall sells the plan itself
  check("the onboarding paywall: Keep your Studio, the plan at its own price, no $1, no \"14 days for\"", /Keep your Studio\./.test(t) && /Studio Pro is \$199\/mo/.test(t)
        && !DOLLAR1.test(t) && !/14 days for/i.test(t) && /Look around first/.test(t), t.slice(0, 200));
  await p.click("[data-st-next]").catch(() => {});
  await p.waitForTimeout(2500);
  t = await visible();
  check("the onboarding paywall's pay step: the plan's price today, no $1, no trial", /\$199 today/.test(t) && !DOLLAR1.test(t) && !/14 days for/i.test(t) && !/day trial/i.test(t),
        (t.match(/.{0,50}(\$1(?![\d.,])|14 days for|day trial|today).{0,50}/i) || [""])[0]);
  check("no page errors", !errs.length, errs.slice(0, 3));
  await b.close();
  console.log(failed ? "\n" + failed + " failed" : "\nall passed");
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
