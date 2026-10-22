-- Cabinets: sign-up with name, email and password (besides Google and email codes), consent and the account rights.
ALTER TABLE clients ADD COLUMN pass_hash TEXT;          -- PBKDF2-SHA256, 100k rounds, with its own salt
ALTER TABLE clients ADD COLUMN pass_salt TEXT;
ALTER TABLE clients ADD COLUMN phone TEXT;
ALTER TABLE clients ADD COLUMN email_verified_at TEXT;  -- set by an email code or Google; only then projects are linked by email
ALTER TABLE clients ADD COLUMN consent_at TEXT;         -- accepted the terms and the privacy policy
ALTER TABLE clients ADD COLUMN marketing INTEGER NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS login_fails (email TEXT NOT NULL, at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE INDEX IF NOT EXISTS login_fails_email ON login_fails (email, at);
