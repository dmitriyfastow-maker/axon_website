-- Decision 43: a draft site from the Canvas lives with its message; a Canvas document can get a public read-only link.
ALTER TABLE ws_msgs ADD COLUMN site TEXT;
CREATE TABLE IF NOT EXISTS ws_pub (
  slug TEXT PRIMARY KEY,
  client_id INTEGER NOT NULL,
  msg_id INTEGER NOT NULL UNIQUE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);
