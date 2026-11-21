-- "Your dream outcome": Kayla's voice interview (sign-up and waitlist). No audio is ever stored: only the words.
-- dreams: one answer. parts: every transcribed phrase, inserted as it arrives (never rewritten, so nothing races or is lost).
-- The answer's text = what they edited (edited) + every part they had not seen when they edited (seen = those part ids).
CREATE TABLE dreams (
  id TEXT PRIMARY KEY,               -- 24 random characters; the page keeps it to come back to the same answer
  kind TEXT NOT NULL,                -- signup | waitlist
  email TEXT,                        -- the sign-up's (from Supabase) or the waitlist's (bound on /join)
  uid TEXT,                          -- the Supabase user id (sign-up)
  edited TEXT,                       -- their own edit of the words, if they changed them or typed
  seen TEXT NOT NULL DEFAULT '[]',   -- the part ids already inside edited
  text TEXT NOT NULL DEFAULT '',     -- the answer as it stands (kept current on every change)
  words INTEGER NOT NULL DEFAULT 0,
  audio_s REAL NOT NULL DEFAULT 0,   -- seconds of voice heard (the 3:00 limit, across reloads)
  nudged INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',   -- draft | final
  ip TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  done_at INTEGER
);
CREATE INDEX dreams_email ON dreams (email);
CREATE INDEX dreams_uid ON dreams (uid);
CREATE TABLE dream_parts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dream TEXT NOT NULL,
  t0 REAL NOT NULL,                  -- seconds into the answer's own audio clock
  t1 REAL NOT NULL,
  text TEXT NOT NULL,                -- may be empty (silence still counts as covered)
  src TEXT NOT NULL,                 -- nova (live) | whisper (a repaired gap) | typed
  w1 REAL,                           -- where its last whole word ends (a phrase cut by a dropped stream covers only up to here)
  at INTEGER NOT NULL
);
CREATE INDEX dream_parts_dream ON dream_parts (dream, t0);
ALTER TABLE signups ADD COLUMN dream_id TEXT;
