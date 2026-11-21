-- Consent records (Studio legal, consent copy (c)): kept with each sign-up as evidence.
ALTER TABLE signups ADD COLUMN sms_consent INTEGER NOT NULL DEFAULT 0;  -- 1: ticked "Text me Studio updates"
ALTER TABLE signups ADD COLUMN sms_consent_at INTEGER;                  -- unix time it was given
ALTER TABLE signups ADD COLUMN sms_consent_text TEXT;                   -- the exact words next to the box
ALTER TABLE signups ADD COLUMN sms_consent_version TEXT;                -- e.g. waitlist-sms-v1
ALTER TABLE signups ADD COLUMN terms_version TEXT;                      -- the email + Terms line shown under the button, e.g. waitlist-email-v1
ALTER TABLE signups ADD COLUMN user_agent TEXT NOT NULL DEFAULT '';
