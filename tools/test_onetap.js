// One tap is enough: every "Get early access" on the site opens the waitlist right there, and that same tap starts its music and
// Kayla (no second tap). With ?open (the public sign-up switched on) every "Get Studio" / "Start free" does the same for the sign-up.
// Chrome, a fresh profile, Chrome's real autoplay rule (sound only after a tap on the page), and muted: nothing reaches the speakers.
// Also: Back closes it, Forward opens it again, a refresh loads the page of its own (/early-access/, /start/).
//   python3 build.py --serve   (PORT=8770 for another port)   then   node tools/test_onetap.js [http://127.0.0.1:8760]
// Exit code 1 if anything fails.
const pw = require("playwright-core"); // npm i playwright-core, or set NODE_PATH to a folder that has it
const BASE = (process.argv[2] || "http://127.0.0.1:8760").replace(/\/+$/, "");
let failed = 0;
const check = (name, ok, got) => { if (!ok) failed++; console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : "  (got " + JSON.stringify(got) + ")")); };
const SHEETS = {
  waitlist: { q: "", sel: "[data-early]", attr: "data-early", id: "early-access", sfx: "__wlSFX", kay: "[data-wl-kay]", hash: "#early-access", page: "/early-access/" },
  "sign-up": { q: "?open", sel: "[data-start]", attr: "data-get", id: "signup", sfx: "__stSFX", kay: "[data-st-kay]", hash: "#signup", page: "/start/" },
};
(async () => {
  const b = await pw.chromium.launch({ channel: "chrome", headless: true, args: ["--autoplay-policy=document-user-activation-required", "--mute-audio"] });
  for (const [kind, S] of Object.entries(SHEETS)) {
    for (const [dev, vp, mobile] of [["desktop", { width: 1440, height: 900 }, false], ["phone", { width: 390, height: 844 }, true]]) {
      const probe = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile });
      const pp = await probe.newPage(); await pp.goto(BASE + "/" + S.q); await pp.waitForTimeout(2500);
      const kinds = await pp.evaluate((S) => [...new Set([...document.querySelectorAll(S.sel)].filter((e) => !e.closest("#" + S.id)).map((e) => e.getAttribute(S.attr)).filter(Boolean))], S);
      await probe.close();
      check(kind + " (" + dev + "): the site has its buttons", kinds.length > 0, kinds);
      let backDone = false;
      for (const k of kinds) {
        const ctx = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile });   /* a fresh profile for every button */
        const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message));
        await p.goto(BASE + "/" + S.q); await p.waitForTimeout(2500);
        const btn = p.locator(S.sel + "[" + S.attr + '="' + k + '"]').filter({ visible: true }).first();   /* the plans: desktop and phone each have their own */
        if (k === "float") { await p.mouse.wheel(0, 1600); await p.waitForTimeout(1200); }   /* the floating pill: once the hero's button is gone */
        else { await btn.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(600); }
        const before = await p.evaluate((S) => window[S.sfx].state(), S);
        if (!(await btn.isVisible())) { console.log("SKIP " + kind + " (" + dev + ") " + k + ": not shown at this size"); await ctx.close(); continue; }
        if (mobile) await btn.tap(); else await btn.click();
        await p.waitForTimeout(2500);
        const r = await p.evaluate((S) => { const X = window[S.sfx], k = document.querySelector("#" + S.id + " " + S.kay); return { url: location.pathname + location.hash, open: !!document.querySelector("#" + S.id + ".open"), ctx: X.state(), music: X.bed.on(), kayla: !!(k && k.classList.contains("talk")) }; }, S);
        check(kind + " (" + dev + ") " + k + ": one tap opens it here with the music and Kayla", before !== "running" && r.url === "/" + S.hash && r.open && r.ctx === "running" && r.music && r.kayla && !errs.length, { before, ...r, errs });
        if (!backDone) {   /* once per sheet and size: Back, Forward, refresh */
          backDone = true;
          await p.goBack(); await p.waitForTimeout(900);
          const bk = await p.evaluate((S) => ({ url: location.pathname + location.hash, open: !!document.querySelector("#" + S.id + ".open"), music: window[S.sfx].bed.on() }), S);
          check(kind + " (" + dev + "): Back closes it, the music fades out", bk.url === "/" && !bk.open && !bk.music, bk);
          await p.goForward(); await p.waitForTimeout(1500);
          check(kind + " (" + dev + "): Forward opens it again", await p.evaluate((S) => !!document.querySelector("#" + S.id + ".open"), S), p.url());
          await p.reload(); await p.waitForTimeout(2500);
          const pg = await p.evaluate(() => ({ path: location.pathname, page: window.SK_PAGE || "" }));
          check(kind + " (" + dev + "): a refresh loads " + S.page, pg.path === S.page, pg);
        }
        await ctx.close();
      }
    }
  }
  await b.close(); process.exit(failed ? 1 : 0);
})();
