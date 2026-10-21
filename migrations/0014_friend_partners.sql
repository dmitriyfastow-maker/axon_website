-- "Friends" chain: partners who joined through the owner's friend link (or were invited by such a partner)
-- can make "for friends" links — their clients get the friends mode (price by agreement). Others never see it.
ALTER TABLE partners ADD COLUMN friend INTEGER NOT NULL DEFAULT 0;
ALTER TABLE links ADD COLUMN friend INTEGER NOT NULL DEFAULT 0;
