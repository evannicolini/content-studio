-- Invites sent: each time someone texts, copies or shares their link from the done step (or their pass), the page tells the Worker,
-- so "2 invites sent" shows on every device they open their pass on. Additive: a count and the time of the last one.
ALTER TABLE signups ADD COLUMN invites INTEGER NOT NULL DEFAULT 0;
ALTER TABLE signups ADD COLUMN invited_at INTEGER;
