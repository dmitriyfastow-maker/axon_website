-- AI manager: Vax answers every client in the project chat 24/7; a human manager joins only for a live call.
ALTER TABLE leads ADD COLUMN ai TEXT NOT NULL DEFAULT 'on';   -- on | paused (a human took over)
ALTER TABLE leads ADD COLUMN profile TEXT;                     -- JSON communication profile: tone, priorities, concerns
ALTER TABLE leads ADD COLUMN stage TEXT;                       -- project after payment: work | qa | review | revisions | delivered
ALTER TABLE leads ADD COLUMN stage_due TEXT;                   -- date promised to the client for the current stage
ALTER TABLE leads ADD COLUMN human TEXT;                       -- why a live manager is needed (NULL = not needed)
ALTER TABLE leads ADD COLUMN followups INTEGER NOT NULL DEFAULT 0; -- AI follow-ups sent after silence or delivery
