-- Decision 43d: the hero picture of a site Vax builds, served at /i/<id>.jpg.
CREATE TABLE IF NOT EXISTS site_images (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  who TEXT,
  at TEXT NOT NULL DEFAULT (datetime('now'))
);
