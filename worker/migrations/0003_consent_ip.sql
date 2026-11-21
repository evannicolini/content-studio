-- Consent evidence (privacy policy 2.1): where a consent came from, kept with it.
ALTER TABLE signups ADD COLUMN consent_ip TEXT;        -- the IP address the SMS consent was given from
ALTER TABLE signups ADD COLUMN consent_country TEXT;   -- Cloudflare's country for that address
