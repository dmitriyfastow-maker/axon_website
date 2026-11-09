-- A secret per booking: the client can cancel their own booking by a link (shown after booking and in the calendar event).
ALTER TABLE biz_bookings ADD COLUMN ct TEXT;
