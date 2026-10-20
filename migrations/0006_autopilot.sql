-- Autopilot: owner settings, anonymous traffic analytics, AI scores, message guard, daily digests.
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
INSERT OR IGNORE INTO settings (key, value) VALUES ('auto_publish', '1'), ('auto_approve', '1'), ('auto_qc', '1'), ('digest', '1');

-- Page views without any personal data: no cookies, no IP — path, referrer site, campaign, country.
CREATE TABLE IF NOT EXISTS pageviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL DEFAULT (datetime('now')),
  path TEXT NOT NULL, ref TEXT, utm TEXT, country TEXT, lang TEXT
);
CREATE INDEX IF NOT EXISTS pageviews_at ON pageviews(at);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL DEFAULT (datetime('now')),
  kind TEXT NOT NULL, path TEXT, country TEXT
);
CREATE INDEX IF NOT EXISTS events_at ON events(at);

ALTER TABLE leads ADD COLUMN score INTEGER;        -- AI 1..10: fit and value of the request
ALTER TABLE leads ADD COLUMN ai_summary TEXT;      -- AI summary of the conversation, refreshed hourly
ALTER TABLE leads ADD COLUMN summary_at TEXT;
ALTER TABLE partners ADD COLUMN ai_score INTEGER;  -- AI grade of the manager application 1..10
ALTER TABLE partners ADD COLUMN strikes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE messages ADD COLUMN flag TEXT;         -- quality-control finding, if any
ALTER TABLE messages ADD COLUMN qc_at TEXT;

CREATE TABLE IF NOT EXISTS digests (id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL DEFAULT (datetime('now')), text TEXT NOT NULL);
