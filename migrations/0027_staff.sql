-- Team access to the HQ / CRM (worker/staff.ts): people invited by the owner, one-time email codes, sessions.
CREATE TABLE IF NOT EXISTS staff (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'viewer',  -- owner | admin | manager | finance | marketing | viewer
  sections TEXT,                        -- JSON list of HQ sections this person sees
  can_write INTEGER NOT NULL DEFAULT 1, -- 0 = look only
  active INTEGER NOT NULL DEFAULT 1,
  invited_by TEXT,
  last_login TEXT
);
CREATE TABLE IF NOT EXISTS staff_codes (
  email TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  tries INTEGER NOT NULL DEFAULT 0,
  sent_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS staff_sessions (
  token TEXT PRIMARY KEY,               -- sha256 of the bearer value
  staff_id INTEGER NOT NULL REFERENCES staff(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
