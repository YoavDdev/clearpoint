-- =====================================================
-- סקריפט ניקוי - הרץ את זה לפני create-payments-schema.sql
-- =====================================================

-- כבה RLS זמנית (מתעלם משגיאות אם לא קיים)
DO $$ 
BEGIN
    ALTER TABLE IF EXISTS payments DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS subscriptions DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS subscription_history DISABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'RLS disable skipped: %', SQLERRM;
END $$;

-- מחק Policies (מתעלם משגיאות)
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view their own payments" ON payments;
    DROP POLICY IF EXISTS "Admins can view all payments" ON payments;
    DROP POLICY IF EXISTS "Users can view their own subscription" ON subscriptions;
    DROP POLICY IF EXISTS "Admins can view all subscriptions" ON subscriptions;
    DROP POLICY IF EXISTS "Users can view their own subscription history" ON subscription_history;
    DROP POLICY IF EXISTS "Admins can view all subscription history" ON subscription_history;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Policy drop skipped: %', SQLERRM;
END $$;

-- מחק Triggers (מתעלם משגיאות)
DO $$ 
BEGIN
    DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
    DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Trigger drop skipped: %', SQLERRM;
END $$;

-- מחק Function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- מחק Views
DROP VIEW IF EXISTS upcoming_billings CASCADE;
DROP VIEW IF EXISTS recent_payments CASCADE;
DROP VIEW IF EXISTS active_subscriptions_with_users CASCADE;

-- מחק אינדקסים
DROP INDEX IF EXISTS idx_subscriptions_next_billing_date;
DROP INDEX IF EXISTS idx_subscriptions_provider_subscription_id;
DROP INDEX IF EXISTS idx_subscriptions_status;
DROP INDEX IF EXISTS idx_subscriptions_user_id;

DROP INDEX IF EXISTS idx_payments_user_status;
DROP INDEX IF EXISTS idx_payments_created_at;
DROP INDEX IF EXISTS idx_payments_provider_payment_id;
DROP INDEX IF EXISTS idx_payments_status;
DROP INDEX IF EXISTS idx_payments_user_id;

DROP INDEX IF EXISTS idx_subscription_history_created_at;
DROP INDEX IF EXISTS idx_subscription_history_user_id;
DROP INDEX IF EXISTS idx_subscription_history_subscription_id;

-- הסר עמודות מטבלת users
ALTER TABLE IF EXISTS users DROP COLUMN IF EXISTS subscription_id CASCADE;
ALTER TABLE IF EXISTS users DROP COLUMN IF EXISTS payment_method_on_file CASCADE;
ALTER TABLE IF EXISTS users DROP COLUMN IF EXISTS billing_email CASCADE;
ALTER TABLE IF EXISTS users DROP COLUMN IF EXISTS tax_id CASCADE;

-- מחק טבלאות
DROP TABLE IF EXISTS subscription_history CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS payments CASCADE;

-- אישור
SELECT 'Cleanup completed successfully!' as status;
