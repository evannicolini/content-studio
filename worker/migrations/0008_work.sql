-- Where their work lives (Evan, 2026-11-22): the waitlist's brands step asks for an Instagram handle and a website, both optional.
-- Kept as the Worker cleans them: the handle without @ or a link around it (lowercase), the site as https://host/path.
ALTER TABLE signups ADD COLUMN instagram TEXT;
ALTER TABLE signups ADD COLUMN website TEXT;
