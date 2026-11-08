-- Decision 43b: the workspace limit is a share of work done (like Claude), kept apart from chats so deleting one changes nothing.
CREATE TABLE IF NOT EXISTS ws_work (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  at TEXT NOT NULL DEFAULT (datetime('now')),
  work REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS ws_work_client_at ON ws_work (client_id, at);
