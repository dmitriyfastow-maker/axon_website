-- Decision 43c: every site Vax builds goes live at once on its own /s/<slug>; requests from all of them land in the owner's one CRM.
CREATE TABLE IF NOT EXISTS ws_sites (
  slug TEXT PRIMARY KEY,
  client_id INTEGER NOT NULL,
  biz_id INTEGER NOT NULL,
  data TEXT NOT NULL,
  at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ws_sites_client ON ws_sites (client_id, at);
