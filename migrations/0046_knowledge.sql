-- Decision 47: what the owner tells and uploads about the business (prices, hours, address, rules, examples).
-- The site chat answers from it, and Vax uses it when it writes or rewrites the business's pages.
ALTER TABLE biz ADD COLUMN knowledge TEXT;
