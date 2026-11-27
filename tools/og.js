// Link-preview images (Open Graph), rendered from real HTML/CSS in headless Chrome at 2x, then saved as a 1200x630 JPEG.
//   node tools/og.js early-access            -> assets/og-invite.jpg   (tools/og/early-access.html)
// The template sits next to the site's own files (served from the repo root), so it uses the site's CSS, fonts, wallpapers and the
// Studio mark from src/shell.html. Needs playwright-core (npm i playwright-core) and macOS sips for the downscale.
// One og:image per page: iMessage shows every og:image it finds side by side, so a second (square) one draws two stitched frames.
const pw = require("playwright-core"); const { launch } = require("./browser");   // Playwright's own headless Chromium, never the owner's Chrome
const fs = require("fs"), path = require("path"), http = require("http"), { execFileSync } = require("child_process");
const ROOT = path.join(__dirname, "..");
const JOBS = { "early-access": { tpl: "tools/og/early-access.html", out: "assets/og-invite.jpg" } };
const name = process.argv[2] || "early-access", job = JOBS[name];
if (!job) { console.error("unknown: " + name + " (one of " + Object.keys(JOBS).join(", ") + ")"); process.exit(1); }

const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml", ".woff": "font/woff", ".woff2": "font/woff2" };
(async () => {
  const shell = fs.readFileSync(path.join(ROOT, "src/shell.html"), "utf8"), at = shell.indexOf("<!-- the Studio mark");
  const defs = shell.slice(at, shell.indexOf("</svg>", at) + 6);
  const html = fs.readFileSync(path.join(ROOT, job.tpl), "utf8").replace("<!--DEFS-->", defs);
  // a throwaway local server on a free port, closed at the end (the template's relative URLs resolve against the repo root)
  const srv = http.createServer((q, r) => {
    const p = decodeURIComponent(q.url.split("?")[0]);
    if (p === "/__og.html") { r.writeHead(200, { "content-type": "text/html" }); return r.end(html); }
    const f = path.join(ROOT, path.normalize(p).replace(/^(\.\.[/\\])+/, ""));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r);
  }).listen(0, "127.0.0.1");
  await new Promise((ok) => srv.on("listening", ok));
  const b = await launch({});
  try {
    const p = await (await b.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 })).newPage();
    const errs = [];
    p.on("requestfailed", (r) => errs.push("FAILED " + r.url())); p.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
    p.on("response", (r) => { if (r.status() >= 400) errs.push(r.status() + " " + r.url()); });
    await p.goto("http://127.0.0.1:" + srv.address().port + "/__og.html", { waitUntil: "networkidle" });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(400);
    const big = path.join(require("os").tmpdir(), "og-" + name + "@2x.png");
    await p.screenshot({ path: big, type: "png" });
    const out = path.join(ROOT, job.out);
    execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "86", "-z", "630", "1200", big, "--out", out], { stdio: "ignore" });
    console.log(out, fs.statSync(out).size + " bytes", "(2x master: " + big + ")");
    if (errs.length) console.log(errs.join("\n"));
  } finally { await b.close(); srv.close(); }
})();
