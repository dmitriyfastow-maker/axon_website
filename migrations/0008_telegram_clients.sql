-- Omnichannel, step 1: clients can talk to Vaxo in Telegram (the same bot that notifies the owner).
-- A client opens t.me/<bot>?start=<room> from their project chat, or writes to the bot directly (new lead).
-- Messages go into the same project chat; Vax and managers' replies are relayed back to Telegram.
ALTER TABLE leads ADD COLUMN tg_chat TEXT;   -- client's Telegram chat id (NULL = site chat only)
CREATE UNIQUE INDEX IF NOT EXISTS leads_tg_chat ON leads(tg_chat);
