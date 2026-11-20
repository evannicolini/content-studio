#!/usr/bin/env node
// The waitlist Worker on this Mac, so the website can be tried end to end. Nothing leaves this Mac.
//
//   node worker/dev.mjs            http://127.0.0.1:8787   (PORT=… for another port)
//   node worker/dev.mjs --reset    start with an empty list
//
// The Worker's own fetch handler runs here, with the vars from worker/wrangler.json, a database file in worker/.dev/
// (gitignored) and a fake Brevo that only prints what it would have been sent. The admin token is "dev" (or ADMIN_TOKEN).
// The rate limit is 100 sign-ups per 10 minutes here (RATE_LIMIT=… to change it), since every request comes from one address.
import http from "node:http";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import worker from "./src/index.js";
import { d1 } from "./tests/d1.mjs";
import { fakeBrevo } from "./tests/fakes.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIR = join(HERE, ".dev");
const FILE = join(DIR, "waitlist.sqlite");
const PORT = Number(process.env.PORT || 8787);
if (process.argv.includes("--reset")) rmSync(DIR, { recursive: true, force: true });
mkdirSync(DIR, { recursive: true });

const vars = JSON.parse(readFileSync(join(HERE, "wrangler.json"), "utf8")).vars || {};
const brevo = fakeBrevo({ log: true });
globalThis.fetch = brevo.fetch;                 // the Worker's only outside calls are to Brevo; they land here
const env = {
  ...vars,
  BREVO_LIST_ID: vars.BREVO_LIST_ID || "1",
  BREVO_API_KEY: "dev-fake-brevo-key",          // not a real key: it only switches the Brevo code path on
  ADMIN_TOKEN: process.env.ADMIN_TOKEN || "dev",
  RATE_LIMIT: process.env.RATE_LIMIT || "100",
  DB: d1(FILE),
};
const SKIP = new Set(["host", "connection", "keep-alive", "content-length", "transfer-encoding", "upgrade"]);

http.createServer(async (req, res) => {
  const started = Date.now();
  try {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) if (!SKIP.has(k) && v !== undefined) headers.set(k, Array.isArray(v) ? v.join(", ") : v);
    headers.set("CF-Connecting-IP", req.socket.remoteAddress || "127.0.0.1");
    const hasBody = !["GET", "HEAD"].includes(req.method);
    const request = new Request(`http://127.0.0.1:${PORT}${req.url}`, { method: req.method, headers, body: hasBody ? Buffer.concat(chunks) : undefined });
    const response = await worker.fetch(request, env, { waitUntil: (p) => p.catch((e) => console.error("  background:", e)) });
    const body = Buffer.from(await response.arrayBuffer());
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(body);
    console.log(`${req.method} ${req.url} → ${response.status} (${Date.now() - started} ms)${response.status >= 400 ? " " + body.toString().slice(0, 120) : ""}`);
  } catch (e) {
    console.error(`${req.method} ${req.url} → crashed:`, e);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "The dev server crashed. See the terminal." }));
  }
}).listen(PORT, "127.0.0.1", () => {
  console.log(`Studio waitlist (local) on http://127.0.0.1:${PORT}`);
  console.log(`  database   ${FILE}`);
  console.log(`  Brevo      fake: calls are printed here, nothing is sent`);
  console.log(`  admin      curl -H "Authorization: Bearer ${env.ADMIN_TOKEN}" http://127.0.0.1:${PORT}/admin/export.csv`);
  console.log(`  site       put "api": "http://127.0.0.1:${PORT}" in src/waitlist.json while testing`);
});
