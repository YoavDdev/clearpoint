-- Add payment_link column to recurring_payments table
-- This stores the PayPlus payment page URL so admin and customer can access it later
ALTER TABLE recurring_payments ADD COLUMN IF NOT EXISTS payment_link TEXT;
