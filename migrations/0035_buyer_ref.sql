-- Lifetime partner attribution by buyer e-mail (06.11.2026). The first partner link a person arrives by is remembered
-- for good: every later purchase by the same e-mail (templates, plans, projects) keeps paying that partner the
-- lifetime rate (30%) and the partner's sponsor the team bonus (10%). first_lead = the lead of the first paid purchase.
-- The code works before this migration is applied (every query is wrapped).
CREATE TABLE IF NOT EXISTS buyer_ref (
  email TEXT PRIMARY KEY,
  ref TEXT NOT NULL,
  first_lead INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
