-- Decision 47: online booking on the sites Vax builds. One row per booked time; a time is free while fewer rows than
-- people working at once (site.book.cap) hold it with status 'booked'.
CREATE TABLE IF NOT EXISTS biz_bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  biz_id INTEGER NOT NULL,
  slug TEXT NOT NULL,
  day TEXT NOT NULL,          -- YYYY-MM-DD in the business's time zone
  time TEXT NOT NULL,         -- HH:MM
  service TEXT,
  lead_id INTEGER,
  status TEXT NOT NULL DEFAULT 'booked', -- booked | cancelled
  at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS biz_bookings_slot ON biz_bookings (biz_id, slug, day, time);
