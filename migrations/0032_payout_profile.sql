-- Partner payout profile (Decision 29): country, tax status, residency, 18+, offer accepted.
-- No payout leaves until this is filled. Stored as JSON; filled_at marks when it was last saved.
ALTER TABLE partners ADD COLUMN payout_profile TEXT;
ALTER TABLE partners ADD COLUMN payout_filled_at TEXT;
