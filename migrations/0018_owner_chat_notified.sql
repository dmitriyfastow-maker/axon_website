-- Claude's questions and ideas written straight into D1 (scripts/hq.sh) are sent to the owner's Telegram by the hourly cron.
ALTER TABLE owner_chat ADD COLUMN notified INTEGER NOT NULL DEFAULT 0;
