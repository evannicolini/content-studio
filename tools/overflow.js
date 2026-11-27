// Lists the elements that stick out past the right edge on a phone-width page: node tools/overflow.js [width]
const { launch } = require("./browser");   // Playwright's own headless Chromium with audio muted, never the owner's Google Chrome
(async () => {
  const w = +(process.argv[2] || 390);
  const b = await launch({ args: ["--use-mock-keychain", "--password-store=basic"] });
  const p = await (await b.newContext({ viewport: { width: w, height: 844 }, deviceScaleFactor: 2, isMobile: w < 800, hasTouch: w < 800 })).newPage();
  await p.goto("http://127.0.0.1:8760/?s=" + Date.now()); await p.waitForTimeout(2500);
  const r = await p.evaluate(() => {
    const vw = document.documentElement.clientWidth, out = [];
    document.querySelectorAll("body *").forEach((e) => {
      const b = e.getBoundingClientRect();
      if (b.width && (b.right > vw + 1 || b.left < -1)) {
        let clipped = false, a = e.parentElement;
        while (a && a !== document.body) { const o = getComputedStyle(a); if (/(hidden|clip|auto|scroll)/.test(o.overflowX)) { clipped = true; break; } a = a.parentElement; }
        if (!clipped) out.push((e.closest("section") || {}).id + " | " + e.tagName.toLowerCase() + "." + String(e.className).slice(0, 40) + " | " + Math.round(b.left) + ".." + Math.round(b.right));
      }
    });
    return { vw, sw: document.documentElement.scrollWidth, out: out.slice(0, 25) };
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
