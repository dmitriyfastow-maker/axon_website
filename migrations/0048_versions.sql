-- 18.11: undo for what Vax and the person change — the previous version of a site or a document, newest 20 per item.
CREATE TABLE IF NOT EXISTS ws_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  kind TEXT NOT NULL,
  ref TEXT NOT NULL,
  data TEXT NOT NULL,
  at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ws_versions_ref ON ws_versions (client_id, kind, ref, id);
