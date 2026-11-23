// What a page keeps doing for things that aren't on screen: at five points down the page (top, a quarter, half, three quarters,
// bottom), after it settles, it lists the CSS animations running on elements off screen, videos playing off screen, the
// requestAnimationFrame loops and intervals still firing (by where in the code they were started), the backdrop blurs, and the
// compositor's layers (count, and the memory their textures take: width x height x 4 bytes x the screen's scale squared).
// Also the main thread's style, layout and paint work per second while idle there.
//   node tools/offscreen_audit.js [url] [--phone|--desktop] [--ua instagram|safari] [--json out.json]
const pw = require("playwright-core"); // npm i playwright-core, or set NODE_PATH to a folder that has it
const fs = require("fs");
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const URL_ = argv.find((a) => /^https?:/.test(a)) || "http://127.0.0.1:8760/";
const DESK = argv.includes("--desktop");
const UAS = {
  instagram: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22B83 Instagram 357.0.0.25.101 (iPhone15,2; iOS 18_1; en_US; en; scale=3.00; 1179x2556; 659187005)",
  safari: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
};
const UA = DESK ? undefined : UAS[opt("--ua", "safari")];
const OUT = opt("--json", "");

const PROBE = () => {   // counts rAF callbacks and timer runs by the line that started them
  const where = () => { const s = (new Error().stack || "").split("\n").slice(3).find((l) => !/PROBE|<anonymous>/.test(l)) || ""; const m = s.match(/([^/\s(]+\.js)[^:]*:(\d+):\d+/); return m ? m[1] + ":" + m[2] : "?"; };
  window.__raf = {}; window.__tim = {};
  const R = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = function (cb) { const w = where(); return R(function (t) { window.__raf[w] = (window.__raf[w] || 0) + 1; return cb(t); }); };
  const SI = window.setInterval.bind(window);
  window.setInterval = function (cb, ms) { const w = where() + " every " + ms + "ms"; const a = [].slice.call(arguments, 2); return SI(function () { window.__tim[w] = (window.__tim[w] || 0) + 1; return typeof cb === "function" ? cb.apply(this, a) : null; }, ms); };
};

(async () => {
  const b = await pw.chromium.launch({ channel: "chrome", headless: true, args: ["--mute-audio", "--enable-gpu-rasterization"] });
  const ctx = await b.newContext(DESK ? { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 } : { viewport: { width: 390, height: 664 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: UA });
  await ctx.addInitScript(PROBE);
  const p = await ctx.newPage(), cdp = await ctx.newCDPSession(p);
  await cdp.send("Performance.enable"); await cdp.send("LayerTree.enable");
  let layers = [];
  cdp.on("LayerTree.layerTreeDidChange", (e) => { if (e.layers) layers = e.layers; });
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(URL_, { waitUntil: "load", timeout: 90000 }); await p.waitForTimeout(6000);
  const dpr = DESK ? 2 : 3;
  const metrics = async () => { const m = {}; (await cdp.send("Performance.getMetrics")).metrics.forEach((x) => (m[x.name] = x.value)); return m; };
  const H = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  const all = [];
  for (const f of [0, .25, .5, .75, 1]) {
    // get there the way a reader does: in steps, so everything on the way comes in and goes out
    const from = await p.evaluate(() => scrollY), to = Math.round(H * f);
    for (let k = 1; k <= 8; k++) { await p.evaluate((y) => scrollTo(0, y), Math.round(from + (to - from) * k / 8)); await p.waitForTimeout(90); }
    await p.waitForTimeout(2500);
    await p.evaluate(() => { window.__raf = {}; window.__tim = {}; });
    const a = await metrics(); await p.waitForTimeout(3000); const z = await metrics();
    const snap = await p.evaluate(() => {
      const vh = innerHeight, vw = innerWidth, on = (el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw && r.width > 0; };
      const name = (t) => { const s = t.closest && t.closest("section[id], header, footer, aside, [id]"); return (s ? (s.id || s.tagName.toLowerCase()) : "?") + " " + t.tagName.toLowerCase() + (typeof t.className === "string" && t.className ? "." + t.className.trim().split(/\s+/)[0] : ""); };
      const offAnims = {}; let animsOn = 0;
      document.getAnimations().forEach((an) => {
        if (an.playState !== "running") return; const t = an.effect && an.effect.target; if (!t) return;
        if (on(t)) { animsOn++; return; }
        const k = name(t) + (an.effect.pseudoElement || "") + " " + (an.animationName || an.transitionProperty || "js"); offAnims[k] = (offAnims[k] || 0) + 1;
      });
      const vids = [...document.querySelectorAll("video")], offVids = vids.filter((v) => !v.paused && !on(v)).map((v) => name(v) + " " + (v.currentSrc || "").split("/").pop());
      let blur = 0, blurOff = 0; document.querySelectorAll("body *").forEach((el) => { const cs = getComputedStyle(el), bf = cs.backdropFilter || cs.webkitBackdropFilter; if (bf && bf !== "none" && el.getClientRects().length) { blur++; if (!on(el)) blurOff++; } });
      return { offAnims, animsOn, offVids, videosPlaying: vids.filter((v) => !v.paused).length, blur, blurOff, raf: window.__raf, tim: window.__tim, els: document.getElementsByTagName("*").length };
    });
    const drawn = layers.filter((l) => l.drawsContent && !l.invisible);
    const mem = drawn.reduce((s, l) => s + l.width * l.height * 4 * dpr * dpr, 0);
    snap.layers = layers.length; snap.drawnLayers = drawn.length; snap.layerMB = +(mem / 1048576).toFixed(1);
    snap.perSec = { styleMs: Math.round((z.RecalcStyleDuration - a.RecalcStyleDuration) * 1000 / 3), layoutMs: Math.round((z.LayoutDuration - a.LayoutDuration) * 1000 / 3), scriptMs: Math.round((z.ScriptDuration - a.ScriptDuration) * 1000 / 3), taskMs: Math.round((z.TaskDuration - a.TaskDuration) * 1000 / 3) };
    snap.at = f; all.push(snap);
    const offN = Object.values(snap.offAnims).reduce((x, y) => x + y, 0);
    console.log(`\n== at ${Math.round(f * 100)}% (y ${to})  layers ${snap.layers} (${snap.drawnLayers} drawn, ~${snap.layerMB} MB)  blur ${snap.blur} (${snap.blurOff} off screen)  anims on ${snap.animsOn} / OFF ${offN}  videos playing ${snap.videosPlaying} (off ${snap.offVids.length})  idle/s: style ${snap.perSec.styleMs} layout ${snap.perSec.layoutMs} script ${snap.perSec.scriptMs} task ${snap.perSec.taskMs} ms`);
    Object.entries(snap.offAnims).sort((x, y) => y[1] - x[1]).slice(0, 14).forEach(([k, v]) => console.log("   off-screen anim  " + v + "x " + k));
    snap.offVids.forEach((v) => console.log("   off-screen video " + v));
    Object.entries(snap.raf).sort((x, y) => y[1] - x[1]).forEach(([k, v]) => console.log("   rAF " + (v / 3).toFixed(0) + "/s " + k));
    Object.entries(snap.tim).sort((x, y) => y[1] - x[1]).forEach(([k, v]) => console.log("   timer " + v + " runs in 3s  " + k));
  }
  if (errs.length) console.log("page errors:", errs.slice(0, 3));
  if (OUT) fs.writeFileSync(OUT, JSON.stringify(all, null, 1));
  await b.close();
})();
