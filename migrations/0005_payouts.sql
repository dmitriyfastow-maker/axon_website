-- Commission ledger: created automatically when a lead is won. The owner marks rows paid.
CREATE TABLE IF NOT EXISTS payouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  partner_id INTEGER NOT NULL REFERENCES partners(id),
  lead_id INTEGER NOT NULL REFERENCES leads(id),
  kind TEXT NOT NULL,              -- manager (closed the client) | referral (brought the client by link)
  rate INTEGER NOT NULL,           -- percent
  base_usd INTEGER NOT NULL,       -- deal value
  amount_usd INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'due', -- due | paid | cancelled
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at TEXT,
  UNIQUE (lead_id, kind)
);
CREATE INDEX IF NOT EXISTS payouts_partner ON payouts(partner_id);
