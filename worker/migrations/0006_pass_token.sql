-- A private link to your own pass (askstudio.ai/?pass=<token>): the place and the friends, from any device. Unlike the referral code
-- it is never shared, so it can show your full name and is the only way back in without the email.
ALTER TABLE signups ADD COLUMN pass_token TEXT;
UPDATE signups SET pass_token = lower(hex(randomblob(16))) WHERE pass_token IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS signups_pass_token ON signups (pass_token);
