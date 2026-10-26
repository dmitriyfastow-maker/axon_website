-- Card payment of an invoice through plata by mono: the id of the last mono payment page created for it.
ALTER TABLE invoices ADD COLUMN mono_id TEXT;
CREATE INDEX IF NOT EXISTS invoices_mono ON invoices(mono_id);
