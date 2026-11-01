-- Owner app (Decision 29): the client's own business inside Vaxo. One line of code on any site sends visits, clicks
-- and form requests here; the owner and their team see analytics, leads and an AI assistant in /me/.
CREATE TABLE IF NOT EXISTS biz (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL DEFAULT (datetime('now')),
  owner_id INTEGER NOT NULL,          -- clients.id
  name TEXT NOT NULL,
  domain TEXT,                        -- host the snippet may report from (empty = any, until set)
  key TEXT NOT NULL UNIQUE,           -- public snippet key
  about TEXT                          -- business profile for the AI (services, prices, hours)
);
CREATE INDEX IF NOT EXISTS biz_owner ON biz (owner_id);

CREATE TABLE IF NOT EXISTS biz_members (
  biz_id INTEGER NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'manager', -- manager: leads + stats; viewer: stats only
  at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (biz_id, email)
);
CREATE INDEX IF NOT EXISTS biz_members_email ON biz_members (email);

CREATE TABLE IF NOT EXISTS biz_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  biz_id INTEGER NOT NULL,
  at TEXT NOT NULL DEFAULT (datetime('now')),
  type TEXT NOT NULL,                 -- pv | click
  sid TEXT,                           -- per-tab visit id, no cookies
  path TEXT,
  source TEXT,
  label TEXT
);
CREATE INDEX IF NOT EXISTS biz_events_biz_at ON biz_events (biz_id, at);

CREATE TABLE IF NOT EXISTS biz_leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  biz_id INTEGER NOT NULL,
  at TEXT NOT NULL DEFAULT (datetime('now')),
  name TEXT,
  contact TEXT,
  message TEXT,
  source TEXT,
  path TEXT,
  status TEXT NOT NULL DEFAULT 'new', -- new | work | won | lost
  assignee TEXT,                      -- member email
  note TEXT
);
CREATE INDEX IF NOT EXISTS biz_leads_biz ON biz_leads (biz_id, id);
