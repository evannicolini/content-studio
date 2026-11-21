// A stand-in for Brevo's API (only what the Worker calls), used in place of the global fetch. Nothing leaves this Mac.
//
//   const brevo = fakeBrevo({ rejectSms: true });  globalThis.fetch = brevo.fetch;
//   brevo.calls        every contacts call: { method, url, path, headers, body }
//   brevo.emails       every transactional email (POST /v3/smtp/email): { to, subject, html, text, code, token, body }
//   brevo.lastEmail(to) the newest email to that address
//   brevo.contacts     what Brevo would hold now, by email
//   brevo.set({...})   change the behaviour mid-test: rejectSms, down (every call 500s), hold (calls wait for release())
//   log: true          print one line per call (worker/dev.mjs)

export function fakeBrevo(options = {}) {
  const opts = { rejectSms: false, down: false, hold: false, log: false, ...options };
  const calls = [], emails = [];
  const contacts = new Map();
  let waiting = [];
  const reply = (status, body) =>
    new Response(body === undefined ? null : JSON.stringify(body), { status, headers: body === undefined ? {} : { "Content-Type": "application/json" } });

  async function fetch(input, init = {}) {
    const url = new URL(typeof input === "string" ? input : input.url);
    if (url.hostname !== "api.brevo.com") throw new Error("fakeBrevo: the Worker tried to reach " + url.hostname);
    const method = (init.method || "GET").toUpperCase();
    const headers = Object.fromEntries(new Headers(init.headers || {}));
    const body = init.body ? JSON.parse(init.body) : null;
    if (method === "POST" && url.pathname === "/v3/smtp/email") {     // the confirmation email: kept apart from the contacts calls
      if (!headers["api-key"]) return reply(401, { code: "unauthorized", message: "Key not found" });
      if (opts.down || opts.mailDown) return reply(500, { code: "internal_error", message: "Brevo is down (fake)" });
      const textBody = body.textContent || "", code = (textBody.match(/code is (\d{3}) (\d{3})/) || []).slice(1).join("");
      const token = (textBody.match(/[?&]confirm=([A-Za-z0-9_-]+)/) || [])[1] || "";
      const mail = { to: body.to[0].email, subject: body.subject, html: body.htmlContent, text: textBody, code, token, body };
      emails.push(mail);
      if (opts.log) console.log(`  [fake Brevo] email to ${mail.to}: "${mail.subject}", code ${code}, link …?confirm=${token}`);
      return reply(201, { messageId: "<fake-" + emails.length + "@smtp-relay.mailin.fr>" });
    }
    const call = { method, url: url.href, path: url.pathname, headers, body };
    calls.push(call);
    if (opts.hold) await new Promise((resolve) => waiting.push(resolve));
    if (opts.log) {
      const who = body && body.email ? body.email : decodeURIComponent(url.pathname.split("/").pop());
      console.log(`  [fake Brevo] ${method} ${url.pathname} ${who} ${JSON.stringify((body && body.attributes) || {})}${body && body.listIds ? " lists " + body.listIds : ""}`);
    }
    if (!headers["api-key"]) return reply(401, { code: "unauthorized", message: "Key not found" });
    if (opts.down) return reply(500, { code: "internal_error", message: "Brevo is down (fake)" });

    if (method === "POST" && url.pathname === "/v3/contacts") {
      if (!body || !body.email) return reply(400, { code: "missing_parameter", message: "email is missing" });
      if (opts.rejectSms && body.attributes && body.attributes.SMS) return reply(400, { code: "invalid_parameter", message: "Invalid phone number" });
      const existing = contacts.get(body.email);
      if (existing && !body.updateEnabled) return reply(400, { code: "duplicate_parameter", message: "Contact already exist" });
      contacts.set(body.email, { email: body.email, attributes: { ...(existing ? existing.attributes : {}), ...body.attributes }, listIds: body.listIds || [] });
      return existing ? reply(204) : reply(201, { id: contacts.size });
    }
    if (method === "PUT" && url.pathname.startsWith("/v3/contacts/")) {
      const email = decodeURIComponent(url.pathname.slice("/v3/contacts/".length));
      const existing = contacts.get(email);
      if (!existing) return reply(404, { code: "document_not_found", message: "Contact does not exist" });
      existing.attributes = { ...existing.attributes, ...(body.attributes || {}) };
      return reply(204);
    }
    return reply(404, { code: "not_found", message: "fakeBrevo does not know " + method + " " + url.pathname });
  }

  return {
    fetch, calls, contacts, emails,
    lastEmail(to) { for (let i = emails.length - 1; i >= 0; i--) if (emails[i].to === to) return emails[i]; return null; },
    set(changes) { Object.assign(opts, changes); },
    release() { const w = waiting; waiting = []; w.forEach((resolve) => resolve()); return w.length; },
    reset() { calls.length = 0; },
  };
}
