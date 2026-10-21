-- Owner ↔ Claude chat in the HQ: questions get an instant answer (Workers AI with a company snapshot);
-- tasks and ideas are kept for Claude Code sessions, which read and answer them through D1.
CREATE TABLE IF NOT EXISTS owner_chat (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL DEFAULT (datetime('now')),
  sender TEXT NOT NULL,              -- owner | ai (instant answer) | claude (Claude Code session)
  kind TEXT NOT NULL DEFAULT 'msg',  -- msg | task | idea | question
  text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' -- open | done (tasks, ideas and questions)
);
