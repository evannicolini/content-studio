// Studio's early-access waitlist: one Cloudflare Worker. What it is for and how to run it: worker/README.md.
//
//   POST /join               a sign-up from the website: kept once per email; a new email is sent a code to confirm it
//   POST /confirm            { email, code } or { token } (the link in the email): confirms it, the referral code and place back
//   POST /resend             { email }: a new code (60 s apart)
//   GET  /status?code=…      the place in line for a referral code
//   GET  /pass?t=…           your own pass from its private link: the place, the friends, your full name (the token is the proof)
//   POST /invited            { t }: one more invite sent (their pass token), so every device shows "2 invites sent"
//   GET  /count              { ok, total }: how many are on the list (the site's live count)
//   GET  /health             { ok: true }
//   POST /admin/resync       send Brevo the sign-ups it has not got yet (Authorization: Bearer ADMIN_TOKEN)
//   GET  /admin/export.csv   everyone, as a spreadsheet (the same token)
//   GET  /admin/brevo-check  the Brevo account the key belongs to, its senders and domains (read only; the same token)
//   GET  /admin/brevo-contact?email=  one contact's fields in Brevo (read only; the same token)
//
// Confirmation: a sign-up is saved straight away but holds a place, counts as a friend and goes to Brevo only once its email is
// confirmed, with the 6-digit code (10 minutes, 5 tries) or the link (24 hours) in the "Confirm your spot" email.
// The place in line: score = seq − referrals × BOOST, lower is better, ties go to whoever joined first.
// The front of the line: get GOAL (3) friends on the list and you, and every friend who joined with your link, go ahead of everyone
// else (in the same order among yourselves).
// Brevo is told after the answer has gone (ctx.waitUntil), so a slow or failing Brevo never fails a sign-up.

import { confirmEmail, youreInEmail, macEmail, friendJoinedEmail } from "./emails.js";
export { confirmEmail, youreInEmail, inviteEmail, welcomeEmail, friendJoinedEmail } from "./emails.js";

const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";  // no 0/O, 1/I/L look-alikes
const CODE_LENGTH = 7;
const MAX_BODY = 8 * 1024;                                  // bytes; a sign-up is a few hundred
const BREVO = "https://api.brevo.com/v3";
const DEFAULT_ORIGINS = "https://askstudio.ai,https://www.askstudio.ai,https://evannicolini.github.io,http://127.0.0.1:*,http://localhost:*";
const RESYNC_BATCH = 20;                                    // rows per /admin/resync call (each is 1–2 Brevo calls)
const CODE_TTL = 600, LINK_TTL = 86400, RESEND_WAIT = 60, MAX_TRIES = 5;   // seconds, seconds, seconds, wrong codes per send
const MAILS_PER_HOUR = 5;                                   // confirmation emails to one address
const SENDER = { name: "Studio", email: "hello@askstudio.ai" };

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
// Only confirmed rows are in the line; referrals already count only confirmed friends.
const LINE = `WITH l AS (SELECT *, seq - referrals * ?1 AS score,
  CASE WHEN referrals >= ?2 OR referred_by IN (SELECT code FROM signups WHERE referrals >= ?2 AND confirmed_at IS NOT NULL) THEN 1 ELSE 0 END AS front
  FROM signups WHERE confirmed_at IS NOT NULL)`;
async function standing(env, row) {
  const boost = boostOf(env), goal = goalOf(env);
  const r = await env.DB.prepare(LINE + `, me AS (SELECT * FROM l WHERE seq = ?3)
    SELECT (SELECT COUNT(*) FROM l) AS total, me.front AS front,
      (SELECT COUNT(*) FROM l WHERE l.front > me.front OR (l.front = me.front AND (l.score < me.score OR (l.score = me.score AND l.seq < me.seq)))) AS ahead
    FROM me`).bind(boost, goal, row.seq).first();
  return { position: r.ahead + 1, total: r.total, boost, goal, front: !!r.front };
}
// priv: the answer goes to the person themselves (a new sign-up, a confirmation, their private link), so it carries their private
// pass link and last name. Never on /status or a repeat sign-up (anyone can type an email).
// invites: how many times they sent their link (POST /invited). pending: friends who signed up with it and haven't confirmed their
// email yet (they count once they do). friends (private answers only): each friend's first name, oldest first, and whether it counts.
async function answer(env, row, already, priv) {
  const s = await standing(env, row);
  const p = await env.DB.prepare("SELECT COUNT(*) AS n FROM signups WHERE referred_by = ? AND confirmed_at IS NULL").bind(row.code).first();
  const out = { ok: true, code: row.code, first: row.first, position: s.position, total: s.total, referrals: row.referrals, boost: s.boost, goal: s.goal, front: s.front,
    invites: row.invites || 0, pending: p ? p.n : 0, already };
  if (priv) {
    if (!row.pass_token) { row.pass_token = passToken(); await env.DB.prepare("UPDATE signups SET pass_token = ? WHERE seq = ? AND pass_token IS NULL").bind(row.pass_token, row.seq).run(); row = await bySeq(env, row.seq); }
    out.last = row.last; out.pass = row.pass_token;
    const { results } = await env.DB.prepare("SELECT first, confirmed_at FROM signups WHERE referred_by = ? ORDER BY confirmed_at IS NULL, COALESCE(confirmed_at, created_at), seq LIMIT 12").bind(row.code).all();
    out.friends = results.map((f) => ({ first: firstName(f.first), joined: !!f.confirmed_at }));
  }
  return out;
}
// A friend's first name as the inviter sees it (on the page and in an email): the first word, letters only, short. Never more.
export function firstName(v) {
  const w = String(v || "").trim().split(/\s+/)[0] || "";
  return w.replace(/[^\p{L}\p{M}'’-]/gu, "").slice(0, 20);
}
function passToken() { return [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, "0")).join(""); }
const confirmOn = (env) => env.CONFIRM_EMAIL === "1";   // email confirmation: on once Brevo can send it (until then a sign-up counts at once)
const bySeq = (env, seq) => env.DB.prepare("SELECT * FROM signups WHERE seq = ?").bind(seq).first();
const recount = (env, code) => env.DB.prepare("UPDATE signups SET referrals = (SELECT COUNT(*) FROM signups WHERE referred_by = ?1 AND confirmed_at IS NOT NULL) WHERE code = ?1").bind(code).run();

// ------------------------------------------------------------------------------------------------ POST /join
async function rateOk(env, who, win = int(env.RATE_WINDOW, 600), max = int(env.RATE_LIMIT, 10)) {
  const t = now();
  await env.DB.prepare("DELETE FROM hits WHERE at <= ?").bind(t - Math.max(win, 3600)).run();
  const r = await env.DB.prepare("SELECT COUNT(*) AS n FROM hits WHERE who = ? AND at > ?").bind(who, t - win).first();
  if (r.n >= max) return false;
  await env.DB.prepare("INSERT INTO hits (who, at) VALUES (?, ?)").bind(who, t).run();
  return true;
}

// Where their work lives, cleaned the way the page does it (src/sections/900-early): a handle with no @, link or trailing slash,
// letters, numbers, periods and underscores; a website as https://host/path (brand.com is taken as https://brand.com).
// Anything that can't be one is dropped, never refused: both are optional.
export function igHandle(v) {
  let h = typeof v === "string" ? v.trim().slice(0, 200) : "";
  const m = h.match(/^(?:https?:\/\/)?(?:www\.|m\.)?(?:instagram\.com|instagr\.am)\/(?:_u\/)?([^/?#\s]+)/i);
  if (m) h = m[1];
  h = h.replace(/^@+/, "").replace(/\/+$/, "").toLowerCase();
  return /^(?!.*\.\.)(?!.*\.$)[a-z0-9._]{1,30}$/.test(h) ? h : "";
}
export function siteUrl(v) {
  let s = typeof v === "string" ? v.trim().slice(0, 400) : "";
  if (!s) return "";
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) s = "https://" + s.replace(/^\/+/, "");
  try {
    const u = new URL(s), h = u.hostname.toLowerCase();
    if (!/^https?:$/.test(u.protocol) || u.username || u.password || !/^([a-z0-9-]+\.)+([a-z]{2,}|xn--[a-z0-9-]+)$/.test(h)) return "";
    const out = u.protocol + "//" + h + (u.port ? ":" + u.port : "") + (u.pathname === "/" ? "" : u.pathname.replace(/\/+$/, "")) + u.search;
    return out.length <= 200 ? out : "";
  } catch { return ""; }
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
  const f = {
    email, first, last, phone, cc, sms: e164(phone, cc), roles,
    brands: text(b.brands, 300), claude: text(b.claude, 120), source: text(b.source, 120), ref: cleanCode(b.ref),
    instagram: igHandle(b.instagram), website: siteUrl(b.website),
    smsVersion: text(b.sms_consent_version, 40), terms: text(b.terms_version, 40),
  };
  // Two separate opt-ins, each kept only with a number that can take texts. The one v1 box (sms_consent) covered both.
  const can = !!e164(phone, cc), v1 = b.sms_consent === true;
  f.notify = can && (b.sms_notify === true || v1);
  f.marketing = can && (b.sms_marketing === true || v1);
  f.notifyText = text(b.sms_notify_text, 1000) || (v1 ? text(b.sms_consent_text, 1000) : "");
  f.marketingText = text(b.sms_marketing_text, 1000) || (v1 ? text(b.sms_consent_text, 1000) : "");
  f.smsOk = f.notify || f.marketing;
  f.smsText = v1 ? text(b.sms_consent_text, 1000) : [f.notify ? f.notifyText : "", f.marketing ? f.marketingText : ""].filter(Boolean).join(" | ");
  return f;
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
    return json({ ok: true, needs_confirm: true, email: text(b.email, 300).toLowerCase(), first: text(b.first, 80), sent: true, resend_in: RESEND_WAIT });
  }
  const f = readForm(b);
  if (f.error) return fail(f.error);
  const t = now(), ua = text(request.headers.get("User-Agent") || "", 300);
  const cip = text(request.headers.get("CF-Connecting-IP") || "", 64), ccountry = text(request.headers.get("CF-IPCountry") || "", 8);   // kept only with a consent

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
             sms_consent, sms_consent_at, sms_consent_text, sms_consent_version, terms_version, user_agent, consent_ip, consent_country,
             sms_notify, sms_notify_at, sms_notify_text, sms_marketing, sms_marketing_at, sms_marketing_text, pass_token, instagram, website)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(email) DO NOTHING`
        ).bind(f.email, f.first, f.last, f.phone, f.cc, f.sms, f.roles, f.brands, f.claude, f.source, newCode(), referrer ? referrer.code : null, who, t, t,
          f.smsOk ? 1 : 0, f.smsOk ? t : null, f.smsOk ? f.smsText : null, f.smsOk ? f.smsVersion : null, f.terms || null, ua, f.smsOk ? cip : null, f.smsOk ? ccountry : null,
          f.notify ? 1 : 0, f.notify ? t : null, f.notify ? f.notifyText : null, f.marketing ? 1 : 0, f.marketing ? t : null, f.marketing ? f.marketingText : null, passToken(),
          f.instagram || null, f.website || null).run();
        if (r.meta.changes) added = await bySeq(env, r.meta.last_row_id);
        else raced = true;                                             // the same email landed a moment ago: update it below
      } catch (e) {
        if (!/UNIQUE.*signups\.code/i.test(String((e && e.message) || e))) throw e;   // a code already taken: draw again
      }
    }
    if (added && !confirmOn(env)) return await confirmRow(env, ctx, added, "unverified", true);   // confirmation off: it counts now
    if (added) return json(await pending(env, added, await sendCode(env, added)));   // the referrer's count goes up on confirm
    if (!raced) throw new Error("six referral codes in a row were taken");
    row = await env.DB.prepare("SELECT * FROM signups WHERE email = ?").bind(f.email).first();
  }

  // The same email again: new details, the same place, code and referrer. A ref on a second sign-up counts for nothing.
  const keepPhone = !f.phone;
  await env.DB.prepare(
    `UPDATE signups SET first = ?, last = ?, phone = ?, cc = ?, sms = ?, roles = ?, brands = ?, claude = ?, source = ?, instagram = ?, website = ?,
     brevo_synced = 0, updated_at = ? WHERE seq = ?`
  ).bind(f.first, f.last, keepPhone ? row.phone : f.phone, keepPhone ? row.cc : f.cc, keepPhone ? row.sms : f.sms,
    f.roles || row.roles, f.brands || row.brands, f.claude || row.claude, f.source || row.source, f.instagram || row.instagram || null, f.website || row.website || null,
    Math.max(t, row.updated_at + 1), row.seq).run();   // a blank Instagram or website on a repeat sign-up keeps the one we had
  // A new tick is recorded with its own time and words; an unticked box on a repeat sign-up is not an opt-out (STOP is).
  if (f.smsOk) await env.DB.prepare("UPDATE signups SET sms_consent = 1, sms_consent_at = ?, sms_consent_text = ?, sms_consent_version = ?, user_agent = ?, consent_ip = ?, consent_country = ? WHERE seq = ?")
    .bind(t, f.smsText, f.smsVersion, ua, cip, ccountry, row.seq).run();
  if (f.notify) await env.DB.prepare("UPDATE signups SET sms_notify = 1, sms_notify_at = ?, sms_notify_text = ? WHERE seq = ?").bind(t, f.notifyText, row.seq).run();
  if (f.marketing) await env.DB.prepare("UPDATE signups SET sms_marketing = 1, sms_marketing_at = ?, sms_marketing_text = ? WHERE seq = ?").bind(t, f.marketingText, row.seq).run();
  if (f.terms) await env.DB.prepare("UPDATE signups SET terms_version = ? WHERE seq = ?").bind(f.terms, row.seq).run();
  row = await bySeq(env, row.seq);
  if (!row.confirmed_at && !confirmOn(env)) return await confirmRow(env, ctx, row, "unverified", false);
  if (!row.confirmed_at) {
    const wait = waitLeft(row);
    return json(await pending(env, row, wait ? { sent: false, resend_in: wait } : await sendCode(env, row)));
  }
  later(ctx, afterJoin(env, row.seq, null));
  return json(await answer(env, row, true));
}

// ------------------------------------------------------------------------------------------------ confirmation
const waitLeft = (row) => (row.confirm_sent_at ? Math.max(0, row.confirm_sent_at + RESEND_WAIT - now()) : 0);
function sixDigits() {
  for (;;) { const [n] = crypto.getRandomValues(new Uint32Array(1)); if (n < 4294000000) return String(n % 1000000).padStart(6, "0"); }   // no bias
}
function linkToken() {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
const codeHash = (seq, code) => sha("studio-confirm:" + seq + ":" + code);
const tokenHash = (token) => sha("studio-link:" + token);
const siteOf = (env) => String(env.SITE || "https://askstudio.ai").replace(/\/+$/, "");

async function pending(env, row, sent) {
  const out = { ok: true, needs_confirm: true, email: row.email, first: row.first, sent: !!sent.sent, resend_in: sent.resend_in };
  if (sent.capped) out.capped = true;
  if (env.DEV_ECHO === "1" && sent.dev) Object.assign(out, sent.dev);   // worker/dev.mjs only: the code on screen, no inbox needed
  return out;
}

// A new code and link for this row, and the email that carries them. { sent, resend_in, capped?, dev? }
async function sendCode(env, row) {
  const mailKey = "mail:" + (await sha("studio-mail:" + row.email)).slice(0, 24);
  if (!(await rateOk(env, mailKey, 3600, MAILS_PER_HOUR))) return { sent: false, capped: true, resend_in: RESEND_WAIT };
  const t = now(), code = sixDigits(), token = linkToken();
  await env.DB.prepare(`UPDATE signups SET confirm_code_hash = ?, confirm_token_hash = ?, confirm_expires = ?, confirm_link_expires = ?,
     confirm_sent_at = ?, confirm_tries = 0 WHERE seq = ?`).bind(await codeHash(row.seq, code), await tokenHash(token), t + CODE_TTL, t + LINK_TTL, t, row.seq).run();
  const link = siteOf(env) + "/?confirm=" + token + "#early-access";
  let ok = false;
  if (env.BREVO_API_KEY) {
    const mail = confirmEmail(row.first, code, link);
    const r = await brevo(env, "POST", "/smtp/email", {
      sender: SENDER, to: [{ email: row.email, name: (row.first + " " + row.last).trim() }], subject: mail.subject,
      htmlContent: mail.html, textContent: mail.text, tags: ["waitlist-confirm"],
    });
    ok = r.ok;
    if (!ok) {
      console.error("confirm email", r.detail);
      await env.DB.prepare("UPDATE signups SET confirm_sent_at = NULL WHERE seq = ?").bind(row.seq).run();   // let them try again now
    }
  }
  return { sent: ok, resend_in: ok ? RESEND_WAIT : 0, dev: { dev_code: code, dev_token: token } };
}

// Confirmed: a place in line, the referrer's count, Brevo. Only the first confirmation does anything.
async function confirmRow(env, ctx, row, via, priv = true) {
  const t = now();
  const r = await env.DB.prepare(`UPDATE signups SET confirmed_at = ?, confirmed_via = ?, confirm_code_hash = NULL, confirm_tries = 0,
     brevo_synced = 0, updated_at = ? WHERE seq = ? AND confirmed_at IS NULL`).bind(t, via, Math.max(t, row.updated_at + 1), row.seq).run();
  let referrer = null;
  if (r.meta.changes && row.referred_by) {
    referrer = await env.DB.prepare("SELECT seq, code FROM signups WHERE code = ?").bind(row.referred_by).first();
    if (referrer) await recount(env, referrer.code);   // counted from the rows themselves, so one email can never count twice
  }
  if (r.meta.changes) later(ctx, afterJoin(env, row.seq, referrer && referrer.seq).then(() => (env.SEND_YOURE_IN === "1" ? sendYoureIn(env, row.seq) : null)));
  if (r.meta.changes && referrer && env.SEND_FRIEND_JOINED !== "0") later(ctx, sendFriendJoined(env, referrer.seq, row.seq));
  return json(await answer(env, await bySeq(env, row.seq), !r.meta.changes, priv));
}

// "You're in": Evan's plain note, once, right after confirming. Off until the lead switches it on (SEND_YOURE_IN = "1").
async function sendYoureIn(env, seq) {
  if (!env.BREVO_API_KEY) return;
  const row = await bySeq(env, seq);
  if (!row || !row.confirmed_at) return;
  const s = await standing(env, row), place = s.front ? s.position : s.position + int(env.COUNT_OFFSET, 0);   // the place the page shows
  if (!row.pass_token) await answer(env, row, true, true);   // makes the private link if this row predates it
  const fresh = await bySeq(env, seq);
  const mail = youreInEmail(row.first, place, siteOf(env) + "/?ref=" + encodeURIComponent(row.code) + "#early-access", siteOf(env) + "/?pass=" + fresh.pass_token);
  const r = await brevo(env, "POST", "/smtp/email", { sender: mail.sender, replyTo: mail.replyTo, to: [{ email: row.email, name: (row.first + " " + row.last).trim() }],
    subject: mail.subject, htmlContent: mail.html, textContent: mail.text, tags: ["waitlist-youre-in"] });
  if (!r.ok) console.error("you're in email", r.detail);
}

// "A friend joined": to the inviter, the moment a friend who used their link confirms. Their friend's first name, how many of GOAL,
// and the private pass link. At most 6 a day to one person (a popular link stops emailing, the pass still shows everyone).
async function sendFriendJoined(env, referrerSeq, friendSeq) {
  if (!env.BREVO_API_KEY) return;
  const [ref, friend] = await Promise.all([bySeq(env, referrerSeq), bySeq(env, friendSeq)]);
  if (!ref || !ref.confirmed_at || !friend) return;
  if (!(await rateOk(env, "fj:" + ref.seq, 86400, int(env.FRIEND_MAILS_PER_DAY, 6)))) return;
  if (!ref.pass_token) await answer(env, ref, true, true);
  const fresh = await bySeq(env, referrerSeq), s = await standing(env, fresh);
  const mail = friendJoinedEmail(ref.first, firstName(friend.first), fresh.referrals, s.goal, s.front, siteOf(env) + "/?pass=" + fresh.pass_token);
  const r = await brevo(env, "POST", "/smtp/email", { sender: SENDER, to: [{ email: ref.email, name: (ref.first + " " + ref.last).trim() }],
    subject: mail.subject, htmlContent: mail.html, textContent: mail.text, tags: ["waitlist-friend-joined"] });
  if (!r.ok) console.error("friend joined email", r.detail);
}

async function confirm(request, env, ctx) {
  const b = await body(request);
  if (b.error) return fail(b.error);
  const who = await ipKey(request);
  if (!(await rateOk(env, "confirm:" + who, 600, int(env.CONFIRM_LIMIT, 30)))) return fail("Too many tries from here. Try again in a few minutes.", 429);
  const token = typeof b.token === "string" ? b.token.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64) : "";
  if (token) {
    const row = await env.DB.prepare("SELECT * FROM signups WHERE confirm_token_hash = ?").bind(await tokenHash(token)).first();
    if (!row || (!row.confirmed_at && !(row.confirm_link_expires > now()))) return json({ ok: false, expired: true, error: "That link has expired. Sign up again and we'll send a new one." }, 410);
    return await confirmRow(env, ctx, row, "link");
  }
  const email = text(b.email, 300).toLowerCase(), code = String(typeof b.code === "string" || typeof b.code === "number" ? b.code : "").replace(/\D/g, "");
  if (code.length !== 6) return fail("Enter the 6-digit code from the email.");
  const row = email ? await env.DB.prepare("SELECT * FROM signups WHERE email = ?").bind(email).first() : null;
  if (!row) return fail("That code isn't right.");
  if (row.confirmed_at) return json(await answer(env, row, true, true));
  if (!row.confirm_code_hash || !(row.confirm_expires > now())) return json({ ok: false, expired: true, error: "That code has expired. Send a new one." }, 410);
  if (row.confirm_tries >= MAX_TRIES) return json({ ok: false, expired: true, error: "Too many tries. Send a new code." }, 429);
  if (!same(await codeHash(row.seq, code), row.confirm_code_hash)) {
    await env.DB.prepare("UPDATE signups SET confirm_tries = confirm_tries + 1 WHERE seq = ?").bind(row.seq).run();
    const left = MAX_TRIES - row.confirm_tries - 1;
    return json({ ok: false, tries_left: left, expired: left <= 0, error: left > 0 ? "That code isn't right." : "Too many tries. Send a new code." }, 400);
  }
  return await confirmRow(env, ctx, row, "code");
}

async function resend(request, env) {
  const b = await body(request);
  if (b.error) return fail(b.error);
  if (!(await rateOk(env, "resend:" + (await ipKey(request)), 600, int(env.RESEND_LIMIT, 10)))) return fail("Too many emails from here. Try again in a few minutes.", 429);
  const email = text(b.email, 300).toLowerCase();
  const row = email ? await env.DB.prepare("SELECT * FROM signups WHERE email = ?").bind(email).first() : null;
  if (!row) return json({ ok: true, sent: true, resend_in: RESEND_WAIT });    // the same answer as a real send: no list lookups
  if (row.confirmed_at) return json({ ok: true, sent: false, confirmed: true, resend_in: 0 });
  const wait = waitLeft(row);
  if (wait) return json({ ok: false, error: "Wait a moment before sending another.", resend_in: wait }, 429);
  return json(await pending(env, row, await sendCode(env, row)));
}

const ipKey = async (request) => (await sha("studio-waitlist:" + (request.headers.get("CF-Connecting-IP") || "local"))).slice(0, 24);
async function body(request) {
  if (int(request.headers.get("Content-Length"), 0) > MAX_BODY) return { error: "That is more than this needs." };
  const raw = await request.text();
  if (te.encode(raw).length > MAX_BODY) return { error: "That is more than this needs." };
  try { const b = JSON.parse(raw); if (b && typeof b === "object" && !Array.isArray(b)) return b; } catch {}
  return { error: "That did not arrive as JSON. Try again." };
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
  if (!row || !row.confirmed_at) return json({ ok: false, error: "We don't know that code." }, 404);
  return json(await answer(env, row, true));
}

// ------------------------------------------------------------------------------------------------ GET /pass
async function passView(request, url, env) {
  if (!(await rateOk(env, "pass:" + (await ipKey(request)), 600, 60))) return fail("Too many tries from here. Try again in a few minutes.", 429);
  const t = String(url.searchParams.get("t") || "").toLowerCase().replace(/[^0-9a-f]/g, "").slice(0, 64);
  if (t.length < 32) return json({ ok: false, error: "That link isn't right." }, 404);
  const row = await env.DB.prepare("SELECT * FROM signups WHERE pass_token = ?").bind(t).first();
  if (!row || !row.confirmed_at) return json({ ok: false, error: "That link isn't right." }, 404);
  return json(await answer(env, row, true, true));
}

// ------------------------------------------------------------------------------------------------ POST /invited
// One more invite sent, from the page (Text a friend, Copy link, Share). The pass token is the proof, so only the person can count
// their own. At most 50, and 30 calls per address per 10 minutes.
async function invited(request, env) {
  const b = await body(request);
  if (b.error) return fail(b.error);
  if (!(await rateOk(env, "inv:" + (await ipKey(request)), 600, 30))) return fail("Too many tries from here. Try again in a few minutes.", 429);
  const t = String(typeof b.t === "string" ? b.t : "").toLowerCase().replace(/[^0-9a-f]/g, "").slice(0, 64);
  if (t.length < 32) return json({ ok: false, error: "That link isn't right." }, 404);
  const row = await env.DB.prepare("SELECT seq, invites, confirmed_at FROM signups WHERE pass_token = ?").bind(t).first();
  if (!row || !row.confirmed_at) return json({ ok: false, error: "That link isn't right." }, 404);
  await env.DB.prepare("UPDATE signups SET invites = MIN(50, invites + 1), invited_at = ? WHERE seq = ?").bind(now(), row.seq).run();
  return json({ ok: true, invites: Math.min(50, (row.invites || 0) + 1) });
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
  if (!row || !row.confirmed_at) return false;            // an unconfirmed email never reaches the list
  const { position } = await standing(env, row);
  const attributes = {
    FIRSTNAME: row.first, LASTNAME: row.last, ROLE: row.roles, BRANDS: row.brands, CLAUDE: row.claude, SOURCE: row.source,
    REF_CODE: row.code, REFERRED_BY: row.referred_by || "", REFERRALS: row.referrals, POSITION: position,
    PHONE: row.sms || row.phone || "", SMS_CONSENT: !!row.sms_consent,
    SMS_CONSENT_AT: row.sms_consent_at ? new Date(row.sms_consent_at * 1000).toISOString() : "",
    SMS_CONSENT_TEXT: row.sms_consent ? (row.sms_consent_version ? "[" + row.sms_consent_version + "] " : "") + (row.sms_consent_text || "") : "",
    SMS_NOTIFY: !!row.sms_notify, SMS_NOTIFY_AT: row.sms_notify_at ? new Date(row.sms_notify_at * 1000).toISOString() : "",
    SMS_MARKETING: !!row.sms_marketing, SMS_MARKETING_AT: row.sms_marketing_at ? new Date(row.sms_marketing_at * 1000).toISOString() : "",
    EMAIL_CONFIRMED: row.confirmed_via === "code" || row.confirmed_via === "link",   // 'legacy' rows joined before confirmation: false
    INSTAGRAM: row.instagram || "", WEBSITE: row.website || "",   // where their work lives (the brands step); Brevo fields made by /admin/brevo-setup (Evan's yes, 2026-11-22)
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
    const { results } = await env.DB.prepare("SELECT seq FROM signups WHERE referred_by = ? AND confirmed_at IS NOT NULL").bind(row.code).all();
    await Promise.all(results.map((f) => pushPosition(env, f.seq)));
  }
  await pushPosition(env, seq);
}
async function pushPosition(env, seq) {
  const row = await bySeq(env, seq);
  if (!row || !row.confirmed_at) return;
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
    ? (await env.DB.prepare("SELECT seq FROM signups WHERE seq >= ? AND confirmed_at IS NOT NULL ORDER BY seq LIMIT ?").bind(int(url.searchParams.get("from"), 0), limit).all()).results
    : (await env.DB.prepare("SELECT seq FROM signups WHERE brevo_synced = 0 AND confirmed_at IS NOT NULL ORDER BY seq LIMIT ?").bind(limit).all()).results;
  let synced = 0;
  for (const { seq } of rows) if (await pushContact(env, seq)) synced++;
  const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM signups WHERE brevo_synced = 0 AND confirmed_at IS NOT NULL").first();
  const out = { ok: true, tried: rows.length, synced, failed: rows.length - synced, unsynced: n };
  if (all) out.next = rows.length === limit ? rows[rows.length - 1].seq + 1 : null;
  return json(out);
}

// Make the contact fields the sign-up writes, if Brevo doesn't have them yet (the key's own account).
const ATTRS = { ROLE: "text", BRANDS: "text", CLAUDE: "text", SOURCE: "text", REF_CODE: "text", REFERRED_BY: "text", REFERRALS: "float", POSITION: "float",
  PHONE: "text", SMS_CONSENT: "boolean", SMS_CONSENT_AT: "text", SMS_CONSENT_TEXT: "text",
  SMS_NOTIFY: "boolean", SMS_NOTIFY_AT: "text", SMS_MARKETING: "boolean", SMS_MARKETING_AT: "text", EMAIL_CONFIRMED: "boolean", FIRST_MAKE: "text", DREAM: "text", DREAM_AT: "text", INSTAGRAM: "text", WEBSITE: "text" };   // DREAM / DREAM_AT: the dream interview's answer (Evan's yes, 2026-11-21)
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

// Which Brevo account the key is, and whether it may send as hello@askstudio.ai. Reads only.
async function brevoCheck(env) {
  if (!env.BREVO_API_KEY) return fail("Brevo is not set up yet (the BREVO_API_KEY secret).");
  const get = async (path) => {
    const res = await fetch(BREVO + path, { headers: { "api-key": String(env.BREVO_API_KEY), Accept: "application/json" } });
    return res.ok ? res.json() : { error: res.status };
  };
  const [account, senders, domains] = await Promise.all([get("/account"), get("/senders"), get("/senders/domains")]);
  return json({
    ok: true, account: account.error ? account : { company: account.companyName, enterprise: account.enterprise, plan: account.plan },
    senders: (senders.senders || []).map((x) => ({ email: x.email, name: x.name, active: x.active })),
    domains: (domains.domains || []).map((d) => ({ domain: d.domain_name, authenticated: d.authenticated, verified: d.verified })),
    sender_ready: (senders.senders || []).some((x) => x.email === SENDER.email && x.active) || (domains.domains || []).some((d) => d.domain_name === "askstudio.ai" && d.authenticated),
  });
}

// One contact's fields in Brevo (to check a sign-up's answers landed). Reads only.
async function brevoContact(url, env) {
  if (!env.BREVO_API_KEY) return fail("Brevo is not set up yet (the BREVO_API_KEY secret).");
  const email = String(url.searchParams.get("email") || "").trim().toLowerCase();
  if (!email) return fail("Add ?email=.");
  const res = await fetch(BREVO + "/contacts/" + encodeURIComponent(email), { headers: { "api-key": String(env.BREVO_API_KEY), Accept: "application/json" } });
  if (res.status === 404) return json({ ok: true, found: false });
  if (!res.ok) return fail("Brevo said " + res.status + ".", 502);
  const c = await res.json();
  return json({ ok: true, found: true, email: c.email, attributes: c.attributes || {}, lists: c.listIds || [] });
}

// What Brevo did with the emails to one address (sent, delivered, bounced…), newest first. Reads only.
async function mailEvents(url, env) {
  if (!env.BREVO_API_KEY) return fail("Brevo is not set up yet (the BREVO_API_KEY secret).");
  const email = text(url.searchParams.get("email"), 300).toLowerCase();
  if (!EMAIL.test(email)) return fail("Add ?email=.");
  const res = await fetch(BREVO + "/smtp/statistics/events?limit=20&sort=desc&email=" + encodeURIComponent(email), { headers: { "api-key": String(env.BREVO_API_KEY), Accept: "application/json" } });
  if (!res.ok) return fail("Brevo said " + res.status + ".", 502);
  const j = await res.json();
  return json({ ok: true, events: (j.events || []).map((e) => ({ event: e.event, date: e.date, subject: e.subject, from: e.from, reason: e.reason || "" })) });
}

function csvCell(v) {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^\+?[\d ()-]+$/.test(s)) s = "'" + s;   // keep spreadsheets from running a cell as a formula
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
const COLUMNS = ["seq", "position", "front", "joined", "confirmed_at", "confirmed_via", "email", "first", "last", "phone", "cc", "sms", "sms_consent", "sms_consent_at", "sms_consent_version", "sms_notify", "sms_notify_at", "sms_marketing", "sms_marketing_at", "consent_ip", "consent_country", "terms_version", "roles", "brands", "claude", "instagram", "website", "source",
  "code", "referred_by", "referrals", "ip", "brevo_synced", "brevo_error"];
async function exportCsv(env) {
  const { results } = await env.DB.prepare(
    LINE + `, p AS (SELECT seq, front, ROW_NUMBER() OVER (ORDER BY front DESC, score, seq) AS position FROM l)
      SELECT s.*, p.position, p.front FROM signups s LEFT JOIN p ON p.seq = s.seq ORDER BY s.seq`
  ).bind(boostOf(env), goalOf(env)).all();
  const iso = (t) => (t ? new Date(t * 1000).toISOString().slice(0, 19) + "Z" : "");
  const lines = [COLUMNS.join(",")];
  for (const r of results) {
    r.joined = iso(r.created_at);
    r.confirmed_at = iso(r.confirmed_at);
    lines.push(COLUMNS.map((c) => csvCell(r[c])).join(","));
  }
  return new Response(lines.join("\r\n") + "\r\n", {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="studio-waitlist.csv"', "Cache-Control": "no-store" },
  });
}

// ------------------------------------------------------------------------------------------------ routes
// ---------- the website sign-up (askstudio.ai/start/): its answers, and the "Get Studio on your Mac" email ----------
// The page has a Supabase session (the person signed in with their email code). Both endpoints take its access token and ask Supabase
// who it is (GET /auth/v1/user with the public key): nothing here trusts an email the page sends.
const SUPABASE = "https://nxbnmwxyocbqcjwzxtxi.supabase.co", SUPABASE_KEY = "sb_publishable_LRI7yb4xTKyN5VehjqxQuQ_vuSVY7Hk";   // public, made for browsers
async function supaUser(env, token) {
  token = text(token, 4000); if (!token) return null;
  try {
    const r = await fetch((env.SUPABASE_URL || SUPABASE) + "/auth/v1/user", { headers: { apikey: env.SUPABASE_KEY || SUPABASE_KEY, Authorization: "Bearer " + token } });
    if (!r.ok) return null;
    const u = await r.json(); if (!u || !u.email) return null;
    const md = u.user_metadata || {};
    return { email: String(u.email).toLowerCase(), first: text(md.first_name || md.given_name || md.name || "", 80).split(/\s+/)[0] };
  } catch { return null; }
}
const PICK = { roles: ["Founder", "Business owner", "Creator", "Video editor", "Agency", "Social media manager", "Marketer", "Something else"], brands: ["1", "2-3", "4+"], claude: ["Pro or Max", "Free plan", "Not yet"], make: ["Ads", "Reels", "Launch films", "Carousels", "Something else"] };
const pick = (v, list, many) => { const a = (Array.isArray(v) ? v : [v]).map((x) => text(x, 60)).filter((x) => list.includes(x)); return many ? [...new Set(a)] : a[0] || ""; };
async function signupProfile(request, env) {
  const b = await body(request); if (!b) return fail("Send JSON.");
  const u = await supaUser(env, b.access_token); if (!u) return fail("Sign in again.", 401);
  if (!(await rateOk(env, "prof:" + (await sha(u.email)).slice(0, 24), 3600, 20))) return fail("Too many tries. Wait a little.", 429);
  const roles = pick(b.roles, PICK.roles, true), brands = pick(b.brands, PICK.brands), claude = pick(b.claude, PICK.claude), make = pick(b.first_make, PICK.make, true);
  if (!env.BREVO_API_KEY) return json({ ok: true, brevo: false });
  const attributes = { FIRSTNAME: u.first, ROLE: roles.join(", "), BRANDS: brands, CLAUDE: claude, FIRST_MAKE: make.join(", "), SOURCE: "signup" };   // FIRST_MAKE made by /admin/brevo-setup (Evan, 2026-11-21)
  const r = await brevo(env, "POST", "/contacts", { email: u.email, attributes, updateEnabled: true });
  if (!r.ok) console.error("signup profile", r.detail);
  return json({ ok: true, brevo: r.ok });
}
async function macLink(request, env) {
  const b = await body(request); if (!b) return fail("Send JSON.");
  const u = await supaUser(env, b.access_token); if (!u) return fail("Sign in again.", 401);
  if (!(await rateOk(env, "mac:" + (await sha(u.email)).slice(0, 24), 3600, 3))) return fail("We already sent it. Check your email.", 429);
  const link = siteOf(env) + "/start/?mac";
  if (!env.BREVO_API_KEY) return json({ ok: true, sent: false, link });
  const mail = macEmail(u.first, link);
  const r = await brevo(env, "POST", "/smtp/email", { sender: SENDER, to: [{ email: u.email, name: u.first || u.email }], subject: mail.subject, htmlContent: mail.html, textContent: mail.text, tags: ["signup-mac-link"] });
  if (!r.ok) console.error("mac link email", r.detail);
  return json({ ok: true, sent: r.ok, link });
}

async function route(request, url, env, ctx) {
  const path = url.pathname, m = request.method;
  if (path === "/join") return m === "POST" ? await join(request, env, ctx) : fail("Use POST.", 405);
  if (path === "/confirm") return m === "POST" ? await confirm(request, env, ctx) : fail("Use POST.", 405);
  if (path === "/signup/profile") return m === "POST" ? await signupProfile(request, env) : fail("Use POST.", 405);
  if (path === "/signup/mac-link") return m === "POST" ? await macLink(request, env) : fail("Use POST.", 405);
  if (path === "/resend") return m === "POST" ? await resend(request, env) : fail("Use POST.", 405);
  if (path === "/status") return m === "GET" ? await status(url, env) : fail("Use GET.", 405);
  if (path === "/pass") return m === "GET" ? await passView(request, url, env) : fail("Use GET.", 405);
  if (path === "/invited") return m === "POST" ? await invited(request, env) : fail("Use POST.", 405);
  if (path === "/count") {
    if (m !== "GET") return fail("Use GET.", 405);
    const r = await env.DB.prepare("SELECT COUNT(*) AS n FROM signups WHERE confirmed_at IS NOT NULL").first();
    return json({ ok: true, total: r.n }, 200, { "Cache-Control": "public, max-age=15" });
  }
  if (path === "/health") return json({ ok: true });
  if (path.startsWith("/admin/")) {
    if (!isAdmin(request, env)) return fail("Not allowed.", 401);
    if (path === "/admin/resync" && m === "POST") return await resync(url, env);
    if (path === "/admin/export.csv" && m === "GET") return await exportCsv(env);
    if (path === "/admin/brevo-setup" && m === "POST") return await brevoSetup(env);
    if (path === "/admin/brevo-check" && m === "GET") return await brevoCheck(env);
    if (path === "/admin/brevo-contact" && m === "GET") return await brevoContact(url, env);
    if (path === "/admin/mail-events" && m === "GET") return await mailEvents(url, env);
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
