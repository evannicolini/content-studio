// Locks the download link behind the invite code. The link is stored encrypted in assets/gate.json; only the right code opens it.
//   node tools/make_gate.mjs "<invite code>" "<download url>" [size in MB] [version]
// The site no longer shows size or version (the founders link always serves the newest DMG); leave them out.
// Codes are compared in capitals with spaces, dashes and other punctuation ignored, so "<invite code>" and "<INVITE-CODE>" are the same code.
// Change the code or the link: run this again, then python3 build.py, then publish.
import { webcrypto as c } from "node:crypto";
import { writeFileSync } from "node:fs";
const [code, url, size = "", version = ""] = process.argv.slice(2);
if (!code || !url) { console.error("usage: node tools/make_gate.mjs <code> <url> [sizeMB] [version]"); process.exit(1); }
const norm = (s) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
const enc = new TextEncoder(), salt = c.getRandomValues(new Uint8Array(16)), iv = c.getRandomValues(new Uint8Array(12));
const base = await c.subtle.importKey("raw", enc.encode(norm(code)), "PBKDF2", false, ["deriveKey"]);
const key = await c.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 150000, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
const ct = new Uint8Array(await c.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify({ url, size, version }))));
const b64 = (u) => Buffer.from(u).toString("base64");
writeFileSync(new URL("../assets/gate.json", import.meta.url), JSON.stringify({ v: 1, it: 150000, salt: b64(salt), iv: b64(iv), ct: b64(ct) }));
console.log("assets/gate.json written for a", norm(code).length, "character code");
