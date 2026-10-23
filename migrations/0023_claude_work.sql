-- "📋 Работа Claude" in the HQ: everything Claude did — clients found and the messages for them, site drafts, videos,
-- documents, partner lists, site changes. Claude adds rows (scripts/hq.sh work); the owner reviews and comments.
CREATE TABLE IF NOT EXISTS claude_work (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL DEFAULT (datetime('now')),
  kind TEXT NOT NULL,        -- clients | partners | draft | video | doc | site | research | outreach
  title TEXT NOT NULL,
  body TEXT,                 -- the content itself (messages, lists, what changed) — plain text / light markdown
  link TEXT,                 -- an external link (a document, a page)
  file TEXT,                 -- our file: /f/<id>/<name> (video, image) or /p/<id> (site draft preview)
  status TEXT NOT NULL DEFAULT 'ready', -- ready | waiting (needs the owner's yes) | sent | rejected | done
  note TEXT                  -- the owner's comment
);
CREATE INDEX IF NOT EXISTS claude_work_at ON claude_work (at);
