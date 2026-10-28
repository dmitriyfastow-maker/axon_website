-- Fiscal receipt of a card payment: mono -> Checkbox PRRO makes it from basketOrder; we keep the tax-site link
-- (taxUrl) to show on the invoice and send to the client, and the last mono status for the HQ.
ALTER TABLE invoices ADD COLUMN receipt_url TEXT;
ALTER TABLE invoices ADD COLUMN mono_status TEXT;
