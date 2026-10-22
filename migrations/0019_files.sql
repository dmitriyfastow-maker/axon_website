-- Files sent in chats (the bytes live in KV; this table is for limits and the HQ).
CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  at TEXT NOT NULL DEFAULT (datetime('now')),
  ip TEXT,
  name TEXT,
  type TEXT,
  size INTEGER,
  descr TEXT -- what is on an image (AI), so Vax understands photos and screenshots
);
CREATE INDEX IF NOT EXISTS files_ip_at ON files (ip, at);
