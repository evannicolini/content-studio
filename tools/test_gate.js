// Checks the founders gate: a wrong code is refused, the right one unlocks and points at the download link.
//   STUDIO_GATE_CODE='<code>' node tools/test_gate.js [site url, default http://127.0.0.1:8760]
// The code comes from the environment, never argv (argv shows in ps and shell history), and is never printed. The download link
// is never printed either: only its origin and path. The download itself is answered with a stub, so nothing is fetched.
// Runs in Playwright's own headless Chromium with audio muted (tools/browser.js), never the owner's Google Chrome.
const { launch } = require("./browser");
(async () => {
  const base = (process.argv[2] || "http://127.0.0.1:8760").replace(/\/$/, ""), code = process.env.STUDIO_GATE_CODE || "";
  if (!code) { console.error("set STUDIO_GATE_CODE"); process.exit(1); }
  const b = await launch({ args: ["--use-mock-keychain", "--password-store=basic"] });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  let nav = null;
  await p.route("**/studio-licence*/get*", (r) => { nav = r.request().url(); r.fulfill({ status: 204 }); });
  await p.goto(base + "/?c=" + Date.now() + "#pricing", { waitUntil: "load", timeout: 60000 }); await p.waitForTimeout(1500);
  await p.fill("#pr-code", "wrong-code"); await p.click(".pr-form button"); await p.waitForTimeout(2000);
  const wrongOpen = !(await p.$eval(".pr-open", (e) => e.hidden));
  console.log("wrong code:", JSON.stringify(await p.textContent(".pr-msg")), "| unlocked:", wrongOpen, "| download:", !!nav);
  await p.fill("#pr-code", code); await p.click(".pr-form button"); await p.waitForTimeout(3000);
  const open = !(await p.$eval(".pr-open", (e) => e.hidden));
  console.log("right code: unlocked:", open, "| fine:", JSON.stringify(await p.textContent("[data-pr-fine]")), "| download:", nav ? new URL(nav).origin + new URL(nav).pathname : null);
  await b.close();
  process.exit(!wrongOpen && open && nav ? 0 : 1);
})().catch((e) => { console.error(e.message); process.exit(1); });
