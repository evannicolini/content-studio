// The waitlist's "Where can we see your work?" (the brands step): Instagram and website, both optional. A pasted instagram.com link
// becomes the handle; brand.com is sent as https://brand.com; nonsense is stopped with a word on why; blank never blocks Continue.
// The brands pick waits for Continue (its fields are under it). On a phone the two stack, nothing is cut off, nothing scrolls sideways.
// With a local Worker (?api=), the sign-up reaches it and the row keeps both.
//   python3 build.py --serve   (PORT=8770)   and, for the last part,   cd worker && npx wrangler@4 dev --port 8819 --var DEV_ECHO:1
//   node tools/test_worklinks.js [http://127.0.0.1:8760] [http://127.0.0.1:8819]
// Exit code 1 if anything fails. Writes shots to tools/_shots/ (not in git).
const { launch } = require("./browser");   // Playwright's own headless Chromium with audio muted, never the owner's Google Chrome
const fs = require("fs"), path = require("path");
const BASE = (process.argv[2] || "http://127.0.0.1:8760").replace(/\/+$/, ""), API = (process.argv[3] || "").replace(/\/+$/, "");
const SHOTS = path.join(__dirname, "_shots"); fs.mkdirSync(SHOTS, { recursive: true });
let failed = 0;
const check = (name, ok, got) => { if (!ok) failed++; console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : "  (got " + JSON.stringify(got) + ")")); };
const SIZES = [["desktop 1440", { width: 1440, height: 900 }, false], ["desktop 1280", { width: 1280, height: 800 }, false], ["phone 375", { width: 375, height: 667 }, true], ["phone 393", { width: 393, height: 852 }, true], ["phone 440", { width: 440, height: 956 }, true]];

(async () => {
  const b = await launch({ args: [] });
  for (const [name, vp, mob] of SIZES) {
    const ctx = await b.newContext({ viewport: vp, isMobile: mob, hasTouch: mob, deviceScaleFactor: mob ? 3 : 1, permissions: ["clipboard-read", "clipboard-write"] });
    const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message));
    await p.goto(BASE + "/early-access/?ch=brands" + (API ? "&api=" + encodeURIComponent(API) : "")); await p.waitForTimeout(3500);
    const on = () => p.evaluate(() => document.querySelector(".wl-q.on").getAttribute("data-q"));
    check(name + ": on the brands step", (await on()) === "brands", await on());
    await p.click('.wl-q.on .wl-opt[data-v="2-3"]'); await p.waitForTimeout(1100);
    check(name + ": a brands pick waits for Continue", (await on()) === "brands", await on());
    // the fields: on screen, inside the page, stacked on a phone, side by side on a desktop
    const geo = await p.evaluate(() => { const ig = document.querySelector('[name="instagram"]').getBoundingClientRect(), ws = document.querySelector('[name="website"]').getBoundingClientRect(); return { ig: [Math.round(ig.left), Math.round(ig.right), Math.round(ig.top)], ws: [Math.round(ws.left), Math.round(ws.right), Math.round(ws.top)], iw: document.documentElement.clientWidth, wide: [...document.querySelectorAll("*")].filter((e) => (e === document.scrollingElement || /auto|scroll/.test(getComputedStyle(e).overflowX)) && e.scrollWidth > e.clientWidth + 1).map((e) => e.className || e.tagName) }; });
    check(name + ": both fields inside the screen", geo.ig[0] >= 0 && geo.ws[1] <= geo.iw && geo.ig[1] <= geo.iw, geo);
    check(name + ": " + (mob ? "stacked" : "side by side"), mob ? geo.ws[2] > geo.ig[2] + 40 : Math.abs(geo.ws[2] - geo.ig[2]) < 2, geo);
    check(name + ": nothing scrolls sideways", !geo.wide.length, geo.wide);
    // Instagram: a pasted link becomes the handle
    await p.evaluate((t) => navigator.clipboard.writeText(t), "https://www.instagram.com/Studio.Films/?igsh=x1"); await p.focus('[name="instagram"]'); await p.keyboard.press(process.platform === "darwin" ? "Meta+V" : "Control+V"); await p.waitForTimeout(150);
    check(name + ": a pasted Instagram link becomes the handle", (await p.inputValue('[name="instagram"]')) === "studio.films", await p.inputValue('[name="instagram"]'));
    await p.fill('[name="instagram"]', ""); await p.focus('[name="instagram"]'); await p.keyboard.type("instagram.com/Studio.Films/", { delay: 15 }); await p.waitForTimeout(100);
    check(name + ": a link typed letter by letter keeps every letter while typing", (await p.inputValue('[name="instagram"]')) === "instagram.com/Studio.Films/", await p.inputValue('[name="instagram"]'));
    await p.focus('[name="website"]'); await p.waitForTimeout(100);
    check(name + ": and is the handle once you leave the field", (await p.inputValue('[name="instagram"]')) === "studio.films", await p.inputValue('[name="instagram"]'));
    await p.fill('[name="instagram"]', ""); await p.focus('[name="instagram"]'); await p.keyboard.type("@wren", { delay: 15 });
    check(name + ": a typed @ comes off (it's drawn in front)", (await p.inputValue('[name="instagram"]')) === "wren", await p.inputValue('[name="instagram"]'));
    await p.fill('[name="instagram"]', ""); await p.evaluate((t) => navigator.clipboard.writeText(t), "https://www.instagram.com/Studio.Films/?igsh=x1"); await p.focus('[name="instagram"]'); await p.keyboard.press(process.platform === "darwin" ? "Meta+V" : "Control+V"); await p.waitForTimeout(150);
    check(name + ": the focused field has the beam", await p.evaluate(() => document.querySelector('[name="instagram"]').closest(".wl-box").querySelector(".wl-fb").hasAttribute("data-active")), "");
    // nonsense is stopped with a reason; blank is fine
    await p.fill('[name="website"]', "not a site"); await p.click("[data-wl-next], .wl-next").catch(() => {}); await p.waitForTimeout(500);
    const errW = await p.evaluate(() => (document.querySelector(".wl-q.on .wl-err") || {}).textContent || "");
    check(name + ": a website that can't be one is stopped, with why", (await on()) === "brands" && /website/i.test(errW), { step: await on(), errW });
    await p.fill('[name="website"]', "studio.film"); await p.fill('[name="instagram"]', "studio.films");
    if (name === "desktop 1440" || name === "phone 393") await p.screenshot({ path: path.join(SHOTS, "worklinks-" + name.replace(" ", "-") + ".png") });
    await p.fill('[name="instagram"]', ""); await p.fill('[name="website"]', "");
    await p.keyboard.press("Enter").catch(() => {}); await p.click(".wl-next, [data-wl-next]").catch(() => {}); await p.waitForTimeout(900);
    check(name + ": blank fields never block Continue", (await on()) === "claude", await on());
    check(name + ": the step count still reads 4 of 5 next", /4 of 5/.test(await p.evaluate(() => document.querySelector(".wl-q.on .wl-k").textContent)), "");
    check(name + ": no page errors", !errs.length, errs);
    await ctx.close();
  }
  if (API) {   // the whole sign-up against a local Worker: the row keeps both
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
    const email = "worklinks" + Date.now() + "@example.com";
    await p.goto(BASE + "/early-access/?api=" + encodeURIComponent(API)); await p.waitForTimeout(3000);
    await p.fill('[name="first"]', "Wren"); await p.fill('[name="last"]', "Test"); await p.keyboard.press("Enter"); await p.waitForTimeout(900);
    await p.click('.wl-q.on .wl-opt[data-v="Creator"]'); await p.click(".wl-next, [data-wl-next]").catch(() => {}); await p.waitForTimeout(900);
    await p.click('.wl-q.on .wl-opt[data-v="1"]'); await p.waitForTimeout(600);
    await p.focus('[name="instagram"]'); await p.keyboard.insertText("@Wren.Makes"); await p.fill('[name="website"]', "wren.studio/work/");
    await p.click(".wl-next, [data-wl-next]").catch(() => {}); await p.waitForTimeout(900);
    await p.click('.wl-q.on .wl-opt[data-v="Not yet"]'); await p.waitForTimeout(1300);
    await p.fill('[name="email"]', email); await p.click(".wl-go"); await p.waitForTimeout(3000);
    const row = await (await fetch(API + "/admin/export.csv", { headers: { Authorization: "Bearer dev" } })).text();
    const head = row.split("\r\n")[0].split(","), line = row.split("\r\n").find((l) => l.includes(email));
    const cells = line ? line.split(",") : [];
    check("local Worker: the sign-up keeps the handle and the website", cells[head.indexOf("instagram")] === "wren.makes" && cells[head.indexOf("website")] === "https://wren.studio/work", { instagram: cells[head.indexOf("instagram")], website: cells[head.indexOf("website")] });
    await ctx.close();
  }
  await b.close(); process.exit(failed ? 1 : 0);
})();
