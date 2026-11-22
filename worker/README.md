# Studio waitlist

One Cloudflare Worker, `studio-waitlist`. The website's early-access form posts here. Each person gets a place in line and a
referral link, and every referral moves them up `BOOST` places (10 by default). Every sign-up is also sent to Brevo.

| Piece | Where |
| --- | --- |
| The Worker | `worker/src/index.js` |
| Its database (Cloudflare D1) | `worker/migrations/` (0004 adds email confirmation) |
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
- **Email confirmation.** A new email is saved at once (`confirmed_at` empty), and `/join` answers
  `{ ok, needs_confirm: true, email, first, sent, resend_in }` with no code and no place. The Worker sends "Confirm your spot" from
  "Studio" <hello@askstudio.ai> through Brevo's transactional API (`POST /v3/smtp/email`, the same `BREVO_API_KEY`). The email has a
  6-digit code (10 minutes, 5 wrong tries) and a button to `https://askstudio.ai/?confirm=<token>#early-access` (24 hours; the page posts
  the token, so a mail scanner that opens links confirms nothing). Only SHA-256 hashes of the code and token are kept. Until a row is
  confirmed it has no place, doesn't count as anyone's friend, isn't in `/count`, and is never sent to the Brevo list. Confirming sets
  `confirmed_at`, `confirmed_via` (`code` or `link`) and Brevo's `EMAIL_CONFIRMED` (true), then counts the referral. The rows from before
  this change are marked `legacy`: they keep their place, and `EMAIL_CONFIRMED` is false for them. A confirmed email that signs up
  again gets its place straight away, as before.
- **`POST /confirm`** takes `{ email, code }` or `{ token }` and answers the `/join` shape of old (code, place, `already`), or
  `{ ok: false, error, tries_left?, expired? }` with 400, 410 (expired) or 429. 30 tries per IP address per 10 minutes.
- **`POST /resend`** takes `{ email }`: a new code and link (the old ones stop working), at least 60 s apart (429 with `resend_in`),
  at most 5 emails per address per hour (`capped: true`), 10 calls per IP address per 10 minutes. An unknown email gets the same answer as
  a real send.
- **`GET /status?code=XXXXXXX`** answers with the same shape for that code (`already: true`), or 404 (unknown or not confirmed yet).
  Every answer with a place also has `invites` (how many times they sent their link, from `POST /invited`) and `pending` (friends who
  signed up with their link but haven't confirmed yet: the page shows them as "Confirming"). Private answers (`/confirm`, `/pass`, a
  new sign-up) add `friends: [{ first, joined }]`, oldest first: each friend's first word, letters only. `/status` never names anyone.
- **`POST /invited`** takes `{ t }` (the private pass token) and adds 1 to `invites` (at most 50): the page calls it on Text a friend →
  Open Messages, Copy message, Copy link, Share, X and Email, so "2 invites sent" shows on every device. 30 calls per IP address per
  10 minutes. Migration `0007_invites.sql` (additive: `invites`, `invited_at`).
- **"A friend joined" email.** When a friend who used someone's link confirms, the inviter gets "{Friend} just joined Studio with your
  link" (the 3rd: "{Friend} joined. You're all at the front."), from hello@askstudio.ai through Brevo, with n of 3 and their pass link
  (`friendJoinedEmail` in `src/emails.js`, tag `waitlist-friend-joined`). At most 6 a day to one person (`FRIEND_MAILS_PER_DAY`);
  `SEND_FRIEND_JOINED = "0"` turns it off.
- **`GET /admin/brevo-check`** (admin token) shows the key's Brevo account, its senders and domains, and `sender_ready`: whether it
  may send as hello@askstudio.ai. It only reads.
- **`GET /health`** answers `{ ok: true }`.
- **`POST /admin/resync`** (header `Authorization: Bearer <ADMIN_TOKEN>`) sends Brevo the rows it doesn't have yet
  (`brevo_synced = 0`), 20 per call (`?limit=`). `?all=1&from=<seq>` resends everyone, which refreshes POSITION. The
  answer gives `next` so you can go on.
- **`GET /admin/export.csv`** (same token) downloads everyone with their current place.

Place in line: score = seq − referrals × BOOST. The lowest score is first, and on a tie whoever joined first goes ahead.
Consent (Studio legal, consent copy c): the last step has an optional, unticked "Text me Studio updates" box. The sign-up sends
`sms_consent`, `sms_consent_text` (the exact words), `sms_consent_version` and `terms_version`. The Worker keeps them with the time and the
browser (`user_agent`), and sends Brevo PHONE, SMS_CONSENT, SMS_CONSENT_AT and SMS_CONSENT_TEXT. Brevo's SMS field (the SMS channel) is
filled only for someone who ticked the box. `POST /admin/brevo-setup` (admin token) makes any missing contact fields.
The front of the line: once someone has `GOAL` (3) friends on the list, they and every friend who joined with their link go
ahead of everyone else, in the same order among themselves. The answer says `front: true` for them. `GET /count` gives `{ ok, total }`.
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
