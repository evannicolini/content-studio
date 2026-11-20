# Studio waitlist

One Cloudflare Worker, `studio-waitlist`. The website's early-access form posts here. Each person gets a place in line and a
referral link, and every referral moves them up `BOOST` places (10 by default). Every sign-up is also sent to Brevo.

| Piece | Where |
| --- | --- |
| The Worker | `worker/src/index.js` |
| Its database (Cloudflare D1) | `worker/migrations/0001_init.sql` |
| Config | `worker/wrangler.json` (vars: `ORIGINS`, `BOOST`, `BREVO_LIST_ID`). Secrets: `BREVO_API_KEY`, `ADMIN_TOKEN` |
| Tests (no network) | `node worker/tests/run.mjs` |
| Local server for the site | `node worker/dev.mjs`, which serves on http://127.0.0.1:8787 with a fake Brevo that only prints. `--reset` empties it |

## The API

Every answer is JSON. An error looks like `{ "ok": false, "error": "A short sentence." }` with status 400, 401, 403, 404, 405, 429 or 500.

- **`POST /join`** takes `{ first, last, email, phone, cc, roles: [...], brands, claude, source, ref, hp }` and answers
  `{ ok: true, code, first, position, total, referrals, boost, already }`.
  - The email is matched without case. If it is already on the list, the details are updated, the place and code stay the
    same, and the answer has `already: true`.
  - `ref` is the referral code from the link. A new email with someone else's valid code adds 1 to that person's
    `referrals`. A repeat sign-up or an unknown code adds nothing.
  - `hp` is the honeypot. If it is filled in, the answer looks like a success but nothing is stored or sent.
  - `phone` plus `cc` becomes `+<cc><digits>` for Brevo's SMS field. A number typed with `+` or `00` keeps its own
    country code. If a number can't be read, the sign-up still works and only the SMS field is left out.
  - Limits: a body of up to 8 KB, and 10 sign-ups per IP address per 10 minutes (`RATE_LIMIT`, `RATE_WINDOW`).
- **`GET /status?code=XXXXXXX`** answers with the same shape for that code (`already: true`), or 404.
- **`GET /health`** answers `{ ok: true }`.
- **`POST /admin/resync`** (header `Authorization: Bearer <ADMIN_TOKEN>`) sends Brevo the rows it doesn't have yet
  (`brevo_synced = 0`), 20 per call (`?limit=`). `?all=1&from=<seq>` resends everyone, which refreshes POSITION. The
  answer gives `next` so you can go on.
- **`GET /admin/export.csv`** (same token) downloads everyone with their current place.

Place in line: score = seq − referrals × BOOST. The lowest score is first, and on a tie whoever joined first goes ahead.
`position` = 1 + the number of people with a better score.

CORS allows `https://evannicolini.github.io`, `http://127.0.0.1:*` and `http://localhost:*` (the `ORIGINS` var).
A browser on any other site gets 403.

Brevo is sent each sign-up after the answer has gone out, so a slow or failing Brevo never fails a sign-up. If the SMS
number is refused, the contact is sent again without it. When someone's referral count goes up, their REFERRALS and
POSITION are updated too. Any failure leaves `brevo_synced = 0` for `/admin/resync`. Brevo's POSITION is the place at
the last send, so run `resync?all=1` before an email that quotes it. If `BREVO_API_KEY` isn't set, Brevo is skipped and
every row waits for a resync.

## Going live (by hand, once)

1. Create the **Studio** Brevo account. Use its own account, not the CES or MIRRA ones.
2. In Brevo, create the list **Studio early access** and note its id (the number in the list's URL).
3. In Brevo, under Contacts › Settings › Contact attributes, add the text attributes **ROLE, BRANDS, CLAUDE, SOURCE,
   REF_CODE, REFERRED_BY** and the number attributes **REFERRALS, POSITION**. FIRSTNAME, LASTNAME and SMS are already there.
4. In Brevo, create an API key (SMTP & API › API keys). Keep it out of every file.
5. `cd worker && npx wrangler d1 create studio-waitlist`, then paste the `database_id` it prints into `wrangler.json`
   in place of `PASTE_THE_ID_FROM_wrangler_d1_create_studio-waitlist`.
6. `npx wrangler d1 migrations apply studio-waitlist --remote`
7. `npx wrangler secret put BREVO_API_KEY` (paste the key) and `npx wrangler secret put ADMIN_TOKEN` (any long random
   string, for example from `openssl rand -hex 24`).
8. Put the list id from step 2 in `wrangler.json` as `"BREVO_LIST_ID": "<id>"`.
9. `npx wrangler deploy`
10. Paste the `https://studio-waitlist.<subdomain>.workers.dev` address it prints into the site's `src/waitlist.json`
    as `"api"`.

Check it: `curl https://studio-waitlist.<subdomain>.workers.dev/health` should answer `{"ok":true}`.
