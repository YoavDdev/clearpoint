-- ======================================================
-- Subscription Management System - Full Features
-- Trial, Pause, Cancel at period end
-- ======================================================

-- 1. הוספת עמודות חדשות ל-subscriptions
ALTER TABLE subscriptions 
  -- Trial period (חודש ראשון חינם)
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 30,
  
  -- Pause/Resume (רק אדמין)
  ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paused_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pause_reason TEXT,
  
  -- Cancel at period end (ביטול בסוף תקופה)
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE,
  
  -- Current period tracking
  ADD COLUMN IF NOT EXISTS current_period_start DATE,
  ADD COLUMN IF NOT EXISTS current_period_end DATE,
  
  -- Payment method
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'credit_card',
  
  -- Sync tracking
  ADD COLUMN IF NOT EXISTS last_sync_with_payplus TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payplus_status VARCHAR(50),
  
  -- Grace period
  ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_failures INTEGER DEFAULT 0;

-- 2. עדכון status constraint לכלול trial
DO $$ 
BEGIN
  -- הסר constraint קיים
  ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
  
  -- הוסף constraint חדש עם כל הסטטוסים
  ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_check 
    CHECK (status IN (
      'trial',           -- תקופת ניסיון
      'active',          -- פעיל
      'paused',          -- מוקפא (רק אדמין)
      'cancelled',       -- מבוטל
      'expired',         -- פג תוקף
      'pending',         -- ממתין לאישור לקוח
      'suspended'        -- מושעה (3+ כשלונות)
    ));
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not modify status constraint: %', SQLERRM;
END $$;

-- 3. אינדקסים לביצועים
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_ends ON subscriptions(trial_ends_at) 
  WHERE trial_ends_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_paused_until ON subscriptions(paused_until)
  WHERE paused_until IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_cancel_at_period ON subscriptions(cancel_at_period_end)
  WHERE cancel_at_period_end = TRUE;

CREATE INDEX IF NOT EXISTS idx_subscriptions_status_active ON subscriptions(status)
  WHERE status IN ('trial', 'active');

-- 4. פונקציה למציאת trials שמסתיימים
DROP FUNCTION IF EXISTS find_expiring_trials();
CREATE OR REPLACE FUNCTION find_expiring_trials()
RETURNS TABLE (
  subscription_id UUID,
  user_id UUID,
  trial_ends_at TIMESTAMPTZ,
  days_remaining INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.user_id,
    s.trial_ends_at,
    EXTRACT(DAY FROM s.trial_ends_at - NOW())::INTEGER as days_remaining
  FROM subscriptions s
  WHERE 
    s.status = 'trial'
    AND s.trial_ends_at IS NOT NULL
    AND s.trial_ends_at <= NOW() + INTERVAL '3 days' -- trials שמסתיימים בעוד 3 ימים
  ORDER BY s.trial_ends_at ASC;
END;
$$ LANGUAGE plpgsql;

-- 5. פונקציה למציאת מנויים לחידוש מהקפאה
DROP FUNCTION IF EXISTS find_paused_to_resume();
CREATE OR REPLACE FUNCTION find_paused_to_resume()
RETURNS TABLE (
  subscription_id UUID,
  user_id UUID,
  paused_until TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.user_id,
    s.paused_until
  FROM subscriptions s
  WHERE 
    s.status = 'paused'
    AND s.paused_until IS NOT NULL
    AND s.paused_until <= NOW()
  ORDER BY s.paused_until ASC;
END;
$$ LANGUAGE plpgsql;

-- 6. פונקציה למציאת מנויים לביטול
DROP FUNCTION IF EXISTS find_subscriptions_to_cancel();
CREATE OR REPLACE FUNCTION find_subscriptions_to_cancel()
RETURNS TABLE (
  subscription_id UUID,
  user_id UUID,
  current_period_end DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.user_id,
    s.current_period_end
  FROM subscriptions s
  WHERE 
    s.cancel_at_period_end = TRUE
    AND s.status IN ('trial', 'active')
    AND s.current_period_end <= CURRENT_DATE
  ORDER BY s.current_period_end ASC;
END;
$$ LANGUAGE plpgsql;

-- 7. פונקציה לבדיקת גישה למנוי
DROP FUNCTION IF EXISTS check_subscription_access(UUID);
CREATE OR REPLACE FUNCTION check_subscription_access(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  sub RECORD;
  result JSONB;
BEGIN
  -- מצא מנוי פעיל
  SELECT * INTO sub
  FROM subscriptions
  WHERE user_id = p_user_id
    AND status IN ('trial', 'active', 'paused')
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- אין מנוי
  IF sub IS NULL THEN
    RETURN jsonb_build_object(
      'has_access', FALSE,
      'reason', 'no_subscription'
    );
  END IF;
  
  -- בדיקת trial
  IF sub.status = 'trial' THEN
    IF sub.trial_ends_at IS NOT NULL AND NOW() > sub.trial_ends_at THEN
      RETURN jsonb_build_object(
        'has_access', FALSE,
        'reason', 'trial_ended',
        'trial_ended_at', sub.trial_ends_at
      );
    END IF;
    RETURN jsonb_build_object(
      'has_access', TRUE,
      'type', 'trial',
      'trial_ends_at', sub.trial_ends_at
    );
  END IF;
  
  -- מנוי מוקפא
  IF sub.status = 'paused' THEN
    RETURN jsonb_build_object(
      'has_access', FALSE,
      'reason', 'paused',
      'paused_until', sub.paused_until
    );
  END IF;
  
  -- בדיקת ביטול מתוזמן
  IF sub.cancel_at_period_end = TRUE THEN
    IF sub.current_period_end IS NOT NULL AND CURRENT_DATE > sub.current_period_end THEN
      RETURN jsonb_build_object(
        'has_access', FALSE,
        'reason', 'cancelled',
        'cancelled_at', sub.current_period_end
      );
    END IF;
    -- עדיין בתוך תקופת המנוי
    RETURN jsonb_build_object(
      'has_access', TRUE,
      'type', 'active_until_cancel',
      'ends_at', sub.current_period_end
    );
  END IF;
  
  -- פעיל תקין
  RETURN jsonb_build_object(
    'has_access', TRUE,
    'type', 'active',
    'subscription_id', sub.id
  );
END;
$$ LANGUAGE plpgsql;

-- 8. הצגת סיכום
SELECT 
  '✅ Subscription management features added' as status,
  COUNT(*) as columns_added
FROM information_schema.columns
WHERE table_name = 'subscriptions' 
  AND column_name IN (
    'trial_ends_at', 
    'paused_at', 
    'cancel_at_period_end',
    'current_period_end'
  );

-- 9. בדיקת הפונקציות
SELECT 
  'Functions created:' as info,
  COUNT(*) as count
FROM pg_proc
WHERE proname IN (
  'find_expiring_trials',
  'find_paused_to_resume',
  'find_subscriptions_to_cancel',
  'check_subscription_access'
);

-- 10. הצגת סטטוסים אפשריים
SELECT 
  'Available statuses:' as info,
  status
FROM (
  VALUES 
    ('trial'),
    ('active'),
    ('paused'),
    ('cancelled'),
    ('expired'),
    ('pending'),
    ('suspended')
) AS statuses(status);

COMMENT ON COLUMN subscriptions.trial_ends_at IS 'תאריך סיום תקופת ניסיון (30 יום חינם)';
COMMENT ON COLUMN subscriptions.paused_at IS 'תאריך הקפאת מנוי (רק אדמין)';
COMMENT ON COLUMN subscriptions.cancel_at_period_end IS 'ביטול בסוף תקופה נוכחית (ללא החזר)';
COMMENT ON COLUMN subscriptions.current_period_end IS 'סוף תקופת חיוב נוכחית';
COMMENT ON COLUMN subscriptions.payment_method IS 'credit_card או direct_debit';
