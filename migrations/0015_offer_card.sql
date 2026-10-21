-- Price decision card: the AI's recommended price and a cut-down option, so the owner can answer with one button
-- (HQ or Telegram): {"rec": "$450", "cut": {"price": "$300", "scope": "..."}}
ALTER TABLE leads ADD COLUMN offer TEXT;
