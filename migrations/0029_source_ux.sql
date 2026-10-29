-- Where each lead came from (first touch: utm_source / referrer site / direct) and how people behave on pages.
ALTER TABLE leads ADD COLUMN source TEXT;
CREATE TABLE IF NOT EXISTS ux (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL DEFAULT (datetime('now')),
  sess TEXT, path TEXT, kind TEXT NOT NULL, sel TEXT, x INTEGER, y INTEGER, val INTEGER, src TEXT, country TEXT
);
CREATE INDEX IF NOT EXISTS ux_at ON ux (at);
CREATE INDEX IF NOT EXISTS ux_path ON ux (path, kind);
