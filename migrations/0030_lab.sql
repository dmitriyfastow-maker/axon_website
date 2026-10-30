-- INSIDERS Lab members (Decision 24/25): monthly membership, optional autopay by a saved mono card token.
CREATE TABLE IF NOT EXISTS lab_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL DEFAULT (datetime('now')),
  token TEXT NOT NULL UNIQUE,
  lead_id INTEGER,
  name TEXT NOT NULL,
  discord TEXT NOT NULL,
  email TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'en',
  price REAL NOT NULL,
  autopay INTEGER NOT NULL DEFAULT 0,
  wallet_id TEXT,
  card_token TEXT,
  paid_until TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  last_invoice_id INTEGER,
  notice_for TEXT,
  role_given INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS lab_members_status ON lab_members (status, paid_until);
