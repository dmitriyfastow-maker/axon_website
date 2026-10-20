-- Omnichannel, step 2: clients can write to hello@vaxogroup.com (Cloudflare Email Routing → this worker).
-- The letter lands in the client's project chat; replies go back by email (Resend) once the owner turns it on.
ALTER TABLE leads ADD COLUMN email_addr TEXT;   -- client's email for the email channel (NULL = not linked)
CREATE INDEX IF NOT EXISTS leads_email_addr ON leads(email_addr);
INSERT OR IGNORE INTO settings (key, value) VALUES ('email_replies', '0');
