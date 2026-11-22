// How smooth the site is in a slow phone's in-app browser (Instagram's, on iPhone): an iPhone-size page with Instagram's user agent,
// the CPU slowed (4x and 6x), measured over the first load, a scroll from the top of the home page to the bottom, and the waitlist's
// first steps. For each: frames (median, 95th percentile, share over 33 ms, i.e. a dropped frame at 60 Hz), long tasks (count, total,
// longest, total blocking time) and the main thread's own split (script, style, layout). Chrome measures the main thread; WebKit
// can't be slowed, so this is the cost the page asks of a phone, not WebKit's own number.
//   python3 build.py --serve   (PORT=8770)   then   node tools/perf_inapp.js [http://127.0.0.1:8760] [--rates 4,6] [--ua instagram|safari] [--json out.json]
const pw = require("playwright-core"); // npm i playwright-core, or set NODE_PATH to a folder that has it
const fs = require("fs");
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const BASE = (argv.find((a) => /^https?:/.test(a)) || "http://127.0.0.1:8760").replace(/\/+$/, "");
const RATES = opt("--rates", "4,6").split(",").map(Number);
const UAS = {
  instagram: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22B83 Instagram 357.0.0.25.101 (iPhone15,2; iOS 18_1; en_US; en; scale=3.00; 1179x2556; 659187005)",
  safari: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
};
const UA = UAS[opt("--ua", "instagram")];
const OUT = opt("--json", "");

const REC = () => {   // put first into each page: frames and long tasks, from the very start
  window.__fr = []; window.__lt = []; let last = 0;
  const tick = (t) => { if (last) window.__fr.push(t - last); last = t; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push([e.startTime, e.duration]))).observe({ type: "longtask", buffered: true }); } catch (e) {}
};
const stats = (fr, lt) => {
  const s = fr.slice().sort((a, b) => a - b), q = (p) => s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0;
  return { frames: s.length, p50: +q(.5).toFixed(1), p95: +q(.95).toFixed(1), jank: +(s.filter((x) => x > 33.4).length / (s.length || 1) * 100).toFixed(1),
    long: lt.length, longMs: Math.round(lt.reduce((a, b) => a + b[1], 0)), maxMs: Math.round(lt.reduce((a, b) => Math.max(a, b[1]), 0)), tbt: Math.round(lt.reduce((a, b) => a + Math.max(0, b[1] - 50), 0)) };
};
const take = (p) => p.evaluate(() => { const r = [window.__fr, window.__lt]; window.__fr = []; window.__lt = []; return r; });
const metrics = async (cdp) => { const m = {}; (await cdp.send("Performance.getMetrics")).metrics.forEach((x) => (m[x.name] = x.value)); return m; };
const split = (a, b) => ({ scriptMs: Math.round((b.ScriptDuration - a.ScriptDuration) * 1000), styleMs: Math.round((b.RecalcStyleDuration - a.RecalcStyleDuration) * 1000), layoutMs: Math.round((b.LayoutDuration - a.LayoutDuration) * 1000), layouts: b.LayoutCount - a.LayoutCount, styles: b.RecalcStyleCount - a.RecalcStyleCount });
const live = (p) => p.evaluate(() => {   // what the page has going at this moment, on screen and off
  const vh = innerHeight, on = (el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < vh && r.width > 0; };
  let blur = 0, blurOn = 0; document.querySelectorAll("*").forEach((el) => { const cs = getComputedStyle(el), b = cs.backdropFilter || cs.webkitBackdropFilter; if (b && b !== "none" && el.getClientRects().length && cs.visibility !== "hidden" && cs.display !== "none") { blur++; if (on(el)) blurOn++; } });
  const anims = document.getAnimations().filter((a) => a.playState === "running");
  const vids = [...document.querySelectorAll("video")];
  return { blur, blurOn, anims: anims.length, animsOff: anims.filter((a) => { const t = a.effect && a.effect.target; return t && t.isConnected && !on(t); }).length, videos: vids.length, playing: vids.filter((v) => !v.paused).length, loaded: vids.filter((v) => v.currentSrc).length };
});

(async () => {
  const b = await pw.chromium.launch({ channel: "chrome", headless: true, args: ["--mute-audio", "--autoplay-policy=document-user-activation-required"] });
  const all = {};
  for (const rate of RATES) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 664 }, screen: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: UA });
    await ctx.addInitScript(REC);
    const p = await ctx.newPage(), cdp = await ctx.newCDPSession(p), errs = [];
    p.on("pageerror", (e) => errs.push(e.message));
    await cdp.send("Performance.enable"); await cdp.send("Emulation.setCPUThrottlingRate", { rate });
    const R = (all["x" + rate] = {});
    // 1. the first load of the home page, and the 6 s after it
    let m0 = await metrics(cdp);
    await p.goto(BASE + "/", { waitUntil: "load", timeout: 90000 }); await p.waitForTimeout(6000);
    let [fr, lt] = await take(p), m1 = await metrics(cdp);
    R.load = Object.assign(stats(fr, lt), split(m0, m1), await live(p));
    // 2. the home page, top to bottom, at a thumb's pace (touch flings of 600 px), and a fling back up to the top
    const H = await p.evaluate(() => document.documentElement.scrollHeight);
    m0 = m1; await take(p);
    for (let y = 0; y < H; y += 600) await cdp.send("Input.synthesizeScrollGesture", { x: 195, y: 500, yDistance: -600, speed: 1400, gestureSourceType: "touch", repeatCount: 1 });
    const bottom = await live(p);
    for (let i = 0; i < 4; i++) await cdp.send("Input.synthesizeScrollGesture", { x: 195, y: 200, yDistance: Math.ceil(H / 4), speed: 6000, gestureSourceType: "touch" });
    [fr, lt] = await take(p); m1 = await metrics(cdp);
    R.scroll = Object.assign(stats(fr, lt), split(m0, m1), { height: H, atBottom: bottom });
    // 3. Instagram's bars: the page's height changes as they hide and come back (the web view itself is resized)
    m0 = m1; await take(p);
    await cdp.send("Input.synthesizeScrollGesture", { x: 195, y: 500, yDistance: -1800, speed: 1400, gestureSourceType: "touch" });
    for (let i = 0; i < 6; i++) { await p.setViewportSize({ width: 390, height: i % 2 ? 664 : 744 }); await cdp.send("Input.synthesizeScrollGesture", { x: 195, y: 500, yDistance: i % 2 ? -400 : 400, speed: 1400, gestureSourceType: "touch" }); }
    await p.setViewportSize({ width: 390, height: 664 });
    [fr, lt] = await take(p); m1 = await metrics(cdp);
    R.bars = Object.assign(stats(fr, lt), split(m0, m1));
    // 4. the waitlist: its first load, then name, a role, a brands pick and the links, step to step
    m0 = await metrics(cdp);
    await p.goto(BASE + "/early-access/", { waitUntil: "load", timeout: 90000 }); await p.waitForTimeout(5000);
    [fr, lt] = await take(p); m1 = await metrics(cdp);
    R.wlLoad = Object.assign(stats(fr, lt), split(m0, m1), await live(p));
    m0 = m1;
    await p.tap('[name="first"]'); await p.keyboard.type("Wren", { delay: 60 }); await p.tap('[name="last"]'); await p.keyboard.type("Test", { delay: 60 });
    await p.keyboard.press("Enter"); await p.waitForTimeout(1800);
    const next = () => p.locator("[data-wl-next]:visible, .wl-next:visible").first().tap({ timeout: 8000 }).catch(() => {});
    await p.tap('.wl-q.on .wl-opt[data-v="Creator"]', { timeout: 8000 }).catch(() => {}); await p.waitForTimeout(400); await next(); await p.waitForTimeout(1800);
    await p.tap('.wl-q.on .wl-opt[data-v="1"]', { timeout: 8000 }).catch(() => {}); await p.waitForTimeout(400); await next(); await p.waitForTimeout(1800);
    [fr, lt] = await take(p); m1 = await metrics(cdp);
    R.wlSteps = Object.assign(stats(fr, lt), split(m0, m1), { at: await p.evaluate(() => (document.querySelector(".wl-q.on") || {}).dataset?.q), errs });
    console.log("CPU x" + rate + "  " + UA.match(/Instagram|Safari/)[0]);
    for (const k of Object.keys(R)) { const r = R[k]; console.log("  " + k.padEnd(8) + ` frames ${r.frames}  p50 ${r.p50}  p95 ${r.p95}  over33 ${r.jank}%  long ${r.long} (${r.longMs} ms, max ${r.maxMs}, TBT ${r.tbt})  script ${r.scriptMs}  style ${r.styleMs} (${r.styles})  layout ${r.layoutMs} (${r.layouts})` + (r.blur != null ? `  blur ${r.blurOn}/${r.blur}  anims ${r.anims} (off ${r.animsOff})  video ${r.playing}/${r.loaded}/${r.videos}` : "") + (r.atBottom ? `  [bottom: blur ${r.atBottom.blurOn}/${r.atBottom.blur} anims ${r.atBottom.anims} (off ${r.atBottom.animsOff}) video ${r.atBottom.playing}/${r.atBottom.loaded}]` : "") + (r.at ? "  at " + r.at : "")); }
    if (errs.length) console.log("  page errors:", errs.slice(0, 3));
    await ctx.close();
  }
  if (OUT) fs.writeFileSync(OUT, JSON.stringify(all, null, 1));
  await b.close();
})();
