-- Every lead from the site form, kept permanently (Telegram/email are only notifications).
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  mode TEXT NOT NULL,
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  interest TEXT,
  message TEXT,
  lang TEXT,
  ref TEXT,
  country TEXT,
  page TEXT
);
CREATE INDEX IF NOT EXISTS leads_ref ON leads(ref);
