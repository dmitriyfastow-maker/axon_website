-- Client referrals (04.11.2026): every client gets a personal invite link. A friend who comes by a client's or a
-- partner's link gets 2 free months instead of 1. The inviting client earns +1 free month of their own plan (a service
-- credit, never cash) per friend whose first paid payment stays 14 days. Partners keep cash commissions (payouts).
-- The code works before this migration is applied (every query is wrapped and falls back to empty results).

-- The subscription plan of a lead: personal | care | growth | pro | start (NULL = not a subscription / unknown).
ALTER TABLE leads ADD COLUMN plan TEXT;

-- One personal invite code per client: vaxogroup.com/r/<slug> (slug starts with "c_").
CREATE TABLE IF NOT EXISTS client_refs (
  client_id INTEGER PRIMARY KEY,       -- clients.id
  slug TEXT NOT NULL UNIQUE,
  clicks INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- One attribution per new client (first link wins). Also records partner-link arrivals, so a client never brings
-- both a partner commission and a client credit.
CREATE TABLE IF NOT EXISTS referrals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL DEFAULT (datetime('now')),
  lead_id INTEGER NOT NULL UNIQUE,     -- the invited friend's first lead
  slug TEXT NOT NULL,                  -- the link used
  kind TEXT NOT NULL,                  -- client | partner
  referrer_client_id INTEGER,          -- kind = client
  referrer_partner_id INTEGER,         -- kind = partner
  ip_hash TEXT,                        -- sha-256 of the visitor IP (burst detection only)
  friend_months INTEGER NOT NULL DEFAULT 2, -- free months for the invited friend
  status TEXT NOT NULL DEFAULT 'attributed', -- attributed | pending (paid, 14-day hold) | credited | cancelled | review | rejected
  reason TEXT,                         -- why cancelled / under review
  plan TEXT,                           -- the friend's paid plan
  payment_id INTEGER,                  -- the friend's first paid payment
  hold_until TEXT,                     -- pending → credited after this date
  credit_usd REAL,                     -- value of the free month = the cheaper of the two plans
  credited_at TEXT
);
CREATE INDEX IF NOT EXISTS referrals_client ON referrals (referrer_client_id, status);
CREATE INDEX IF NOT EXISTS referrals_status ON referrals (status);
