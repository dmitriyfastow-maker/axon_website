-- Client rooms: every lead gets a private chat page (/room/?t=<room>). The client's manager (partner-closer)
-- and the owner talk to the client there; the owner sees every message. Notes are internal (never shown to the client).
ALTER TABLE leads ADD COLUMN room TEXT;
ALTER TABLE leads ADD COLUMN client_seen_at TEXT;
ALTER TABLE leads ADD COLUMN manager_seen_at TEXT;
UPDATE leads SET room = lower(hex(randomblob(12))) WHERE room IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS leads_room ON leads(room);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL REFERENCES leads(id),
  at TEXT NOT NULL DEFAULT (datetime('now')),
  sender TEXT NOT NULL,        -- 'client' | 'partner:<id>' | 'owner' | 'system'
  kind TEXT NOT NULL DEFAULT 'text', -- text | call | note (note = internal)
  text TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_lead ON messages(lead_id);
