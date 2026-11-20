-- Studio's early-access waitlist (Cloudflare D1). One row per email.
CREATE TABLE IF NOT EXISTS signups (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,   -- the order people joined in (1, 2, 3, ...); never changes
  email TEXT NOT NULL UNIQUE,              -- trimmed, lower case
  first TEXT NOT NULL,
  last TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',          -- as typed
  cc TEXT NOT NULL DEFAULT '',             -- the dialling code, without "+"
  sms TEXT NOT NULL DEFAULT '',            -- the number as +<cc><digits>; empty when none could be made
  roles TEXT NOT NULL DEFAULT '',          -- joined with ", "
  brands TEXT NOT NULL DEFAULT '',
  claude TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT '',
  code TEXT NOT NULL UNIQUE,               -- their own referral code (7 characters, no look-alikes)
  referred_by TEXT,                        -- the code of whoever's link they came from
  referrals INTEGER NOT NULL DEFAULT 0,    -- how many sign-ups name their code in referred_by
  ip TEXT NOT NULL DEFAULT '',             -- a one-way code of the address they signed up from (never the address)
  brevo_synced INTEGER NOT NULL DEFAULT 0, -- 1: Brevo has the latest details. 0: still to send (POST /admin/resync)
  brevo_error TEXT,                        -- what Brevo said the last time it refused (or "sent without SMS: ...")
  brevo_at INTEGER,                        -- unix time of the last try
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS signups_referred_by ON signups (referred_by);
CREATE INDEX IF NOT EXISTS signups_brevo ON signups (brevo_synced, seq);

-- Sign-up attempts per address (a one-way code), for the rate limit. Rows older than the window are deleted.
CREATE TABLE IF NOT EXISTS hits (who TEXT NOT NULL, at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS hits_who ON hits (who, at);
CREATE INDEX IF NOT EXISTS hits_at ON hits (at);
