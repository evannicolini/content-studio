-- Two separate SMS opt-ins (the carriers' rule): account notifications ("Text me when my Studio invite is ready") and marketing
-- ("Text me Studio news and offers"), each with its own time and exact words. sms_consent stays as "either one".
ALTER TABLE signups ADD COLUMN sms_notify INTEGER NOT NULL DEFAULT 0;
ALTER TABLE signups ADD COLUMN sms_notify_at INTEGER;
ALTER TABLE signups ADD COLUMN sms_notify_text TEXT;
ALTER TABLE signups ADD COLUMN sms_marketing INTEGER NOT NULL DEFAULT 0;
ALTER TABLE signups ADD COLUMN sms_marketing_at INTEGER;
ALTER TABLE signups ADD COLUMN sms_marketing_text TEXT;
-- The one v1 box covered both ("about the waitlist, launch and offers"): a v1 consent counts for both, with its own time and words.
UPDATE signups SET sms_notify = 1, sms_notify_at = sms_consent_at, sms_notify_text = sms_consent_text,
  sms_marketing = 1, sms_marketing_at = sms_consent_at, sms_marketing_text = sms_consent_text WHERE sms_consent = 1;
