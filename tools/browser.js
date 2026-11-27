// Every page test and capture here runs in Playwright's own headless Chromium (chrome-headless-shell), never the owner's Google
// Chrome: a run of the installed Chrome, even headless, put an icon in his Dock and upset the Chrome he was using.
// The shell comes from PLAYWRIGHT_BROWSERS_PATH (default ~/Documents/Studio_Dev/tools/ms-playwright, copied there, never
// downloaded), the newest chromium_headless_shell-* in it, whatever version of playwright-core loads this.
//   const { launch } = require("./browser");   const b = await launch({ args: [...] });
const pw = require("playwright-core"); // npm i playwright-core, or set NODE_PATH to a folder that has it
const fs = require("fs"), path = require("path"), os = require("os");

const ROOT = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(os.homedir(), "Documents", "Studio_Dev", "tools", "ms-playwright");

function shell() {
  let dirs = [];
  try { dirs = fs.readdirSync(ROOT).filter((n) => /^chromium_headless_shell-\d+$/.test(n)).sort((a, b) => +b.split("-")[1] - +a.split("-")[1]); } catch (e) {}
  for (const d of dirs) {
    for (const plat of ["chrome-headless-shell-mac-arm64", "chrome-headless-shell-mac-x64", "chrome-headless-shell-linux64"]) {
      const p = path.join(ROOT, d, plat, "chrome-headless-shell");
      if (fs.existsSync(p)) return p;
    }
  }
  throw new Error("No Playwright headless shell in " + ROOT + " (set PLAYWRIGHT_BROWSERS_PATH). The owner's Google Chrome is never used.");
}

function launch(opts = {}) {
  const o = Object.assign({}, opts, { headless: true, executablePath: shell() });
  delete o.channel;   // never an installed browser
  return pw.chromium.launch(o);
}

module.exports = { launch, shell, pw };
