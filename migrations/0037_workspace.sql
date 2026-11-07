-- Workspace (Decision 40): what Vax remembers about a person, saved chats, and modules deployed in one click.
CREATE TABLE IF NOT EXISTS ws_memory (
  client_id INTEGER PRIMARY KEY,
  niche TEXT,
  goals TEXT,
  project TEXT,
  limits TEXT,
  mode TEXT NOT NULL DEFAULT 'short',   -- short | deep
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ws_chats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ws_chats_client ON ws_chats (client_id, updated_at);

CREATE TABLE IF NOT EXISTS ws_msgs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL,
  at TEXT NOT NULL DEFAULT (datetime('now')),
  role TEXT NOT NULL,                   -- user | assistant
  text TEXT NOT NULL,
  tool TEXT,                            -- tool spec, JSON
  doc TEXT,                             -- {"title","body"}, JSON
  image TEXT,                           -- data: URI
  deploy TEXT                           -- crm | partner | site
);
CREATE INDEX IF NOT EXISTS ws_msgs_chat ON ws_msgs (chat_id, id);

-- The public page of a client's business: /s/<slug>. A form feeding their CRM, or a one-page site with that form.
CREATE TABLE IF NOT EXISTS biz_pages (
  biz_id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL DEFAULT 'form',    -- form | site
  data TEXT NOT NULL DEFAULT '{}',
  at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Referral links of a client's own partners. Visits and requests carry source ref_<code>, so they count themselves.
CREATE TABLE IF NOT EXISTS biz_refs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  biz_id INTEGER NOT NULL,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS biz_refs_biz ON biz_refs (biz_id);
