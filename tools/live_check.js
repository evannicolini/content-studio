// Checks the published site: node tools/live_check.js <url>   (with STUDIO_GATE_CODE='<code>' set, it also tries the founders gate)
// The code comes from the environment, never argv, and is never printed. Runs in Playwright's own headless Chromium with audio
// muted (tools/browser.js), never the owner's Google Chrome.
const { launch } = require("./browser");
(async () => {
  const url = process.argv[2], code = process.env.STUDIO_GATE_CODE || "";
  const b = await launch({ args: ["--use-mock-keychain", "--password-store=basic", "--autoplay-policy=no-user-gesture-required"] });
  for (const mobile of [false, true]) {
    const ctx = await b.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
    const p = await ctx.newPage(), bad = new Set();
    p.on("pageerror", (e) => bad.add("PAGEERROR " + String(e.message).slice(0, 160)));
    p.on("response", (r) => { if (r.status() >= 400) bad.add(r.status() + " " + r.url().slice(0, 120)); });
    let dl = null;
    await p.route("**/studio-licence*/get*", (r) => { dl = r.request().url(); r.fulfill({ status: 204 }); });   // the download link is answered with a stub, never fetched
    await p.goto(url + "?c=" + Date.now(), { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(6000);
    await p.screenshot({ path: "_shots/live-" + (mobile ? "m" : "d") + ".jpg", type: "jpeg", quality: 80 });
    const h = await p.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 250)); } return { h: document.documentElement.scrollHeight, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, sections: document.querySelectorAll("main > section").length }; });
    await p.waitForTimeout(1500);
    let gate = "";
    if (code && !mobile) {
      await p.evaluate(() => document.getElementById("pricing").scrollIntoView());
      await p.fill("#pr-code", code); await p.click(".pr-form button"); await p.waitForTimeout(3000);
      gate = " | gate open: " + !(await p.$eval(".pr-open", (e) => e.hidden)) + " | download: " + (dl ? "started" : "no");
    }
    console.log((mobile ? "phone  " : "desktop"), JSON.stringify(h), h.sw > h.cw ? "OVERFLOW" : "no overflow", gate, bad.size ? "\n  " + [...bad].slice(0, 8).join("\n  ") : "| no errors");
    await ctx.close();
  }
  await b.close();
})();
