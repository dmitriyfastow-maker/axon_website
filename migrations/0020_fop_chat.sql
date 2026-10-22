-- The FOP holder's assistant chat on /fin/ (her questions, AI answers, Dmitry's replies).
CREATE TABLE IF NOT EXISTS fop_chat (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL DEFAULT (datetime('now')),
  sender TEXT NOT NULL, -- fop | ai | owner
  text TEXT NOT NULL
);
