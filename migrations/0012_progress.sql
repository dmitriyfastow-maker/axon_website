-- Project progress shown to the client (0–100%), so nobody has to ask "how is it going?".
ALTER TABLE leads ADD COLUMN progress INTEGER;
