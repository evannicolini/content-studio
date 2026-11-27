// The first load of the home page on a phone, A/B: each URL is loaded N times, interleaved (A B C A B C ...), on an iPhone-size page
// with the CPU slowed. For the first 3 s and the 3 s after, separately: frames over 33 ms (dropped at 60 Hz), long tasks (count, total,
// longest, total blocking time), and the main thread's style / layout / paint time. Then the compositor layers, at the top and after a
// scroll to the middle (Instagram's in-app browser ran out of memory on too many). Medians over the runs, and every run.
//   node tools/perf_load.js URL_A URL_B ... [--runs 6] [--rate 4] [--ua safari|instagram] [--json out.json]
const pw = require("playwright-core"); const { launch } = require("./browser");   // Playwright's own headless Chromium, never the owner's Chrome
const fs = require("fs");
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const URLS = argv.filter((a) => /^https?:/.test(a));
const RUNS = +opt("--runs", 6), RATE = +opt("--rate", 4), OUT = opt("--json", "");
const UAS = {
  instagram: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22B83 Instagram 357.0.0.25.101 (iPhone15,2; iOS 18_1; en_US; en; scale=3.00; 1179x2556; 659187005)",
  safari: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
};
const UA = UAS[opt("--ua", "safari")];
const REC = () => {
  window.__fr = []; window.__lt = []; let last = 0;
  const tick = (t) => { if (last) window.__fr.push([t, t - last]); last = t; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push([e.startTime, e.duration]))).observe({ type: "longtask", buffered: true }); } catch (e) {}
};
const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };

(async () => {
  const b = await launch({ args: ["--mute-audio", "--autoplay-policy=document-user-activation-required"] });
  const res = URLS.map(() => []);
  for (let r = 0; r < RUNS; r++) for (let u = 0; u < URLS.length; u++) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 664 }, screen: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: UA });
    await ctx.addInitScript(REC);
    const p = await ctx.newPage(), cdp = await ctx.newCDPSession(p);
    await cdp.send("Performance.enable"); await cdp.send("Emulation.setCPUThrottlingRate", { rate: RATE });
    await cdp.send("LayerTree.enable"); let layers = 0; cdp.on("LayerTree.layerTreeDidChange", (e) => { if (e.layers) layers = e.layers.length; });
    const m = async () => { const o = {}; (await cdp.send("Performance.getMetrics")).metrics.forEach((x) => (o[x.name] = x.value)); return o; };
    const m0 = await m();
    await p.goto(URLS[u], { waitUntil: "load", timeout: 90000 });
    const nav = await p.evaluate(() => performance.timeOrigin);
    await p.waitForTimeout(3000); const m1 = await m();
    await p.waitForTimeout(3000); const m2 = await m();
    const top = layers;
    const [fr, lt] = await p.evaluate(() => [window.__fr, window.__lt]);
    const win = (a, z) => {
      const f = fr.filter((x) => x[0] >= a && x[0] < z).map((x) => x[1]), l = lt.filter((x) => x[0] >= a && x[0] < z).map((x) => x[1]);
      return { jank: +(f.filter((x) => x > 33.4).length / (f.length || 1) * 100).toFixed(1), long: l.length, longMs: Math.round(l.reduce((s, x) => s + x, 0)), max: Math.round(Math.max(0, ...l)), tbt: Math.round(l.reduce((s, x) => s + Math.max(0, x - 50), 0)) };
    };
    const loadAt = await p.evaluate(() => performance.getEntriesByType("navigation")[0].loadEventEnd);
    const d = (a, z, k) => Math.round((z[k] - a[k]) * 1000);
    const one = { early: Object.assign(win(0, loadAt + 3000), { style: d(m0, m1, "RecalcStyleDuration"), layout: d(m0, m1, "LayoutDuration") }), late: Object.assign(win(loadAt + 3000, loadAt + 6000), { style: d(m1, m2, "RecalcStyleDuration"), layout: d(m1, m2, "LayoutDuration") }), layersTop: top };
    await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight * 0.4)); await p.waitForTimeout(2500); one.layersMid = layers;
    res[u].push(one); await ctx.close();
    process.stdout.write(".");
  }
  console.log("\nCPU x" + RATE + " " + UA.match(/Instagram|Safari/)[0] + ", " + RUNS + " runs each, medians (load+0-3 s | 3-6 s):");
  URLS.forEach((u, i) => {
    const R = res[i], g = (w, k) => med(R.map((x) => x[w][k]));
    console.log("  " + u + "\n    first 3 s: over33 " + g("early", "jank") + "%  long " + g("early", "long") + " (" + g("early", "longMs") + " ms, max " + g("early", "max") + ", TBT " + g("early", "tbt") + ")  style " + g("early", "style") + "  layout " + g("early", "layout") +
      "\n    next 3 s:  over33 " + g("late", "jank") + "%  long " + g("late", "long") + " (" + g("late", "longMs") + " ms, max " + g("late", "max") + ", TBT " + g("late", "tbt") + ")  style " + g("late", "style") + "  layout " + g("late", "layout") +
      "\n    layers: top " + med(R.map((x) => x.layersTop)) + ", mid-page " + med(R.map((x) => x.layersMid)) + "   (TBT per run, first 3 s: " + R.map((x) => x.early.tbt).join(" ") + ")");
  });
  if (OUT) fs.writeFileSync(OUT, JSON.stringify({ urls: URLS, res }, null, 1));
  await b.close();
})();
