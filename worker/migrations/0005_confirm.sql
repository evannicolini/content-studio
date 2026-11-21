-- Email confirmation: a sign-up holds a place in line only once its email is confirmed (a 6-digit code, or the link in the email).
-- Codes and link tokens are kept only as SHA-256 hashes.
ALTER TABLE signups ADD COLUMN confirmed_at INTEGER;          -- unix seconds; NULL = saved but not confirmed
ALTER TABLE signups ADD COLUMN confirmed_via TEXT;            -- 'code', 'link', or 'legacy' (joined before confirmation existed)
ALTER TABLE signups ADD COLUMN confirm_code_hash TEXT;
ALTER TABLE signups ADD COLUMN confirm_token_hash TEXT;
ALTER TABLE signups ADD COLUMN confirm_expires INTEGER;       -- the code's expiry (10 minutes)
ALTER TABLE signups ADD COLUMN confirm_link_expires INTEGER;  -- the link's expiry (24 hours)
ALTER TABLE signups ADD COLUMN confirm_sent_at INTEGER;       -- the last send, for the 60-second resend wait
ALTER TABLE signups ADD COLUMN confirm_tries INTEGER NOT NULL DEFAULT 0;   -- wrong codes since the last send
CREATE INDEX IF NOT EXISTS signups_confirm_token ON signups (confirm_token_hash);
-- Everyone already on the list keeps their place; they are marked 'legacy', not confirmed by email.
UPDATE signups SET confirmed_at = created_at, confirmed_via = 'legacy' WHERE confirmed_at IS NULL;
