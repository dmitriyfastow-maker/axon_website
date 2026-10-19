-- Lead exchange: agency leads are worked by verified partner-closers under SLA, with a full event log.
ALTER TABLE leads ADD COLUMN status TEXT NOT NULL DEFAULT 'new';   -- new | open | claimed | contacted | meeting | proposal | won | lost | archived
ALTER TABLE leads ADD COLUMN service TEXT;                          -- what the client needs (admin-edited)
ALTER TABLE leads ADD COLUMN budget TEXT;                           -- budget range, as known
ALTER TABLE leads ADD COLUMN brief TEXT;                            -- client profile for the closer: business, goals, pains, links
ALTER TABLE leads ADD COLUMN value_usd INTEGER;                     -- deal value once won
ALTER TABLE leads ADD COLUMN closer_id INTEGER REFERENCES partners(id);
ALTER TABLE leads ADD COLUMN claimed_at TEXT;
ALTER TABLE leads ADD COLUMN due_at TEXT;                           -- next SLA deadline; missed = lead returns to the pool
ALTER TABLE leads ADD COLUMN updated_at TEXT;
CREATE INDEX IF NOT EXISTS leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS leads_closer ON leads(closer_id);

ALTER TABLE partners ADD COLUMN closer TEXT NOT NULL DEFAULT 'none'; -- none | applied | approved | paused
ALTER TABLE partners ADD COLUMN closer_app TEXT;                      -- JSON application: english, experience, profile, pitch, timezone
ALTER TABLE partners ADD COLUMN closer_rating REAL;                   -- 1..5, set by the owner after each deal
ALTER TABLE partners ADD COLUMN closer_note TEXT;                     -- owner's private note

CREATE TABLE IF NOT EXISTS lead_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL REFERENCES leads(id),
  at TEXT NOT NULL DEFAULT (datetime('now')),
  actor TEXT NOT NULL,          -- 'owner' | 'partner:<id>' | 'system'
  kind TEXT NOT NULL,           -- status | note | claim | return | publish | edit
  text TEXT
);
CREATE INDEX IF NOT EXISTS lead_events_lead ON lead_events(lead_id);
