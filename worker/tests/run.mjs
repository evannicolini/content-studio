#!/usr/bin/env node
// The waitlist Worker, tested on this Mac with no network: node worker/tests/run.mjs   (a second or two)
// The Worker's own fetch handler runs against a fresh in-memory D1 stand-in (tests/d1.mjs) and a fake Brevo
// (tests/fakes.mjs) for each test.
import assert from "node:assert/strict";
import worker, { e164 } from "../src/index.js";
import { d1 } from "./d1.mjs";
import { fakeBrevo } from "./fakes.mjs";

const SITE = "https://evannicolini.github.io";
const ORIGINS = "https://evannicolini.github.io,http://127.0.0.1:*,http://localhost:*";
const ADMIN = "test-admin-token-not-real";
const CODE = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{7}$/;

function setup(envOverrides = {}, brevoOptions = {}) {
  const brevo = fakeBrevo(brevoOptions);
  globalThis.fetch = brevo.fetch;
  const env = { DB: d1(), ORIGINS, BOOST: "10", BREVO_API_KEY: "test-brevo-key-not-real", BREVO_LIST_ID: "7", ADMIN_TOKEN: ADMIN, ...envOverrides };
  for (const k of Object.keys(env)) if (env[k] === undefined) delete env[k];
  const pending = [];
  const settle = async () => { while (pending.length) await pending.shift(); };
  let ipCounter = 0;
  async function call(method, path, { body, raw, headers = {}, ip, origin = SITE, wait = true } = {}) {
    const h = new Headers(headers);
    if (origin) h.set("Origin", origin);
    h.set("CF-Connecting-IP", ip || `198.51.100.${++ipCounter % 250}`);    // a new address each call unless a test says
    let payload;
    if (raw !== undefined) payload = raw;
    else if (body !== undefined) { payload = JSON.stringify(body); h.set("Content-Type", "application/json"); }
    const request = new Request("https://studio-waitlist.test" + path, { method, headers: h, body: payload });
    const res = await worker.fetch(request, env, { waitUntil: (p) => pending.push(p) });
    if (wait) await settle();
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    return { status: res.status, headers: res.headers, json, text };
  }
  const join = (body, opts = {}) => call("POST", "/join", { body, ...opts });
  const row = (email) => { const r = env.DB.sqlite.prepare("SELECT * FROM signups WHERE email = ?").get(email); return r ? { ...r } : null; };
  const count = () => env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM signups").get().n;
  return { env, brevo, call, join, row, count, settle, pending };
}
const person = (n, extra = {}) => ({
  first: `First${n}`, last: `Last${n}`, email: `person${n}@example.com`, phone: "", cc: "", roles: ["Creator"],
  brands: "", claude: "", source: "test", ref: "", hp: "", ...extra,
});

// ------------------------------------------------------------------------------------------------ the tests
const tests = [];
const test = (name, fn) => tests.push({ name, fn });

test("health", async () => {
  const t = setup();
  const r = await t.call("GET", "/health");
  assert.equal(r.status, 200);
  assert.deepEqual(r.json, { ok: true });
});

test("join: a new sign-up gets a code, its place and the whole shape", async () => {
  const t = setup();
  const a = await t.join(person(1, { roles: ["Creator", "Agency"], brands: "3", claude: "Pro" }));
  assert.equal(a.status, 200);
  assert.deepEqual(Object.keys(a.json).sort(), ["already", "boost", "code", "first", "ok", "position", "referrals", "total"]);
  assert.equal(a.json.ok, true);
  assert.match(a.json.code, CODE);
  assert.equal(a.json.first, "First1");
  assert.equal(a.json.position, 1);
  assert.equal(a.json.total, 1);
  assert.equal(a.json.referrals, 0);
  assert.equal(a.json.boost, 10);
  assert.equal(a.json.already, false);
  const b = await t.join(person(2));
  assert.equal(b.json.position, 2);
  assert.equal(b.json.total, 2);
  assert.notEqual(b.json.code, a.json.code);
  const r = t.row("person1@example.com");
  assert.equal(r.seq, 1);
  assert.equal(r.roles, "Creator, Agency");
  assert.equal(r.brands, "3");
  assert.equal(r.claude, "Pro");
});

test("join: names and fields are trimmed and capped", async () => {
  const t = setup();
  const r = await t.join(person(1, { first: "  Ada \n ", last: "L".repeat(500), email: "  Ada@Example.COM ", brands: "b".repeat(1000), roles: "Creator, Brand ,Creator" }));
  assert.equal(r.status, 200);
  assert.equal(r.json.first, "Ada");
  const row = t.row("ada@example.com");
  assert.equal(row.last.length, 80);
  assert.equal(row.brands.length, 300);
  assert.equal(row.roles, "Creator, Brand");
});

test("duplicate email: same code and place, details updated, already: true", async () => {
  const t = setup();
  const a = await t.join(person(1, { phone: "4155550100", cc: "1" }));
  await t.join(person(2));
  const again = await t.join(person(1, { email: "  PERSON1@Example.com ", last: "Newname", phone: "", brands: "5" }));
  assert.equal(again.status, 200);
  assert.equal(again.json.already, true);
  assert.equal(again.json.code, a.json.code);
  assert.equal(again.json.position, 1);
  assert.equal(again.json.total, 2);
  assert.equal(t.count(), 2);
  const r = t.row("person1@example.com");
  assert.equal(r.seq, 1);
  assert.equal(r.last, "Newname");
  assert.equal(r.brands, "5");
  assert.equal(r.sms, "+14155550100", "an empty phone on the second sign-up keeps the first one");
});

test("referrals: counted once per new email, and they move the referrer up", async () => {
  const t = setup();
  const codes = [];
  for (let n = 1; n <= 15; n++) codes.push((await t.join(person(n))).json.code);
  const fifteen = codes[14];
  assert.equal((await t.call("GET", "/status?code=" + fifteen)).json.position, 15);

  // One referral: score 15 − 10 = 5. Seq 1–4 are ahead, seq 5 ties and joined first: place 6.
  const f1 = await t.join(person(16, { ref: fifteen.toLowerCase() }));
  assert.equal(f1.json.position, 16);
  assert.equal(f1.json.total, 16);
  let s = (await t.call("GET", "/status?code=" + fifteen)).json;
  assert.equal(s.referrals, 1);
  assert.equal(s.position, 6);
  assert.equal(t.row("person16@example.com").referred_by, fifteen);
  // Seq 6, sixth until now, is pushed back to seventh.
  assert.equal((await t.call("GET", "/status?code=" + codes[5])).json.position, 7);

  // Two referrals: score −5, ahead of everyone who joined before.
  await t.join(person(17, { ref: fifteen }));
  s = (await t.call("GET", "/status?code=" + fifteen)).json;
  assert.equal(s.referrals, 2);
  assert.equal(s.position, 1);
  assert.equal((await t.call("GET", "/status?code=" + codes[0])).json.position, 2);

  // The same referred email again, with the ref: no second count.
  const dup = await t.join(person(17, { ref: fifteen }));
  assert.equal(dup.json.already, true);
  assert.equal((await t.call("GET", "/status?code=" + fifteen)).json.referrals, 2);

  // A code nobody has: the sign-up works, nobody is credited.
  const unknown = await t.join(person(18, { ref: "ZZZZZZZ" }));
  assert.equal(unknown.status, 200);
  assert.equal(t.row("person18@example.com").referred_by, null);
});

test("self-referral and a ref on a repeat sign-up are ignored", async () => {
  const t = setup();
  const a = (await t.join(person(1))).json.code;
  const b = (await t.join(person(2))).json.code;
  const self = await t.join(person(1, { ref: a }));
  assert.equal(self.json.already, true);
  assert.equal(self.json.referrals, 0);
  await t.join(person(2, { ref: a }));            // person 2 was already on the list
  assert.equal(t.row("person1@example.com").referrals, 0);
  assert.equal(t.row("person2@example.com").referred_by, null);
  assert.equal(t.row("person2@example.com").code, b);
});

test("honeypot: a fake success, nothing stored, nothing sent", async () => {
  const t = setup();
  await t.join(person(1));
  t.brevo.reset();
  const r = await t.join(person(2, { hp: "http://spam.example" }));
  assert.equal(r.status, 200);
  assert.equal(r.json.ok, true);
  assert.match(r.json.code, CODE);
  assert.equal(r.json.position, 2);
  assert.equal(r.json.total, 2);
  assert.equal(r.json.already, false);
  assert.equal(t.count(), 1);
  assert.equal(t.brevo.calls.length, 0);
  assert.equal((await t.call("GET", "/status?code=" + r.json.code)).status, 404);
});

test("validation: short human errors with 400", async () => {
  const t = setup();
  const cases = [
    [{ ...person(1), email: "" }, /email/i],
    [{ ...person(1), email: "not-an-email" }, /email/i],
    [{ ...person(1), email: "a@b" }, /email/i],
    [{ ...person(1), email: "a b@example.com" }, /email/i],
    [{ ...person(1), first: "   " }, /first name/i],
    [{ ...person(1), last: "" }, /last name/i],
    [{ ...person(1), first: { x: 1 } }, /first name/i],
  ];
  for (const [body, re] of cases) {
    const r = await t.join(body);
    assert.equal(r.status, 400, JSON.stringify(body));
    assert.equal(r.json.ok, false);
    assert.match(r.json.error, re);
    assert.ok(r.json.error.length < 80 && /[.!]$/.test(r.json.error), "a short sentence: " + r.json.error);
  }
  const notJson = await t.call("POST", "/join", { raw: "first=Ada", headers: { "Content-Type": "application/json" } });
  assert.equal(notJson.status, 400);
  assert.equal(notJson.json.ok, false);
  const arr = await t.call("POST", "/join", { raw: "[1,2]" });
  assert.equal(arr.status, 400);
  const big = await t.join({ ...person(1), brands: "x".repeat(9000) });
  assert.equal(big.status, 400);
  assert.match(big.json.error, /more than/);
  assert.equal(t.count(), 0);
  const get = await t.call("GET", "/join");
  assert.equal(get.status, 405);
  assert.equal(get.json.ok, false);
  const nope = await t.call("GET", "/nothing-here");
  assert.equal(nope.status, 404);
});

test("CORS: preflight and headers for the allowed sites only", async () => {
  const t = setup();
  for (const origin of [SITE, "http://127.0.0.1:5173", "http://localhost:8000", "http://127.0.0.1:8787"]) {
    const pre = await t.call("OPTIONS", "/join", { origin, headers: { "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type" } });
    assert.equal(pre.status, 204, origin);
    assert.equal(pre.headers.get("Access-Control-Allow-Origin"), origin);
    assert.match(pre.headers.get("Access-Control-Allow-Methods"), /POST/);
    assert.match(pre.headers.get("Access-Control-Allow-Headers"), /Content-Type/i);
    assert.equal(pre.headers.get("Vary"), "Origin");
  }
  const post = await t.join(person(1));
  assert.equal(post.headers.get("Access-Control-Allow-Origin"), SITE);
  assert.equal(post.headers.get("Vary"), "Origin");
  const err = await t.join({ ...person(2), email: "x" });
  assert.equal(err.headers.get("Access-Control-Allow-Origin"), SITE, "errors carry the header too, so the site can read them");
  for (const origin of ["https://evil.example", "http://127.0.0.1.evil.example:80", "https://evannicolini.github.io.evil.example", "null", "http://127.0.0.1:abc"]) {
    const pre = await t.call("OPTIONS", "/join", { origin });
    assert.equal(pre.status, 403, origin);
    assert.equal(pre.headers.get("Access-Control-Allow-Origin"), null);
    const p = await t.join(person(9), { origin });
    assert.equal(p.status, 403, origin);
  }
  assert.equal(t.count(), 1);
  const noOrigin = await t.call("GET", "/health", { origin: null });
  assert.equal(noOrigin.status, 200);
  assert.equal(noOrigin.headers.get("Access-Control-Allow-Origin"), null);
  const custom = setup({ ORIGINS: "https://studio.example" });
  assert.equal((await custom.call("OPTIONS", "/join", { origin: "https://studio.example" })).status, 204);
  assert.equal((await custom.call("OPTIONS", "/join", { origin: SITE })).status, 403);
});

test("rate limit: 10 sign-ups per address per 10 minutes", async () => {
  const t = setup();
  const ip = "203.0.113.9";
  for (let n = 1; n <= 10; n++) assert.equal((await t.join(person(n), { ip })).status, 200, "sign-up " + n);
  const eleventh = await t.join(person(11), { ip });
  assert.equal(eleventh.status, 429);
  assert.equal(eleventh.json.ok, false);
  assert.match(eleventh.json.error, /Try again/);
  assert.equal(eleventh.headers.get("Access-Control-Allow-Origin"), SITE);
  assert.equal((await t.join(person(11), { ip: "203.0.113.10" })).status, 200, "another address is not held up");
  const realNow = Date.now;
  Date.now = () => realNow() + 11 * 60 * 1000;
  try {
    assert.equal((await t.join(person(12), { ip })).status, 200, "the window has passed");
  } finally { Date.now = realNow; }
  assert.equal(t.count(), 12);
  assert.ok(!t.env.DB.sqlite.prepare("SELECT who FROM hits LIMIT 1").get().who.includes("203.0.113"), "addresses are kept only as a one-way code");
});

test("status: the same shape for a code, 404 for an unknown one", async () => {
  const t = setup();
  const a = (await t.join(person(1))).json;
  await t.join(person(2));
  const s = await t.call("GET", "/status?code=" + a.code.toLowerCase());
  assert.equal(s.status, 200);
  assert.deepEqual(s.json, { ok: true, code: a.code, first: "First1", position: 1, total: 2, referrals: 0, boost: 10, already: true });
  const unknown = await t.call("GET", "/status?code=ABCDEFG");
  assert.equal(unknown.status, 404);
  assert.equal(unknown.json.ok, false);
  assert.equal((await t.call("GET", "/status")).status, 404);
});

test("BOOST is a var", async () => {
  const t = setup({ BOOST: "3" });
  const codes = [];
  for (let n = 1; n <= 6; n++) codes.push((await t.join(person(n))).json.code);
  const r = await t.join(person(7, { ref: codes[5] }));
  assert.equal(r.json.boost, 3);
  assert.equal((await t.call("GET", "/status?code=" + codes[5])).json.position, 4);   // 6 − 3 = 3; seq 1–2 ahead, seq 3 ties first
});

test("Brevo: the contact, its attributes and the list; the referrer's count", async () => {
  const t = setup();
  const a = (await t.join(person(1, { phone: "07700 900123", cc: "44" }))).json;
  assert.equal(t.brevo.calls.length, 1);
  let c = t.brevo.calls[0];
  assert.equal(c.method, "POST");
  assert.equal(c.url, "https://api.brevo.com/v3/contacts");
  assert.equal(c.headers["api-key"], "test-brevo-key-not-real");
  assert.equal(c.headers["content-type"], "application/json");
  assert.deepEqual(c.body, {
    email: "person1@example.com", updateEnabled: true, listIds: [7],
    attributes: { FIRSTNAME: "First1", LASTNAME: "Last1", SMS: "+447700900123", ROLE: "Creator", BRANDS: "", CLAUDE: "", SOURCE: "test",
      REF_CODE: a.code, REFERRED_BY: "", REFERRALS: 0, POSITION: 1 },
  });
  assert.equal(t.row("person1@example.com").brevo_synced, 1);

  t.brevo.reset();
  await t.join(person(2, { ref: a.code, phone: "+1 (415) 555-0100", cc: "44", roles: ["Creator", "Brand"] }));
  const post = t.brevo.calls.find((x) => x.method === "POST");
  assert.equal(post.body.attributes.SMS, "+14155550100", "a full +number wins over cc");
  assert.equal(post.body.attributes.REFERRED_BY, a.code);
  assert.equal(post.body.attributes.ROLE, "Creator, Brand");
  const put = t.brevo.calls.find((x) => x.method === "PUT");
  assert.equal(put.url, "https://api.brevo.com/v3/contacts/" + encodeURIComponent("person1@example.com"));
  assert.deepEqual(put.body, { attributes: { REFERRALS: 1, POSITION: 1 } });
  assert.equal(t.brevo.contacts.get("person1@example.com").attributes.REFERRALS, 1);

  t.brevo.reset();
  await t.join(person(3));
  assert.equal(t.brevo.calls[0].body.attributes.SMS, undefined, "no phone, no SMS attribute");
});

test("Brevo: a refused SMS is retried once without it", async () => {
  const t = setup({}, { rejectSms: true });
  await t.join(person(1, { phone: "4155550100", cc: "1" }));
  assert.equal(t.brevo.calls.length, 2);
  assert.equal(t.brevo.calls[0].body.attributes.SMS, "+14155550100");
  assert.equal(t.brevo.calls[1].body.attributes.SMS, undefined);
  assert.equal(t.brevo.calls[1].body.attributes.FIRSTNAME, "First1");
  const r = t.row("person1@example.com");
  assert.equal(r.brevo_synced, 1);
  assert.match(r.brevo_error, /sent without SMS/);
  t.brevo.reset();
  await t.join(person(2));
  assert.equal(t.brevo.calls.length, 1, "no retry when there was no SMS");
});

test("Brevo: down or unset never fails a sign-up, and the answer never waits for it", async () => {
  const t = setup({}, { down: true });
  const r = await t.join(person(1, { phone: "4155550100", cc: "1" }));
  assert.equal(r.status, 200);
  assert.equal(r.json.ok, true);
  const row = t.row("person1@example.com");
  assert.equal(row.brevo_synced, 0);
  assert.match(row.brevo_error, /500/);

  const held = setup({}, { hold: true });
  const answer = await held.join(person(1), { wait: false });
  assert.equal(answer.status, 200, "answered while Brevo had not replied yet");
  assert.equal(held.brevo.calls.length, 1);
  assert.equal(held.row("person1@example.com").brevo_synced, 0);
  held.brevo.release();
  await held.settle();
  assert.equal(held.row("person1@example.com").brevo_synced, 1);

  const none = setup({ BREVO_API_KEY: undefined });
  assert.equal((await none.join(person(1))).status, 200);
  assert.equal(none.brevo.calls.length, 0, "no key: Brevo is skipped");
  assert.equal(none.row("person1@example.com").brevo_synced, 0, "and the row waits for a resync");

  const noList = setup({ BREVO_LIST_ID: "" });
  await noList.join(person(1));
  assert.equal(noList.brevo.calls[0].body.listIds, undefined);
});

test("Brevo: a failed referral update marks the referrer for resync", async () => {
  const t = setup();
  const a = (await t.join(person(1))).json;
  t.brevo.set({ down: true });
  await t.join(person(2, { ref: a.code }));
  const r = t.row("person1@example.com");
  assert.equal(r.brevo_synced, 0);
  assert.match(r.brevo_error, /referral count/);
});

test("a referral code that is already taken is drawn again", async () => {
  const t = setup();
  const realRandom = crypto.getRandomValues.bind(crypto);
  let fixed = 2;                                      // the first two draws give the same code
  crypto.getRandomValues = (arr) => { if (fixed-- > 0) { arr.fill(0); return arr; } return realRandom(arr); };
  try {
    const a = await t.join(person(1));
    const b = await t.join(person(2));
    assert.equal(a.json.code, "2222222");
    assert.equal(b.status, 200);
    assert.notEqual(b.json.code, a.json.code);
  } finally { crypto.getRandomValues = realRandom; }
});

test("admin: the token is required", async () => {
  const t = setup();
  for (const auth of [undefined, "Bearer wrong", "Bearer", ADMIN, "Basic " + ADMIN]) {
    const headers = auth ? { Authorization: auth } : {};
    assert.equal((await t.call("POST", "/admin/resync", { headers, origin: null })).status, 401, String(auth));
    assert.equal((await t.call("GET", "/admin/export.csv", { headers, origin: null })).status, 401, String(auth));
  }
  const unset = setup({ ADMIN_TOKEN: undefined });
  assert.equal((await unset.call("GET", "/admin/export.csv", { headers: { Authorization: "Bearer " }, origin: null })).status, 401);
  assert.equal((await unset.call("GET", "/admin/export.csv", { headers: { Authorization: "Bearer undefined" }, origin: null })).status, 401);
});

test("admin: resync sends the rows Brevo missed", async () => {
  const t = setup({}, { down: true });
  for (let n = 1; n <= 3; n++) await t.join(person(n));
  assert.equal(t.env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM signups WHERE brevo_synced = 0").get().n, 3);
  const auth = { Authorization: "Bearer " + ADMIN };
  let r = await t.call("POST", "/admin/resync", { headers: auth, origin: null });
  assert.deepEqual(r.json, { ok: true, tried: 3, synced: 0, failed: 3, unsynced: 3 });
  t.brevo.set({ down: false });
  t.brevo.reset();
  r = await t.call("POST", "/admin/resync?limit=2", { headers: auth, origin: null });
  assert.deepEqual(r.json, { ok: true, tried: 2, synced: 2, failed: 0, unsynced: 1 });
  r = await t.call("POST", "/admin/resync", { headers: auth, origin: null });
  assert.deepEqual(r.json, { ok: true, tried: 1, synced: 1, failed: 0, unsynced: 0 });
  assert.equal(t.brevo.contacts.size, 3);
  r = await t.call("POST", "/admin/resync?all=1&limit=2", { headers: auth, origin: null });
  assert.equal(r.json.tried, 2);
  assert.equal(r.json.next, 3);
  r = await t.call("POST", "/admin/resync?all=1&limit=2&from=3", { headers: auth, origin: null });
  assert.equal(r.json.tried, 1);
  assert.equal(r.json.next, null);
  const nokey = setup({ BREVO_API_KEY: undefined });
  const n = await nokey.call("POST", "/admin/resync", { headers: auth, origin: null });
  assert.equal(n.status, 400);
  assert.match(n.json.error, /BREVO_API_KEY/);
});

test("admin: export.csv lists everyone with their place", async () => {
  const t = setup();
  const codes = [];
  for (let n = 1; n <= 12; n++) codes.push((await t.join(person(n))).json.code);
  await t.join(person(13, { first: 'Quote "Q", Comma', brands: "=HYPERLINK(\"x\")", ref: codes[11], phone: "+44 7700 900123" }));
  const r = await t.call("GET", "/admin/export.csv", { headers: { Authorization: "Bearer " + ADMIN }, origin: null });
  assert.equal(r.status, 200);
  assert.match(r.headers.get("Content-Type"), /^text\/csv/);
  const lines = r.text.trim().split("\r\n");
  assert.equal(lines.length, 14);
  assert.equal(lines[0], "seq,position,joined,email,first,last,phone,cc,sms,roles,brands,claude,source,code,referred_by,referrals,ip,brevo_synced,brevo_error");
  const twelve = lines.find((l) => l.startsWith("12,"));
  assert.match(twelve, /^12,3,/, "seq 12 with one referral (score 2) is third");
  const thirteen = lines.find((l) => l.startsWith("13,"));
  assert.ok(thirteen.includes('"Quote ""Q"", Comma"'), thirteen);
  assert.ok(thirteen.includes(`'=HYPERLINK(""x"")`), "formulas are defused: " + thirteen);
  assert.ok(thirteen.includes(",+44 7700 900123,"), "phone numbers stay as they are");
  assert.ok(thirteen.includes("," + codes[11] + ","));
});

test("phone numbers become E.164 when they can", () => {
  assert.equal(e164("07700 900123", "44"), "+447700900123");
  assert.equal(e164("(415) 555-0100", "1"), "+14155550100");
  assert.equal(e164("+33 6 12 34 56 78", "1"), "+33612345678");
  assert.equal(e164("0033 6 12 34 56 78", ""), "+33612345678");
  assert.equal(e164("06 1234 5678", "39"), "+390612345678");
  assert.equal(e164("4155550100", ""), "");
  assert.equal(e164("12", "1"), "");
  assert.equal(e164("", "44"), "");
});

// ------------------------------------------------------------------------------------------------ run
let passed = 0, failed = 0;
const realFetch = globalThis.fetch;
const quiet = console.error;
for (const { name, fn } of tests) {
  console.error = () => {};                     // the Worker logs Brevo failures; the tests cause them on purpose
  try {
    await fn();
    passed++;
    console.log("ok   " + name);
  } catch (e) {
    failed++;
    console.log("FAIL " + name + "\n     " + String((e && e.stack) || e).split("\n").slice(0, 6).join("\n     "));
  } finally {
    console.error = quiet;
    globalThis.fetch = realFetch;
  }
}
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
