// "Your dream outcome": Kayla's voice interview, the server side (sign-up and waitlist).
//
// Never lose a word:
//   - The page streams 16 kHz PCM to GET /dream/listen (a WebSocket). This Worker pipes it to Deepgram Nova-3 on Workers AI and
//     sends the words back as they come (interim, then final). Every final phrase is INSERTED into dream_parts the moment it
//     arrives, before the page hears about it, with its place on the answer's own audio clock (t0..t1).
//   - If the stream drops (network, a crash, a lost mic), the page still holds the audio it sent, in memory only. It asks
//     POST /dream/chunk to transcribe whatever stretch no saved phrase covers yet (Whisper large-v3-turbo). The server checks the
//     coverage again and transcribes only what is truly missing, so a late phrase and a repair never both count.
//   - Edits and typing are saved as they happen (POST /dream/save). The answer is their edit plus every phrase they hadn't seen
//     when they edited (by part id), so a phrase that lands late is appended, never dropped.
//   - No audio is kept: it passes through to the model and is gone.
//
//   POST /dream/start   { id?, kind: "signup"|"waitlist", access_token? }  → the answer so far (made if new; restored if not)
//   GET  /dream/listen  ?id=&base=  WebSocket. In: binary PCM16 16 kHz mono, and {"type":"stop"}. Out: ready, interim, final, limit, closed, error
//   POST /dream/chunk   ?id=&t0=&t1=  body: raw PCM16 16 kHz mono (≤ 30 s) → the phrases it added
//   POST /dream/save    { id, edited, seen, nudged }
//   POST /dream/finish  { id, text, seen, nudged, access_token? }  → final; Brevo DREAM / DREAM_AT
//   GET  /admin/dreams.csv
export const LIMIT = 180;          // the page's limit: 3:00 of listening
export const CAP = 215;            // the server's own hard stop (a little room for the round after the nudge)
const SR = 16000, BPS = SR * 2;    // samples and bytes per second (PCM16 mono)
const NOVA = "@cf/deepgram/nova-3", WHISPER = "@cf/openai/whisper-large-v3-turbo";
const MAX_CHUNK = 31 * BPS, MAX_TEXT = 6000;
const r3 = (n) => Math.round(n * 1000) / 1000;

// The answer's words: every phrase in clock order; a phrase mostly covered by one before it (a repair of a stretch a late
// phrase already filled) is left out; a word repeated exactly at a seam between two phrases is said once. Then: their edit,
// plus the phrases they hadn't seen. The page runs the same function (src/interview.js).
const bare = (w) => String(w || "").toLowerCase().replace(/[^\p{L}\p{N}']/gu, "");
export function join(texts) {
  let out = "";
  for (const t0 of texts) {
    let t = String(t0 || "").trim(); if (!t) continue;
    if (out) { const last = out.split(/\s+/).pop(), first = t.split(/\s+/)[0]; if (bare(last) && bare(last) === bare(first)) t = t.split(/\s+/).slice(1).join(" "); }
    out = out ? (t ? out + " " + t : out) : t;
  }
  return out.replace(/\s+/g, " ").trim();
}
export function stitch(parts, edited, seen) {
  const ps = parts.slice().sort((a, b) => a.t0 - b.t0 || (a.src === "nova" ? -1 : 1) || a.id - b.id), acc = [];
  for (const p of ps) {
    const len = Math.max(0.01, p.t1 - p.t0);
    let cov = 0;
    for (const a of acc) cov += Math.max(0, Math.min(a.t1, p.t1) - Math.max(a.t0, p.t0));
    if (cov / len > 0.5) continue;
    acc.push(p);
  }
  const had = new Set(seen || []);
  const said = join(acc.filter((p) => p.text && (edited == null || !had.has(p.id))).map((p) => p.text));
  const base = edited == null ? "" : String(edited).trim();
  return base && said ? base + " " + said : base || said;
}
export const wordsOf = (s) => (String(s || "").match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).length;

// What each phrase really covers: a live phrase that nothing follows (the last before a break) only up to the end of its last whole
// word, so a word the break cut in half is heard again in full by the repair.
export function covers(parts) {
  return parts.map((p) => {
    if (p.src !== "nova" || p.w1 == null || !(p.w1 < p.t1)) return p;
    const followed = parts.some((q) => q !== p && q.t0 >= p.t1 - 0.05 && q.t0 <= p.t1 + 0.3);
    return followed ? p : { ...p, t1: p.w1 };
  });
}
// Stretches of t0..t1 no saved phrase covers, at least min seconds long.
export function gaps(parts, t0, t1, min = 0.35) {
  const cov = covers(parts).map((p) => [Math.max(t0, p.t0), Math.min(t1, p.t1)]).filter(([a, b]) => b > a).sort((x, y) => x[0] - y[0]);
  const out = []; let at = t0;
  for (const [a, b] of cov) { if (a - at >= min) out.push([at, a]); at = Math.max(at, b); }
  if (t1 - at >= min) out.push([at, t1]);
  return out;
}

function wav(pcm) {
  const h = new DataView(new ArrayBuffer(44)), w = (o, s) => { for (let i = 0; i < s.length; i++) h.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); h.setUint32(4, 36 + pcm.byteLength, true); w(8, "WAVE"); w(12, "fmt "); h.setUint32(16, 16, true); h.setUint16(20, 1, true); h.setUint16(22, 1, true);
  h.setUint32(24, SR, true); h.setUint32(28, BPS, true); h.setUint16(32, 2, true); h.setUint16(34, 16, true); w(36, "data"); h.setUint32(40, pcm.byteLength, true);
  const out = new Uint8Array(44 + pcm.byteLength); out.set(new Uint8Array(h.buffer), 0); out.set(pcm, 44); return out;
}
function b64(u8) { let s = ""; for (let i = 0; i < u8.length; i += 32768) s += String.fromCharCode.apply(null, u8.subarray(i, i + 32768)); return btoa(s); }
function loud(pcm) {   // RMS of PCM16, 0..1
  const v = new Int16Array(pcm.buffer, pcm.byteOffset, pcm.byteLength >> 1); let s = 0;
  for (let i = 0; i < v.length; i++) s += v[i] * v[i];
  return v.length ? Math.sqrt(s / v.length) / 32768 : 0;
}

export function dreamApi(h) {
  const { json, fail, text, now, rateOk, ipKey, brevo, supaUser, corsFor } = h;
  const newId = () => [...crypto.getRandomValues(new Uint8Array(24))].map((b) => "abcdefghijkmnpqrstuvwxyz23456789ABCDEFGHJKLMNPQRSTUVWXYZ"[b % 56]).join("");
  const cleanId = (v) => String(v || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 24);
  const getDream = (env, id) => (id ? env.DB.prepare("SELECT * FROM dreams WHERE id = ?").bind(cleanId(id)).first() : null);
  const partsOf = async (env, id) => (await env.DB.prepare("SELECT id, t0, t1, w1, text, src FROM dream_parts WHERE dream = ? ORDER BY t0, id").bind(id).all()).results || [];
  const seenOf = (d) => { try { const a = JSON.parse(d.seen || "[]"); return Array.isArray(a) ? a.map(Number).filter(Number.isFinite) : []; } catch { return []; } };
  async function refresh(env, d) {   // the answer's text and word count, from its parts
    const parts = await partsOf(env, d.id), t = stitch(parts, d.edited, seenOf(d));
    await env.DB.prepare("UPDATE dreams SET text = ?, words = ?, updated_at = ? WHERE id = ?").bind(t, wordsOf(t), now(), d.id).run();
    return { parts, text: t };
  }
  async function addPart(env, d, p) {
    const r = await env.DB.prepare("INSERT INTO dream_parts (dream, t0, t1, w1, text, src, at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(d.id, r3(p.t0), r3(p.t1), p.w1 == null ? null : r3(p.w1), text(p.text, 4000), p.src, now()).run();
    await refresh(env, (await getDream(env, d.id)) || d);   // the row as it is now (an edit may have landed meanwhile)
    return r.meta.last_row_id;
  }
  // voice resting: Workers AI refused (the daily allowance on the free plan, or rate limits). Typing still works, and nothing is lost.
  const resting = (e) => /4006|daily free allocation|neurons|429|rate.?limit|capacity/i.test(String((e && e.message) || e));
  async function rest(env, minutes) { await env.DB.prepare("INSERT INTO dream_flags (k, until) VALUES ('voice', ?) ON CONFLICT(k) DO UPDATE SET until = excluded.until").bind(now() + minutes * 60).run().catch(() => {}); }
  async function voiceOk(env) { const r = await env.DB.prepare("SELECT until FROM dream_flags WHERE k = 'voice'").first().catch(() => null); return !(r && r.until > now()); }
  async function view(env, d, extra = {}) {
    const { parts, text: t } = await refresh(env, d);
    return json({ ok: true, id: d.id, kind: d.kind, status: d.status, text: t, words: wordsOf(t), edited: d.edited, seen: seenOf(d), parts, audio_s: d.audio_s, nudged: !!d.nudged, limit: LIMIT, voice: !!env.AI && (await voiceOk(env)), ...extra });
  }
  async function readJson(request, max = 16384) {
    const raw = await request.text(); if (raw.length > max) return null;
    try { const b = JSON.parse(raw); return b && typeof b === "object" && !Array.isArray(b) ? b : null; } catch { return null; }
  }

  async function start(request, env) {
    const b = await readJson(request); if (!b) return fail("That didn't arrive as JSON.");
    const kind = b.kind === "signup" ? "signup" : "waitlist", t = now();
    let user = null;
    if (kind === "signup") { user = await supaUser(env, b.access_token); if (!user) return fail("Sign in again.", 401); }
    let d = await getDream(env, b.id);
    if (d && (d.kind !== kind || (user && d.uid && d.uid !== user.id))) d = null;   // someone else's answer: start fresh
    if (!d && user) d = await env.DB.prepare("SELECT * FROM dreams WHERE uid = ? ORDER BY updated_at DESC LIMIT 1").bind(user.id).first();   // the same person on another device
    let prior = null;
    if (!d) {
      if (!(await rateOk(env, "dream:" + (await ipKey(request)), 3600, int(env.DREAM_RATE, 30)))) return fail("Too many from here. Try again in a little while.", 429);
      const id = newId();
      await env.DB.prepare("INSERT INTO dreams (id, kind, email, uid, ip, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .bind(id, kind, user ? user.email : null, user ? user.id : null, await ipKey(request), t, t).run();
      d = await getDream(env, id);
    }
    if (user && d.status !== "final") {   // what they told us on the waitlist, if they did: the sign-up can start from it
      const w = await env.DB.prepare("SELECT text FROM dreams WHERE kind = 'waitlist' AND email = ? AND status = 'final' AND text != '' ORDER BY done_at DESC LIMIT 1").bind(user.email).first();
      if (w) prior = w.text;
    }
    return view(env, d, prior ? { prior } : {});
  }

  async function listen(request, env, url) {
    if ((request.headers.get("Upgrade") || "").toLowerCase() !== "websocket") return fail("Open this as a WebSocket.", 426);
    if (corsFor(request, env) === null) return fail("Not allowed from that site.", 403);
    const d = await getDream(env, url.searchParams.get("id"));
    if (!d) return fail("No answer with that id.", 404);
    if (d.status === "final") return fail("That answer is already in.", 409);
    if (d.audio_s >= CAP) return fail("Time's up for this answer.", 409);
    if (!env.AI) return fail("Listening isn't set up here.", 503);
    if (!(await rateOk(env, "listen:" + (await ipKey(request)), 3600, int(env.LISTEN_RATE, 60)))) return fail("Too many from here.", 429);
    const base = Math.max(0, Math.min(600, Number(url.searchParams.get("base")) || 0));
    if (base < d.audio_s - 6) return fail("That part of the answer is already heard.", 409);   // the clock only moves forward (the 3:00 can't be reset)
    if (base >= CAP) return fail("Time's up for this answer.", 409);
    let nova;
    try {
      const r = await env.AI.run(NOVA, { encoding: "linear16", sample_rate: String(SR), language: "en", interim_results: "true", punctuate: "true", smart_format: "true", endpointing: "300" }, { websocket: true });
      nova = r && r.webSocket; if (!nova) throw new Error("no socket (" + (r && r.status) + ")");
      nova.accept();
    } catch (e) { console.error("nova", String(e && e.message || e).slice(0, 200)); if (resting(e)) await rest(env, 20); return fail("Listening is busy. Try again.", 503); }

    const pair = new WebSocketPair(), client = pair[0], ws = pair[1];
    ws.accept();
    const room = Math.max(0, (CAP - base) * BPS);
    let bytes = 0, over = false, ending = null, chain = Promise.resolve(), novaOpen = true, done = false;
    const send = (o) => { try { ws.send(JSON.stringify(o)); } catch {} };
    // how much of the answer has been heard: the answer's clock, moved forward with every phrase (and at the end), never back
    const book = () => { chain = chain.then(() => env.DB.prepare("UPDATE dreams SET audio_s = MAX(audio_s, ?), updated_at = ? WHERE id = ?").bind(r3(base + bytes / BPS), now(), d.id).run()).catch(() => {}); };
    nova.addEventListener("message", (m) => {
      let x; try { x = JSON.parse(typeof m.data === "string" ? m.data : new TextDecoder().decode(m.data)); } catch { return; }
      if (x.type !== "Results") return;
      const alt = (x.channel && x.channel.alternatives && x.channel.alternatives[0]) || {}, tr = String(alt.transcript || "").trim();
      const t0 = base + (Number(x.start) || 0), t1 = t0 + (Number(x.duration) || 0);
      if (x.is_final) {
        const w = Array.isArray(alt.words) && alt.words.length ? alt.words[alt.words.length - 1] : null;
        const p = { t0: r3(t0), t1: r3(t1), w1: w ? r3(base + Number(w.end)) : null, text: tr, src: "nova" };
        book();
        chain = chain.then(() => addPart(env, d, p)).then((id) => send({ type: "final", id, ...p })).catch((e) => { console.error("dream part", String(e)); send({ type: "unsaved", ...p }); });
        if (x.from_finalize && ending) ending();
      } else if (tr) send({ type: "interim", t0: r3(t0), text: tr });
    });
    const novaGone = () => { novaOpen = false; if (ending) ending(); if (!done) { send({ type: "error", code: "stt" }); finish(false); } };
    nova.addEventListener("close", novaGone); nova.addEventListener("error", novaGone);
    async function finish(clean) {   // flush what the model still holds, save it, then close
      if (done) return; done = true;
      if (novaOpen) {
        try { nova.send(JSON.stringify({ type: "Finalize" })); } catch {}
        await new Promise((res) => { ending = res; setTimeout(res, 2500); });
        try { nova.send(JSON.stringify({ type: "CloseStream" })); } catch {}
        await new Promise((res) => { const t = setTimeout(res, 2000); nova.addEventListener("close", () => { clearTimeout(t); res(); }); });
      }
      book(); await chain;
      send({ type: "closed", ack: r3(base + bytes / BPS), clean });
      try { ws.close(1000, "done"); } catch {}
    }
    let inq = Promise.resolve();   // one queue: audio and "stop" are handled in the order they were sent
    ws.addEventListener("message", (m) => {
      inq = inq.then(async () => {
        if (typeof m.data === "string") { let c; try { c = JSON.parse(m.data); } catch { return; } if (c && c.type === "stop") await finish(true); return; }
        if (done || over) return;
        const data = m.data && typeof m.data.arrayBuffer === "function" && !(m.data instanceof ArrayBuffer) ? await m.data.arrayBuffer() : m.data;   // a Blob on some runtimes
        const n = (data && data.byteLength) || 0;
        if (bytes + n > room) { over = true; send({ type: "limit" }); await finish(true); return; }
        bytes += n;
        if (novaOpen) { try { nova.send(data); } catch { novaGone(); } }
      }).catch((e) => console.error("dream in", String(e)));
    });
    ws.addEventListener("close", () => { finish(false); });   // the page went away: still flush and save what was heard
    ws.addEventListener("error", () => { finish(false); });
    send({ type: "ready", base });
    return new Response(null, { status: 101, webSocket: client });
  }

  // A stretch only memory still holds. t0..t1 is the audio sent (it may reach up to 0.8 s past the stretch on each side);
  // from..to is the stretch it stands for. Each word is kept only if its middle falls inside a stretch nothing covers yet, so a
  // word cut in half where a live phrase ended is caught whole, and never counted twice.
  async function chunk(request, env, url) {
    const d = await getDream(env, url.searchParams.get("id"));
    if (!d) return fail("No answer with that id.", 404);
    if (d.status === "final") return fail("That answer is already in.", 409);
    const t0 = Number(url.searchParams.get("t0")), t1 = Number(url.searchParams.get("t1"));
    const from = url.searchParams.has("from") ? Number(url.searchParams.get("from")) : t0, to = url.searchParams.has("to") ? Number(url.searchParams.get("to")) : t1;
    if (!(t0 >= 0 && t1 > t0 && t1 - t0 <= 31 && t1 <= 600 && from >= t0 && to <= t1 + 0.01 && to > from)) return fail("Send a stretch of up to 30 seconds.");
    const buf = new Uint8Array(await request.arrayBuffer());
    if (buf.byteLength > MAX_CHUNK || buf.byteLength < BPS / 10) return fail("That isn't a stretch of audio.");
    if (!(await rateOk(env, "chunk:" + d.id, 3600, int(env.CHUNK_RATE, 240)))) return fail("Too many repairs for this answer.", 429);
    if (!env.AI) return fail("Listening isn't set up here.", 503);
    const end = Math.min(t1, t0 + buf.byteLength / BPS);
    const holes = gaps(await partsOf(env, d.id), from, Math.min(to, end));
    const added = [], PAD = 0.8;
    for (const [a, b] of holes) {
      const s0 = Math.max(t0, a - PAD), s1 = Math.min(end, b + PAD);
      const i0 = Math.floor((s0 - t0) * SR) * 2, i1 = Math.min(buf.byteLength, Math.ceil((s1 - t0) * SR) * 2), slice = buf.subarray(i0, i1);
      let words = "";
      if (loud(buf.subarray(Math.floor((a - t0) * SR) * 2, Math.min(buf.byteLength, Math.ceil((b - t0) * SR) * 2))) > 0.004) {   // quieter is the room, not a voice
        let r;
        try { r = await env.AI.run(WHISPER, { audio: b64(wav(slice)), language: "en", condition_on_previous_text: false }); }
        catch (e) { if (resting(e)) { await rest(env, 20); return json({ ok: false, error: "Voice is resting right now.", code: "voice_resting" }, 503); } throw e; }
        if (!r || typeof r !== "object" || typeof r.text !== "string") { console.error("whisper gave", r && r.constructor && r.constructor.name); return fail("Couldn't transcribe that just now. It will be tried again.", 502); }
        const segs = (Array.isArray(r.segments) ? r.segments : []).filter((g) => !(g.no_speech_prob > 0.6));
        const TOL = 0.15, inside = (t) => t >= a - TOL && t < b + TOL;   // at a seam, a word heard twice beats a word lost (join() drops an exact repeat)
        if (segs.some((g) => Array.isArray(g.words) && g.words.length)) {
          words = join(segs.map((g) => {
            const gs = s0 + Number(g.start), ge = s0 + Number(g.end);
            if (gs >= a - TOL && ge <= b + TOL) return String(g.text || "");   // wholly inside: the sentence as written, punctuation and all
            return (g.words || []).filter((w) => inside(s0 + (Number(w.start) + Number(w.end)) / 2)).map((w) => String(w.word).trim()).join(" ");
          }));
        } else words = (segs.length ? segs.map((g) => String(g.text || "").trim()).join(" ") : r.text).trim();
      }
      const p = { t0: a, t1: b, text: words, src: "whisper" };
      p.id = await addPart(env, d, p); added.push(p);
    }
    const now2 = await getDream(env, d.id);
    // all: every saved phrase, so the page also learns the ones a dropped stream saved after it lost touch
    return json({ ok: true, parts: added.map((p) => ({ ...p, t0: r3(p.t0), t1: r3(p.t1) })), all: await partsOf(env, d.id), text: now2.text, words: now2.words });
  }

  async function save(request, env) {
    const b = await readJson(request); if (!b) return fail("That didn't arrive as JSON.");
    const d = await getDream(env, b.id); if (!d) return fail("No answer with that id.", 404);
    if (d.status === "final") return fail("That answer is already in.", 409);
    const edited = b.edited == null ? d.edited : text(b.edited, MAX_TEXT);
    const seen = Array.isArray(b.seen) ? b.seen.map(Number).filter(Number.isFinite).slice(0, 2000) : seenOf(d);
    await env.DB.prepare("UPDATE dreams SET edited = ?, seen = ?, nudged = MAX(nudged, ?), updated_at = ? WHERE id = ?").bind(edited, JSON.stringify(seen), b.nudged ? 1 : 0, now(), d.id).run();
    return view(env, await getDream(env, d.id));
  }

  async function finishAnswer(request, env, ctx) {
    const b = await readJson(request); if (!b) return fail("That didn't arrive as JSON.");
    const d = await getDream(env, b.id); if (!d) return fail("No answer with that id.", 404);
    if (d.kind === "signup") { const u = await supaUser(env, b.access_token); if (!u || (d.uid && d.uid !== u.id)) return fail("Sign in again.", 401); }
    if (d.status !== "final") {
      const edited = b.text == null ? d.edited : text(b.text, MAX_TEXT);
      const seen = Array.isArray(b.seen) ? b.seen.map(Number).filter(Number.isFinite).slice(0, 2000) : seenOf(d);
      await env.DB.prepare("UPDATE dreams SET edited = ?, seen = ?, nudged = MAX(nudged, ?), status = 'final', done_at = ?, updated_at = ? WHERE id = ?")
        .bind(edited, JSON.stringify(seen), b.nudged ? 1 : 0, now(), now(), d.id).run();
    }
    const f = await getDream(env, d.id); const { text: t } = await refresh(env, f);
    const out = await getDream(env, d.id);
    if (out.email) ctx.waitUntil(pushDream(env, out).catch(() => {}));
    return json({ ok: true, id: out.id, text: t, words: wordsOf(t), seconds: r3(out.audio_s), nudged: !!out.nudged, at: new Date(out.done_at * 1000).toISOString() });
  }

  // Brevo DREAM + DREAM_AT (the fields exist: /admin/brevo-setup, Evan's yes 2026-11-21)
  async function pushDream(env, d) {
    if (!env.BREVO_API_KEY || !d.email || !d.text) return false;
    const r = await brevo(env, "POST", "/contacts", { email: d.email, attributes: { DREAM: d.text.slice(0, 5000), DREAM_AT: new Date((d.done_at || now()) * 1000).toISOString() }, updateEnabled: true });
    return r.ok;
  }
  // the waitlist: the answer came before the email; /join ties them together
  async function bind(env, id, email) {
    const d = await getDream(env, id); if (!d || d.kind !== "waitlist" || (d.email && d.email !== email)) return null;
    await env.DB.prepare("UPDATE dreams SET email = ?, updated_at = ? WHERE id = ?").bind(email, now(), d.id).run();
    const out = await getDream(env, d.id);
    if (out.status === "final") await pushDream(env, out).catch(() => {});
    return out.id;
  }

  async function csv(env) {
    const { results } = await env.DB.prepare("SELECT * FROM dreams ORDER BY created_at").all();
    const iso = (t) => (t ? new Date(t * 1000).toISOString().slice(0, 19) + "Z" : "");
    const cell = (v) => { const s = v == null ? "" : String(v); return /[",\r\n]/.test(s) || /^[=+\-@]/.test(s) ? '"' + (/^[=+\-@]/.test(s) ? "'" : "") + s.replace(/"/g, '""') + '"' : s; };
    const cols = ["id", "kind", "email", "status", "words", "seconds", "nudged", "started", "done", "text"];
    const lines = [cols.join(",")].concat(results.map((r) => [r.id, r.kind, r.email, r.status, r.words, r3(r.audio_s), r.nudged ? "yes" : "", iso(r.created_at), iso(r.done_at), r.text].map(cell).join(",")));
    return new Response(lines.join("\r\n") + "\r\n", { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="studio-dreams.csv"', "Cache-Control": "no-store" } });
  }

  return { start, listen, chunk, save, finish: finishAnswer, bind, csv };
}
const int = (v, f) => { const n = parseInt(v, 10); return Number.isFinite(n) && n >= 0 ? n : f; };
