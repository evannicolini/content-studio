// One-time go-live for the waitlist: node worker/golive.mjs
// Asks for the Studio Brevo API key (hidden), checks it is the Studio account, creates the list and the contact
// attributes if they are missing, stores the key and an admin token as Worker secrets, and redeploys.
// The key is never written to a file.
import { execFileSync, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, chmodSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const cfgPath = join(here, "wrangler.json");
const LIST = "Studio early access";
const TEXT = ["ROLE", "BRANDS", "CLAUDE", "SOURCE", "REF_CODE", "REFERRED_BY"];
const NUM = ["REFERRALS", "POSITION"];

function ask(q) {
  return new Promise((res) => {
    process.stdout.write(q);
    const s = process.stdin; let v = "";
    s.setRawMode && s.setRawMode(true); s.resume(); s.setEncoding("utf8");
    s.on("data", function on(ch) {
      for (const c of ch) {
        if (c === "\r" || c === "\n") { s.setRawMode && s.setRawMode(false); s.pause(); s.removeListener("data", on); process.stdout.write("\n"); return res(v.trim()); }
        if (c === "\u0003") process.exit(1);
        if (c === "\u007f") v = v.slice(0, -1); else v += c;
      }
    });
  });
}

const key = process.env.BREVO_API_KEY || await ask("Paste the Studio Brevo API key (hidden), then Return: ");
if (!/^xkeysib-/.test(key)) { console.error("That doesn't look like a Brevo API key (they start with xkeysib-)."); process.exit(1); }

async function brevo(method, path, body) {
  const r = await fetch("https://api.brevo.com/v3" + path, { method, headers: { "api-key": key, "Content-Type": "application/json", Accept: "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch {}
  if (!r.ok) throw new Error(`Brevo ${method} ${path}: ${r.status} ${t}`);
  return j;
}

const acct = await brevo("GET", "/account");
const who = `${acct.companyName || ""} <${acct.email}>`;
if (/mirra|custom ?e-?sign/i.test(`${acct.companyName} ${acct.email}`)) { console.error(`Stopped: this key is for ${who}, not the Studio account.`); process.exit(1); }
console.log(`✓ Brevo account: ${who}`);

// List
let listId = 0;
for (let off = 0; !listId; off += 50) {
  const page = await brevo("GET", `/contacts/lists?limit=50&offset=${off}`);
  const hit = (page.lists || []).find((l) => l.name === LIST); if (hit) listId = hit.id;
  if (!page.lists || page.lists.length < 50) break;
}
if (!listId) {
  const folders = await brevo("GET", "/contacts/folders?limit=50&offset=0");
  let folderId = (folders.folders || []).find((f) => f.name === "Studio")?.id;
  if (!folderId) folderId = (await brevo("POST", "/contacts/folders", { name: "Studio" })).id;
  listId = (await brevo("POST", "/contacts/lists", { name: LIST, folderId })).id;
  console.log(`✓ Made the list "${LIST}" (#${listId})`);
} else console.log(`✓ List "${LIST}" (#${listId})`);

// Attributes
const have = new Set(((await brevo("GET", "/contacts/attributes")).attributes || []).map((a) => a.name));
for (const [names, type] of [[TEXT, "text"], [NUM, "float"]]) for (const n of names) {
  if (have.has(n)) continue;
  await brevo("POST", `/contacts/attributes/normal/${n}`, { type });
  console.log(`✓ Added the contact field ${n}`);
}

// Config + secrets + deploy
const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
cfg.vars.BREVO_LIST_ID = String(listId);
writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + "\n");
const w = (args, input) => {
  const r = spawnSync("npx", ["-y", "wrangler@4", ...args], { cwd: here, input, stdio: [input == null ? "inherit" : "pipe", "inherit", "inherit"] });
  if (r.status) { console.error("wrangler " + args.join(" ") + " failed"); process.exit(1); }
};
w(["secret", "put", "BREVO_API_KEY"], key);
const tokenFile = join(homedir(), ".studio-waitlist-admin-token");
let token; try { token = readFileSync(tokenFile, "utf8").trim(); } catch {}
if (!token) { token = randomBytes(24).toString("hex"); writeFileSync(tokenFile, token + "\n"); chmodSync(tokenFile, 0o600); }
w(["secret", "put", "ADMIN_TOKEN"], token);
w(["deploy"]);

const url = "https://studio-waitlist.studio-licence.workers.dev";
const sync = await fetch(url + "/admin/resync?limit=50", { method: "POST", headers: { Authorization: "Bearer " + token } }).then((r) => r.json()).catch(() => null);
const h = await fetch(url + "/health").then((r) => r.json()).catch(() => null);
console.log(h && h.ok ? `\n✓ Live: ${url}  (admin token saved in ~/.studio-waitlist-admin-token)` : "\n✗ Health check failed");
if (sync) console.log("  Brevo resync:", JSON.stringify(sync));
