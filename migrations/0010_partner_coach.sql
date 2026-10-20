-- Partner AI coach: Vax helps partners find clients, write honest outreach and understand the offer.
-- Every question and answer is kept (history for the partner, control for the owner); 30 questions per partner per day.
CREATE TABLE IF NOT EXISTS coach_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  partner_id INTEGER NOT NULL,
  role TEXT NOT NULL,            -- 'user' | 'assistant'
  text TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS coach_partner ON coach_messages(partner_id, id);
