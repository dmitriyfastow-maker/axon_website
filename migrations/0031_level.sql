-- INSIDERS Level: progress saved on the server, sign-in by a one-time code from the email.
CREATE TABLE IF NOT EXISTS level_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL DEFAULT (datetime('now')),
  email TEXT NOT NULL UNIQUE,
  code_hash TEXT,
  code_at TEXT,
  tries INTEGER NOT NULL DEFAULT 0,
  session TEXT,
  state TEXT NOT NULL DEFAULT '{}',
  updated TEXT
);
