-- Drop recurring_payments table and all related objects
-- Migration created: 2026-01-15

-- Drop trigger first
DROP TRIGGER IF EXISTS update_recurring_payments_updated_at ON public.recurring_payments;

-- Drop function
DROP FUNCTION IF EXISTS update_recurring_payments_updated_at();

-- Drop policies
DROP POLICY IF EXISTS "Users can view own recurring payments" ON public.recurring_payments;
DROP POLICY IF EXISTS "Service role can manage recurring payments" ON public.recurring_payments;

-- Drop indexes (will be dropped automatically with table, but listing for clarity)
DROP INDEX IF EXISTS public.idx_recurring_payments_user_id;
DROP INDEX IF EXISTS public.idx_recurring_payments_recurring_uid;
DROP INDEX IF EXISTS public.idx_recurring_payments_customer_uid;
DROP INDEX IF EXISTS public.idx_recurring_payments_is_active;
DROP INDEX IF EXISTS public.idx_recurring_payments_next_charge_date;

-- Drop table
DROP TABLE IF EXISTS public.recurring_payments CASCADE;
