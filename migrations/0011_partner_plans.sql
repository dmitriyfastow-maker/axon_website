-- Content partners (clippers) choose how they are paid: 30% of the first sale, or 10% of every sale for life.
ALTER TABLE partners ADD COLUMN plan TEXT NOT NULL DEFAULT 'classic'; -- classic (30% + 10% for life) | first30 | life10
