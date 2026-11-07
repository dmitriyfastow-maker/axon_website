-- Smart router (Decision 39): what each client's Claude replies cost this month.
CREATE TABLE IF NOT EXISTS api_usage (
  lead_id INTEGER NOT NULL,
  month TEXT NOT NULL,
  usd REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (lead_id, month)
);
