-- Decision 42: a client's own domain for their Vaxo site (Cloudflare for SaaS custom hostnames).
CREATE TABLE IF NOT EXISTS biz_domains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  biz_id INTEGER NOT NULL UNIQUE,
  host TEXT NOT NULL UNIQUE,
  cf_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | active | error
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  checked_at TEXT
);
