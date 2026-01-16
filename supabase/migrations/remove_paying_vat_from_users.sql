-- Remove paying_vat field from users table
-- Migration created: 2026-01-15
-- User requested to remove the "עוסק מורשה" checkbox field

-- Remove the column
ALTER TABLE public.users
DROP COLUMN IF EXISTS paying_vat;
