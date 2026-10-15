-- Partner program: accounts, unlimited tracking links, clicks, sessions.
CREATE TABLE IF NOT EXISTS partners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  pass_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,          -- invite code for the partner's own team
  parent_id INTEGER REFERENCES partners(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  partner_id INTEGER NOT NULL REFERENCES partners(id),
  slug TEXT NOT NULL UNIQUE,          -- vaxogroup.com/r/<slug>; also the ?ref= value saved with leads
  name TEXT NOT NULL,
  target TEXT NOT NULL DEFAULT '/start/',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS links_partner ON links(partner_id);
CREATE TABLE IF NOT EXISTS clicks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  link_id INTEGER NOT NULL REFERENCES links(id),
  at TEXT NOT NULL DEFAULT (datetime('now')),
  country TEXT
);
CREATE INDEX IF NOT EXISTS clicks_link ON clicks(link_id);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  partner_id INTEGER NOT NULL REFERENCES partners(id),
  expires_at TEXT NOT NULL
);
