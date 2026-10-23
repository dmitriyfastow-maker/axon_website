-- Invoices for bank transfer (UAH, USD SWIFT, EUR SEPA/SWIFT) to the FOP; the client opens /invoice/?t=<token>.
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL DEFAULT (datetime('now')),
  number TEXT NOT NULL UNIQUE,
  token TEXT NOT NULL UNIQUE,
  lead_id INTEGER REFERENCES leads(id),
  buyer TEXT,
  currency TEXT NOT NULL,
  amount REAL NOT NULL,
  description TEXT NOT NULL,
  part TEXT NOT NULL DEFAULT 'full',
  lang TEXT NOT NULL DEFAULT 'en',
  due TEXT,
  status TEXT NOT NULL DEFAULT 'open' -- open | paid | cancelled
);
