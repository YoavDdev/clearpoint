-- ======================================================
-- Phase 1: Advanced Subscription Management
-- הוספת סטטוסים מתקדמים ומעקב סנכרון
-- ======================================================

-- 1. הוספת עמודות חדשות ל-subscriptions
ALTER TABLE subscriptions 
  ADD COLUMN IF NOT EXISTS last_sync_with_payplus TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_verification_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payplus_status VARCHAR(50),
  ADD COLUMN IF NOT EXISTS payment_failure_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
  ADD COLUMN IF NOT EXISTS sync_errors JSONB DEFAULT '[]'::jsonb;

-- 2. יצירת טבלת היסטוריית סנכרון
CREATE TABLE IF NOT EXISTS subscription_sync_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  sync_type VARCHAR(50) NOT NULL, -- 'manual', 'cron', 'webhook', 'auto'
  sync_source VARCHAR(50), -- 'admin_panel', 'api', 'cron_job'
  status VARCHAR(50) NOT NULL, -- 'success', 'partial_success', 'failed'
  
  -- פרטי הסנכרון
  charges_found INT DEFAULT 0,
  charges_synced INT DEFAULT 0,
  invoices_created INT DEFAULT 0,
  emails_sent INT DEFAULT 0,
  
  -- נתונים מ-PayPlus
  payplus_status VARCHAR(50),
  payplus_next_charge_date DATE,
  payplus_last_charge_date DATE,
  
  -- שגיאות ומידע נוסף
  errors JSONB DEFAULT '[]'::jsonb,
  warnings JSONB DEFAULT '[]'::jsonb,
  sync_details JSONB,
  
  -- timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. אינדקסים לביצועים
CREATE INDEX IF NOT EXISTS idx_sync_history_subscription ON subscription_sync_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_sync_history_user ON subscription_sync_history(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_history_status ON subscription_sync_history(status);
CREATE INDEX IF NOT EXISTS idx_sync_history_created ON subscription_sync_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_payment ON subscriptions(next_payment_date);

-- 4. עדכון constraint על status לתמוך בסטטוסים החדשים
-- (אם יש constraint קיים, נצטרך להסיר אותו ולהוסיף חדש)
DO $$ 
BEGIN
  -- הסר constraint קיים אם יש
  ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
  
  -- הוסף constraint חדש עם כל הסטטוסים
  ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_check 
    CHECK (status IN (
      'active',
      'cancelled',
      'expired',
      'pending',
      'pending_first_payment',
      'payment_failed',
      'grace_period',
      'suspended',
      'pending_cancellation'
    ));
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not modify status constraint: %', SQLERRM;
END $$;

-- 5. פונקציה עזר לבדיקת תקינות מנוי
CREATE OR REPLACE FUNCTION check_subscription_health(sub_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  sub_record RECORD;
  last_charge_date DATE;
  expected_charge_date DATE;
BEGIN
  -- שלוף את המנוי
  SELECT * INTO sub_record FROM subscriptions WHERE id = sub_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Subscription not found');
  END IF;
  
  -- בדוק תאריך חיוב אחרון
  SELECT MAX(charged_at::DATE) INTO last_charge_date
  FROM subscription_charges
  WHERE subscription_id = sub_id AND status = 'success';
  
  -- חשב מתי היה אמור להיות חיוב
  expected_charge_date := sub_record.last_payment_date;
  IF expected_charge_date IS NULL THEN
    expected_charge_date := sub_record.created_at::DATE;
  END IF;
  
  -- בנה תוצאה
  result := jsonb_build_object(
    'subscription_id', sub_id,
    'status', sub_record.status,
    'is_healthy', (sub_record.status = 'active' AND sub_record.payment_failures < 3),
    'last_charge_date', last_charge_date,
    'expected_charge_date', expected_charge_date,
    'next_charge_date', sub_record.next_payment_date,
    'payment_failures', sub_record.payment_failures,
    'days_since_last_charge', CURRENT_DATE - last_charge_date,
    'needs_sync', (
      sub_record.last_sync_with_payplus IS NULL OR
      sub_record.last_sync_with_payplus < NOW() - INTERVAL '7 days'
    ),
    'needs_verification', (
      sub_record.last_verification_at IS NULL OR
      sub_record.last_verification_at < NOW() - INTERVAL '1 day'
    )
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 6. פונקציה למציאת מנויים שצריכים סנכרון
CREATE OR REPLACE FUNCTION find_subscriptions_needing_sync()
RETURNS TABLE (
  subscription_id UUID,
  user_id UUID,
  reason TEXT,
  priority INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.user_id,
    CASE
      WHEN s.last_sync_with_payplus IS NULL THEN 'never_synced'
      WHEN s.last_sync_with_payplus < NOW() - INTERVAL '7 days' THEN 'stale_sync'
      WHEN s.payment_failures > 0 THEN 'has_failures'
      WHEN s.status = 'payment_failed' THEN 'payment_failed'
      ELSE 'routine_check'
    END as reason,
    CASE
      WHEN s.status = 'payment_failed' THEN 1
      WHEN s.payment_failures > 0 THEN 2
      WHEN s.last_sync_with_payplus IS NULL THEN 3
      ELSE 4
    END as priority
  FROM subscriptions s
  WHERE 
    s.status IN ('active', 'payment_failed', 'grace_period', 'pending_first_payment')
    AND (
      s.last_sync_with_payplus IS NULL OR
      s.last_sync_with_payplus < NOW() - INTERVAL '7 days' OR
      s.payment_failures > 0 OR
      s.status = 'payment_failed'
    )
  ORDER BY priority ASC, s.last_sync_with_payplus ASC NULLS FIRST
  LIMIT 100;
END;
$$ LANGUAGE plpgsql;

-- 7. הצג סיכום
SELECT 
  'Columns added to subscriptions' as action,
  COUNT(*) as count
FROM information_schema.columns
WHERE table_name = 'subscriptions' 
  AND column_name IN ('last_sync_with_payplus', 'payplus_status', 'grace_period_ends_at')

UNION ALL

SELECT 
  'subscription_sync_history table created',
  COUNT(*)
FROM information_schema.tables
WHERE table_name = 'subscription_sync_history'

UNION ALL

SELECT
  'Indexes created',
  COUNT(*)
FROM pg_indexes
WHERE tablename IN ('subscriptions', 'subscription_sync_history')
  AND indexname LIKE '%sync%';

-- 8. בדיקת תקינות - הצג מנויים שצריכים סנכרון
SELECT 
  'Subscriptions needing sync' as info,
  COUNT(*) as count
FROM find_subscriptions_needing_sync();
