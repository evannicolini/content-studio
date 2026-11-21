// Studio's early-access waitlist: one Cloudflare Worker. What it is for and how to run it: worker/README.md.
//
//   POST /join               a sign-up from the website: kept once per email, a referral code back, the place in line
//   GET  /status?code=…      the place in line for a referral code
//   GET  /count              { ok, total }: how many are on the list (the site's live count)
//   GET  /health             { ok: true }
//   POST /admin/resync       send Brevo the sign-ups it has not got yet (Authorization: Bearer ADMIN_TOKEN)
//   GET  /admin/export.csv   everyone, as a spreadsheet (the same token)
//
// The place in line: score = seq − referrals × BOOST, lower is better, ties go to whoever joined first.
// The front of the line: get GOAL (3) friends on the list and you, and every friend who joined with your link, go ahead of everyone
// else (in the same order among yourselves).
// Brevo is told after the answer has gone (ctx.waitUntil), so a slow or failing Brevo never fails a sign-up.

const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";  // no 0/O, 1/I/L look-alikes
const CODE_LENGTH = 7;
const MAX_BODY = 8 * 1024;                                  // bytes; a sign-up is a few hundred
const BREVO = "https://api.brevo.com/v3";
const DEFAULT_ORIGINS = "https://askstudio.ai,https://www.askstudio.ai,https://evannicolini.github.io,http://127.0.0.1:*,http://localhost:*";
const RESYNC_BATCH = 20;                                    // rows per /admin/resync call (each is 1–2 Brevo calls)

const te = new TextEncoder();
const now = () => Math.floor(Date.now() / 1000);
const int = (v, fallback) => { const n = parseInt(v, 10); return Number.isFinite(n) && n >= 0 ? n : fallback; };
const boostOf = (env) => int(env.BOOST, 10);
const goalOf = (env) => Math.max(1, int(env.GOAL, 3));
const EMAIL = /^[^\s@]{1,64}@(?:[^\s@.]+\.)+[^\s@.]{2,}$/;

// A one-line string from whatever the form sent: control characters and runs of spaces collapsed, cut to max.
function text(v, max) {
  if (typeof v !== "string" && typeof v !== "number") return "";
  return String(v).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers } });
}
const fail = (error, status = 400) => json({ ok: false, error }, status);
function same(a, b) {                   // compares in the same time whatever the strings hold
  a = String(a); b = String(b);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
async function sha(textValue) {
  const buf = await crypto.subtle.digest("SHA-256", te.encode(textValue));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function newCode() {
  const out = [];
  while (out.length < CODE_LENGTH) {
    for (const b of crypto.getRandomValues(new Uint8Array(16))) {
      if (b < 248 && out.length < CODE_LENGTH) out.push(CODE_ALPHABET[b % 31]);   // 248 = 8 × 31: no bias
    }
  }
  return out.join("");
}
const cleanCode = (v) => String(typeof v === "string" ? v : "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);

// "+<cc><digits>" for Brevo's SMS attribute, or "" when the number cannot be made into one.
export function e164(phone, cc) {
  const typed = String(phone || "").trim();
  let digits = typed.replace(/\D/g, "");
  if (!digits) return "";
  let full;
  if (typed.startsWith("+")) full = digits;
  else if (typed.startsWith("00")) full = digits.slice(2);
  else {
    const code = String(cc || "").replace(/\D/g, "");
    if (!code) return "";
    if (code !== "39") digits = digits.replace(/^0+/, "");    // the national trunk 0 (Italy keeps it)
    full = code + digits;
  }
  return full.length >= 8 && full.length <= 15 ? "+" + full : "";
}

// ------------------------------------------------------------------------------------------------ CORS
function originAllowed(origin, env) {
  return String(env.ORIGINS || DEFAULT_ORIGINS).split(",").map((s) => s.trim()).filter(Boolean).some((pattern) => {
    if (pattern === "*") return true;
    if (!pattern.includes("*")) return pattern === origin;
    const re = pattern.split("*").map((part) => part.replace(/[.+?^${}()|[\]\\/]/g, "\\$&"))
      .reduce((acc, part, i, parts) => acc + part + (i < parts.length - 1 ? (part.endsWith(":") ? "\\d{1,5}" : "[a-z0-9-]+") : ""), "");
    return new RegExp("^" + re + "$", "i").test(origin);
  });
}
// The headers for this request's origin; null when a browser on a site that is not allowed is asking.
function corsFor(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin) return {};
  if (!originAllowed(origin, env)) return null;
  return { "Access-Control-Allow-Origin": origin, "Vary": "Origin" };
}

// ------------------------------------------------------------------------------------------------ the line
// Every row with its score and whether it is at the front (?1 = BOOST, ?2 = GOAL).
const LINE = `WITH l AS (SELECT *, seq - referrals * ?1 AS score,
  CASE WHEN referrals >= ?2 OR referred_by IN (SELECT code FROM signups WHERE referrals >= ?2) THEN 1 ELSE 0 END AS front FROM signups)`;
async function standing(env, row) {
  const boost = boostOf(env), goal = goalOf(env);
  const r = await env.DB.prepare(LINE + `, me AS (SELECT * FROM l WHERE seq = ?3)
    SELECT (SELECT COUNT(*) FROM l) AS total, me.front AS front,
      (SELECT COUNT(*) FROM l WHERE l.front > me.front OR (l.front = me.front AND (l.score < me.score OR (l.score = me.score AND l.seq < me.seq)))) AS ahead
    FROM me`).bind(boost, goal, row.seq).first();
  return { position: r.ahead + 1, total: r.total, boost, goal, front: !!r.front };
}
async function answer(env, row, already) {
  const s = await standing(env, row);
  return { ok: true, code: row.code, first: row.first, position: s.position, total: s.total, referrals: row.referrals, boost: s.boost, goal: s.goal, front: s.front, already };
}
const bySeq = (env, seq) => env.DB.prepare("SELECT * FROM signups WHERE seq = ?").bind(seq).first();

// ------------------------------------------------------------------------------------------------ POST /join
async function rateOk(env, who) {
  const t = now(), win = int(env.RATE_WINDOW, 600), max = int(env.RATE_LIMIT, 10);
  await env.DB.prepare("DELETE FROM hits WHERE at <= ?").bind(t - win).run();
  const r = await env.DB.prepare("SELECT COUNT(*) AS n FROM hits WHERE who = ? AND at > ?").bind(who, t - win).first();
  if (r.n >= max) return false;
  await env.DB.prepare("INSERT INTO hits (who, at) VALUES (?, ?)").bind(who, t).run();
  return true;
}

function readForm(b) {
  const email = text(b.email, 300).toLowerCase();
  if (!email) return { error: "Add your email address." };
  if (email.length > 254 || !EMAIL.test(email)) return { error: "That email address doesn't look right." };
  const first = text(b.first, 80), last = text(b.last, 80);
  if (!first) return { error: "Add your first name." };
  if (!last) return { error: "Add your last name." };
  const list = Array.isArray(b.roles) ? b.roles : typeof b.roles === "string" ? b.roles.split(",") : [];
  const roles = [...new Set(list.map((r) => text(r, 60)).filter(Boolean))].slice(0, 12).join(", ");
  const phone = text(b.phone, 32), cc = String(typeof b.cc === "string" || typeof b.cc === "number" ? b.cc : "").replace(/\D/g, "").slice(0, 4);
  return {
    email, first, last, phone, cc, sms: e164(phone, cc), roles,
    brands: text(b.brands, 300), claude: text(b.claude, 120), source: text(b.source, 120), ref: cleanCode(b.ref),
    smsOk: b.sms_consent === true && !!e164(phone, cc), smsText: text(b.sms_consent_text, 1000), smsVersion: text(b.sms_consent_version, 40), terms: text(b.terms_version, 40),
  };
}

async function join(request, env, ctx) {
  if (int(request.headers.get("Content-Length"), 0) > MAX_BODY) return fail("That is more than a sign-up needs.");
  const raw = await request.text();
  if (te.encode(raw).length > MAX_BODY) return fail("That is more than a sign-up needs.");
  const who = (await sha("studio-waitlist:" + (request.headers.get("CF-Connecting-IP") || "local"))).slice(0, 24);
  if (!(await rateOk(env, who))) return fail("Too many sign-ups from here. Try again in a few minutes.", 429);
  let b;
  try { b = JSON.parse(raw); } catch { return fail("The form did not arrive as JSON. Try again."); }
  if (!b || typeof b !== "object" || Array.isArray(b)) return fail("The form did not arrive as JSON. Try again.");

  if (text(b.hp, 200)) {            // the honeypot: a bot filled the hidden field. Look pleased, keep nothing.
    const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM signups").first();
    return json({ ok: true, code: newCode(), first: text(b.first, 80), position: n + 1, total: n + 1, referrals: 0, boost: boostOf(env), already: false });
  }
  const f = readForm(b);
  if (f.error) return fail(f.error);
  const t = now(), ua = text(request.headers.get("User-Agent") || "", 300);

  let row = await env.DB.prepare("SELECT * FROM signups WHERE email = ?").bind(f.email).first();
  let referrer = null;
  if (!row) {
    referrer = f.ref ? await env.DB.prepare("SELECT seq, code, email FROM signups WHERE code = ?").bind(f.ref).first() : null;
    if (referrer && referrer.email === f.email) referrer = null;
    let added = null, raced = false;
    for (let attempt = 0; attempt < 6 && !added && !raced; attempt++) {
      try {
        const r = await env.DB.prepare(
          `INSERT INTO signups (email, first, last, phone, cc, sms, roles, brands, claude, source, code, referred_by, ip, created_at, updated_at,
             sms_consent, sms_consent_at, sms_consent_text, sms_consent_version, terms_version, user_agent)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(email) DO NOTHING`
        ).bind(f.email, f.first, f.last, f.phone, f.cc, f.sms, f.roles, f.brands, f.claude, f.source, newCode(), referrer ? referrer.code : null, who, t, t,
          f.smsOk ? 1 : 0, f.smsOk ? t : null, f.smsOk ? f.smsText : null, f.smsOk ? f.smsVersion : null, f.terms || null, ua).run();
        if (r.meta.changes) added = await bySeq(env, r.meta.last_row_id);
        else raced = true;                                             // the same email landed a moment ago: update it below
      } catch (e) {
        if (!/UNIQUE.*signups\.code/i.test(String((e && e.message) || e))) throw e;   // a code already taken: draw again
      }
    }
    if (added) {
      if (referrer) {                // counted from the rows themselves, so one email can never count twice
        await env.DB.prepare("UPDATE signups SET referrals = (SELECT COUNT(*) FROM signups WHERE referred_by = ?1) WHERE code = ?1").bind(referrer.code).run();
      }
      later(ctx, afterJoin(env, added.seq, referrer && referrer.seq));
      return json(await answer(env, added, false));
    }
    if (!raced) throw new Error("six referral codes in a row were taken");
    row = await env.DB.prepare("SELECT * FROM signups WHERE email = ?").bind(f.email).first();
  }

  // The same email again: new details, the same place, code and referrer. A ref on a second sign-up counts for nothing.
  const keepPhone = !f.phone;
  await env.DB.prepare(
    `UPDATE signups SET first = ?, last = ?, phone = ?, cc = ?, sms = ?, roles = ?, brands = ?, claude = ?, source = ?,
     brevo_synced = 0, updated_at = ? WHERE seq = ?`
  ).bind(f.first, f.last, keepPhone ? row.phone : f.phone, keepPhone ? row.cc : f.cc, keepPhone ? row.sms : f.sms,
    f.roles || row.roles, f.brands || row.brands, f.claude || row.claude, f.source || row.source, Math.max(t, row.updated_at + 1), row.seq).run();
  // A new tick is recorded with its own time and words; an unticked box on a repeat sign-up is not an opt-out (STOP is).
  if (f.smsOk) await env.DB.prepare("UPDATE signups SET sms_consent = 1, sms_consent_at = ?, sms_consent_text = ?, sms_consent_version = ?, user_agent = ? WHERE seq = ?")
    .bind(t, f.smsText, f.smsVersion, ua, row.seq).run();
  if (f.terms) await env.DB.prepare("UPDATE signups SET terms_version = ? WHERE seq = ?").bind(f.terms, row.seq).run();
  row = await bySeq(env, row.seq);
  later(ctx, afterJoin(env, row.seq, null));
  return json(await answer(env, row, true));
}

function later(ctx, promise) {
  const p = promise.catch((e) => console.error("brevo", String((e && e.message) || e).slice(0, 300)));
  if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(p);
}

// ------------------------------------------------------------------------------------------------ GET /status
async function status(url, env) {
  const code = cleanCode(url.searchParams.get("code"));
  if (!code) return json({ ok: false, error: "Add a code." }, 404);
  const row = await env.DB.prepare("SELECT * FROM signups WHERE code = ?").bind(code).first();
  if (!row) return json({ ok: false, error: "We don't know that code." }, 404);
  return json(await answer(env, row, true));
}

// ------------------------------------------------------------------------------------------------ Brevo
function listId(env) { const n = parseInt(env.BREVO_LIST_ID, 10); return Number.isFinite(n) && n > 0 ? n : 0; }

async function brevo(env, method, path, body) {
  try {
    const res = await fetch(BREVO + path, {
      method,
      headers: { "api-key": String(env.BREVO_API_KEY), "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(body),
    });
    const detail = await res.text().catch(() => "");
    return { ok: res.ok, status: res.status, detail: res.ok ? "" : (res.status + " " + detail).slice(0, 300) };
  } catch (e) {
    return { ok: false, status: 0, detail: ("network: " + String((e && e.message) || e)).slice(0, 300) };
  }
}

// The whole contact (created, or updated when Brevo has it). Returns true when Brevo took it.
async function pushContact(env, seq) {
  if (!env.BREVO_API_KEY) return false;
  const row = await bySeq(env, seq);
  if (!row) return false;
  const { position } = await standing(env, row);
  const attributes = {
    FIRSTNAME: row.first, LASTNAME: row.last, ROLE: row.roles, BRANDS: row.brands, CLAUDE: row.claude, SOURCE: row.source,
    REF_CODE: row.code, REFERRED_BY: row.referred_by || "", REFERRALS: row.referrals, POSITION: position,
    PHONE: row.sms || row.phone || "", SMS_CONSENT: !!row.sms_consent,
    SMS_CONSENT_AT: row.sms_consent_at ? new Date(row.sms_consent_at * 1000).toISOString() : "",
    SMS_CONSENT_TEXT: row.sms_consent ? (row.sms_consent_version ? "[" + row.sms_consent_version + "] " : "") + (row.sms_consent_text || "") : "",
  };
  if (row.sms && row.sms_consent) attributes.SMS = row.sms;   // the SMS channel only for someone who ticked the box
  const body = { email: row.email, attributes, updateEnabled: true };
  if (listId(env)) body.listIds = [listId(env)];
  let r = await brevo(env, "POST", "/contacts", body);
  let note = r.detail;
  if (!r.ok && r.status === 400 && attributes.SMS && /sms|phone/i.test(r.detail)) {   // a number Brevo will not take: keep the rest
    delete attributes.SMS;
    const first = r.detail;
    r = await brevo(env, "POST", "/contacts", body);
    note = r.ok ? "sent without SMS: " + first : r.detail;
  }
  // Marked done only if the row has not changed since it was read (a newer sign-up with the same email sends again).
  await env.DB.prepare("UPDATE signups SET brevo_synced = ?, brevo_error = ?, brevo_at = ? WHERE seq = ? AND updated_at = ?")
    .bind(r.ok ? 1 : 0, note ? note.slice(0, 300) : null, now(), seq, row.updated_at).run();
  return r.ok;
}

// A referrer's count went up: tell Brevo the new REFERRALS (and POSITION). If that fails, the row is sent again on resync.
// Reaching GOAL moves their friends to the front too, so each of them gets the new POSITION as well.
async function pushReferrals(env, seq) {
  if (!env.BREVO_API_KEY) return;
  const row = await bySeq(env, seq);
  if (!row) return;
  if (row.referrals >= goalOf(env)) {
    const { results } = await env.DB.prepare("SELECT seq FROM signups WHERE referred_by = ?").bind(row.code).all();
    await Promise.all(results.map((f) => pushPosition(env, f.seq)));
  }
  await pushPosition(env, seq);
}
async function pushPosition(env, seq) {
  const row = await bySeq(env, seq);
  if (!row) return;
  const { position } = await standing(env, row);
  const r = await brevo(env, "PUT", "/contacts/" + encodeURIComponent(row.email), { attributes: { REFERRALS: row.referrals, POSITION: position } });
  if (!r.ok) {
    await env.DB.prepare("UPDATE signups SET brevo_synced = 0, brevo_error = ?, brevo_at = ? WHERE seq = ?")
      .bind(("referral count: " + r.detail).slice(0, 300), now(), seq).run();
  }
}

async function afterJoin(env, seq, referrerSeq) {
  if (!env.BREVO_API_KEY) return;
  await Promise.all([pushContact(env, seq), referrerSeq ? pushReferrals(env, referrerSeq) : null]);
}

// ------------------------------------------------------------------------------------------------ admin
function isAdmin(request, env) {
  const token = String(env.ADMIN_TOKEN || "");
  return token.length > 0 && same(request.headers.get("Authorization") || "", "Bearer " + token);
}

// POST /admin/resync                       the rows Brevo has not got (brevo_synced = 0), oldest first
// POST /admin/resync?all=1&from=<seq>      everyone from that seq on (to refresh POSITION); answer says where to go on
// ?limit=<n> rows per call (default 20). A Worker on the free plan can make 50 outside calls per request.
async function resync(url, env) {
  if (!env.BREVO_API_KEY) return fail("Brevo is not set up yet (the BREVO_API_KEY secret).");
  const limit = Math.min(Math.max(int(url.searchParams.get("limit"), RESYNC_BATCH), 1), 500);
  const all = url.searchParams.get("all") === "1";
  const rows = all
    ? (await env.DB.prepare("SELECT seq FROM signups WHERE seq >= ? ORDER BY seq LIMIT ?").bind(int(url.searchParams.get("from"), 0), limit).all()).results
    : (await env.DB.prepare("SELECT seq FROM signups WHERE brevo_synced = 0 ORDER BY seq LIMIT ?").bind(limit).all()).results;
  let synced = 0;
  for (const { seq } of rows) if (await pushContact(env, seq)) synced++;
  const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM signups WHERE brevo_synced = 0").first();
  const out = { ok: true, tried: rows.length, synced, failed: rows.length - synced, unsynced: n };
  if (all) out.next = rows.length === limit ? rows[rows.length - 1].seq + 1 : null;
  return json(out);
}

// Make the contact fields the sign-up writes, if Brevo doesn't have them yet (the key's own account).
const ATTRS = { ROLE: "text", BRANDS: "text", CLAUDE: "text", SOURCE: "text", REF_CODE: "text", REFERRED_BY: "text", REFERRALS: "float", POSITION: "float",
  PHONE: "text", SMS_CONSENT: "boolean", SMS_CONSENT_AT: "text", SMS_CONSENT_TEXT: "text" };
async function brevoSetup(env) {
  if (!env.BREVO_API_KEY) return fail("Brevo is not set up yet (the BREVO_API_KEY secret).");
  const res = await fetch(BREVO + "/contacts/attributes", { headers: { "api-key": String(env.BREVO_API_KEY), Accept: "application/json" } });
  if (!res.ok) return fail("Brevo said " + res.status + ".", 502);
  const have = new Set(((await res.json()).attributes || []).map((a) => a.name));
  const made = [], failed = [];
  for (const [name, type] of Object.entries(ATTRS)) {
    if (have.has(name)) continue;
    const r = await brevo(env, "POST", "/contacts/attributes/normal/" + name, { type });
    (r.ok ? made : failed).push(r.ok ? name : name + ": " + r.detail);
  }
  return json({ ok: !failed.length, made, failed });
}

function csvCell(v) {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^\+?[\d ()-]+$/.test(s)) s = "'" + s;   // keep spreadsheets from running a cell as a formula
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
const COLUMNS = ["seq", "position", "front", "joined", "email", "first", "last", "phone", "cc", "sms", "sms_consent", "sms_consent_at", "sms_consent_version", "terms_version", "roles", "brands", "claude", "source",
  "code", "referred_by", "referrals", "ip", "brevo_synced", "brevo_error"];
async function exportCsv(env) {
  const { results } = await env.DB.prepare(
    LINE + " SELECT *, ROW_NUMBER() OVER (ORDER BY front DESC, score, seq) AS position FROM l ORDER BY seq"
  ).bind(boostOf(env), goalOf(env)).all();
  const lines = [COLUMNS.join(",")];
  for (const r of results) {
    r.joined = new Date(r.created_at * 1000).toISOString().slice(0, 19) + "Z";
    lines.push(COLUMNS.map((c) => csvCell(r[c])).join(","));
  }
  return new Response(lines.join("\r\n") + "\r\n", {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="studio-waitlist.csv"', "Cache-Control": "no-store" },
  });
}

// ------------------------------------------------------------------------------------------------ routes
async function route(request, url, env, ctx) {
  const path = url.pathname, m = request.method;
  if (path === "/join") return m === "POST" ? await join(request, env, ctx) : fail("Use POST.", 405);
  if (path === "/status") return m === "GET" ? await status(url, env) : fail("Use GET.", 405);
  if (path === "/count") {
    if (m !== "GET") return fail("Use GET.", 405);
    const r = await env.DB.prepare("SELECT COUNT(*) AS n FROM signups").first();
    return json({ ok: true, total: r.n }, 200, { "Cache-Control": "public, max-age=15" });
  }
  if (path === "/health") return json({ ok: true });
  if (path.startsWith("/admin/")) {
    if (!isAdmin(request, env)) return fail("Not allowed.", 401);
    if (path === "/admin/resync" && m === "POST") return await resync(url, env);
    if (path === "/admin/export.csv" && m === "GET") return await exportCsv(env);
    if (path === "/admin/brevo-setup" && m === "POST") return await brevoSetup(env);
  }
  return fail("Not found.", 404);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const cors = corsFor(request, env);
    if (cors === null) return fail("This site is not allowed to use the waitlist.", 403);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: {
        ...cors, "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400",
      } });
    }
    let res;
    try {
      res = await route(request, url, env, ctx);
    } catch (e) {
      console.error(url.pathname, String((e && e.message) || e).slice(0, 300));
      res = fail("Something went wrong on our side. Try again in a minute.", 500);
    }
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
    return res;
  },
};
