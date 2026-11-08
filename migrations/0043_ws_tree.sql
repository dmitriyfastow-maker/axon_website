-- Decision 45: projects as folders of chats (the tree), pinned messages.
CREATE TABLE IF NOT EXISTS ws_projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  at TEXT NOT NULL DEFAULT (datetime('now'))
);
ALTER TABLE ws_chats ADD COLUMN project_id INTEGER;
ALTER TABLE ws_msgs ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0;
