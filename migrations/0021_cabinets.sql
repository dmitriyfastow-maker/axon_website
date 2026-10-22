-- Client cabinets (Decision 16): sign-in by email code or Google, all projects in one place, bonuses, revisions.
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  email TEXT UNIQUE,
  google_sub TEXT UNIQUE,
  name TEXT,
  lang TEXT,
  profile TEXT,            -- JSON: business, site, niche, city, goal (the "fill your profile" task)
  profile_at TEXT
);
CREATE TABLE IF NOT EXISTS client_codes (
  email TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  tries INTEGER NOT NULL DEFAULT 0,
  sent_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS client_sessions (
  token TEXT PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
-- Bonus account: 5% cashback of every payment, tasks (+$5 profile, +$10 review), spends (negative). Pay up to 20%
-- of the next order; positive entries expire after 12 months; never paid out as money.
CREATE TABLE IF NOT EXISTS bonuses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL DEFAULT (datetime('now')),
  client_id INTEGER REFERENCES clients(id),
  lead_id INTEGER REFERENCES leads(id),
  kind TEXT NOT NULL,      -- cashback | profile | review | spend | manual
  amount_usd REAL NOT NULL,
  note TEXT
);
CREATE INDEX IF NOT EXISTS bonuses_client ON bonuses (client_id);
CREATE INDEX IF NOT EXISTS bonuses_lead ON bonuses (lead_id);
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL DEFAULT (datetime('now')),
  lead_id INTEGER NOT NULL UNIQUE REFERENCES leads(id),
  client_id INTEGER REFERENCES clients(id),
  stars INTEGER NOT NULL,
  text TEXT NOT NULL,
  public INTEGER NOT NULL DEFAULT 0  -- the client agreed to show it on the site
);
ALTER TABLE leads ADD COLUMN client_id INTEGER REFERENCES clients(id);
ALTER TABLE leads ADD COLUMN revisions_used INTEGER NOT NULL DEFAULT 0;
ALTER TABLE leads ADD COLUMN revisions_total INTEGER;          -- null = 2 (5 for friends)
ALTER TABLE leads ADD COLUMN brief_confirmed_at TEXT;          -- the contract: the brief the client confirmed
ALTER TABLE leads ADD COLUMN brief_confirmed TEXT;
ALTER TABLE leads ADD COLUMN strategy_url TEXT;
