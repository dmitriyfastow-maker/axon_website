-- Finance ledger (Decision 16): every incoming payment and every outgoing amount, in the original currency and in
-- UAH at the NBU rate of the day (FOP group 3 counts income in UAH). The FOP holder sees it read-only by a code.
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL DEFAULT (date('now')),
  lead_id INTEGER REFERENCES leads(id),
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  rate REAL NOT NULL DEFAULT 1,          -- NBU UAH per 1 unit of currency on that date
  amount_uah REAL NOT NULL,
  part TEXT NOT NULL DEFAULT 'full',     -- prepay | stage | final | full | support | micro | strategy | product | other
  method TEXT NOT NULL DEFAULT 'bank',   -- bank | card | payoneer | wise | other
  note TEXT,
  source TEXT NOT NULL DEFAULT 'manual', -- manual | bank
  bank_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'ok',     -- ok | refunded | cancelled
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS payments_at ON payments (at);
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL DEFAULT (date('now')),
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'UAH',
  rate REAL NOT NULL DEFAULT 1,
  amount_uah REAL NOT NULL,
  category TEXT NOT NULL DEFAULT 'other', -- partner | owner | tax | esv | service | ads | refund | bank | other
  payout_id INTEGER REFERENCES payouts(id),
  note TEXT,
  status TEXT NOT NULL DEFAULT 'ok',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS expenses_at ON expenses (at);
