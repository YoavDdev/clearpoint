-- =====================================================
-- כפה מחיקה של כל מה שקשור לתשלומים
-- =====================================================

-- מחק Views (חייב להיות קודם)
DROP VIEW IF EXISTS upcoming_billings CASCADE;
DROP VIEW IF EXISTS recent_payments CASCADE;
DROP VIEW IF EXISTS active_subscriptions_with_users CASCADE;

-- מחק Functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- הסר עמודות מטבלת users (חשוב!)
DO $$ 
BEGIN
    ALTER TABLE users DROP COLUMN IF EXISTS subscription_id;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Column subscription_id: %', SQLERRM;
END $$;

DO $$ 
BEGIN
    ALTER TABLE users DROP COLUMN IF EXISTS payment_method_on_file;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Column payment_method_on_file: %', SQLERRM;
END $$;

DO $$ 
BEGIN
    ALTER TABLE users DROP COLUMN IF EXISTS billing_email;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Column billing_email: %', SQLERRM;
END $$;

DO $$ 
BEGIN
    ALTER TABLE users DROP COLUMN IF EXISTS tax_id;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Column tax_id: %', SQLERRM;
END $$;

-- מחק טבלאות בכוח
DROP TABLE IF EXISTS subscription_history CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS payments CASCADE;

-- בדוק שהכל נמחק
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('payments', 'subscriptions', 'subscription_history');
    
    IF table_count > 0 THEN
        RAISE WARNING '⚠️ עדיין יש % טבלאות שלא נמחקו!', table_count;
    ELSE
        RAISE NOTICE '✅ כל הטבלאות נמחקו בהצלחה!';
    END IF;
END $$;
