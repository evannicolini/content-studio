// Checks the invite gate: a wrong code is refused, the right one unlocks and points at the download. node tools/test_gate.js <code>
const pw = require("playwright-core"); // npm i playwright-core, or set NODE_PATH to a folder that has it
(async () => {
  const b = await pw.chromium.launch({ channel: "chrome", headless: true });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  let nav = null;
  await p.route("**/*dropbox.com/**", (r) => { nav = r.request().url(); r.fulfill({ status: 200, headers: { "content-type": "application/octet-stream", "content-disposition": "attachment; filename=Studio.dmg" }, body: "x" }); });
  await p.goto("http://127.0.0.1:8760/#pricing"); await p.waitForTimeout(1500);
  await p.fill("#pr-code", "wrong-code"); await p.click(".pr-form button"); await p.waitForTimeout(1500);
  console.log("wrong:", JSON.stringify(await p.textContent(".pr-msg")), "open hidden:", await p.$eval(".pr-open", (e) => e.hidden));
  await p.fill("#pr-code", process.argv[2] || ""); await p.click(".pr-form button"); await p.waitForTimeout(2500);
  console.log("right: open hidden:", await p.$eval(".pr-open", (e) => e.hidden), "| sub:", await p.textContent("[data-pr-sub]"), "| fine:", await p.textContent("[data-pr-fine]"));
  console.log("download started at:", nav ? nav.replace(/rlkey=[^&]+/, "rlkey=…").slice(0, 110) : null);
  await p.screenshot({ path: "_shots/pr-unlocked.jpg", type: "jpeg", quality: 80 });
  await b.close();
})();
