-- =====================================================
-- Migration: הוספת שדות למעקב מנויים ותשלומים
-- תאריך: 2025-12-19
-- תיאור: תמיכה מלאה במעקב אחר הוראות קבע דרך PayPlus
--         (כרטיס אשראי + הוראת קבע בנקאית)
-- =====================================================

-- שלב 1: הוספת שדות לטבלת subscriptions
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS recurring_uid TEXT,                    -- מזהה PayPlus recurring
ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('credit_card', 'direct_debit', 'manual')),  -- שיטת תשלום
ADD COLUMN IF NOT EXISTS grace_period_end TIMESTAMP WITH TIME ZONE,  -- סוף תקופת חסד אחרי ביטול
ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP WITH TIME ZONE, -- תאריך חיוב אחרון
ADD COLUMN IF NOT EXISTS next_payment_date TIMESTAMP WITH TIME ZONE, -- תאריך חיוב הבא
ADD COLUMN IF NOT EXISTS free_trial_end TIMESTAMP WITH TIME ZONE,    -- סוף חודש חינם
ADD COLUMN IF NOT EXISTS payment_failures INTEGER DEFAULT 0,         -- ספירת כשלונות תשלום
ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true,            -- חידוש אוטומטי
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,      -- תאריך ביטול
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;                   -- סיבת ביטול

-- שלב 2: הוספת אינדקסים לביצועים
CREATE INDEX IF NOT EXISTS idx_subscriptions_recurring_uid ON subscriptions(recurring_uid);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_payment ON subscriptions(next_payment_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_subscriptions_grace_period ON subscriptions(grace_period_end) WHERE status = 'cancelled';

-- שלב 3: הוספת פונקציה לבדיקת גישת מנוי
CREATE OR REPLACE FUNCTION check_subscription_access(user_id_param UUID)
RETURNS TABLE(
  has_access BOOLEAN,
  reason TEXT,
  subscription_id UUID,
  status TEXT,
  expires_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  sub RECORD;
  now_time TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
  -- מצא מנוי פעיל או מבוטל
  SELECT * INTO sub
  FROM subscriptions
  WHERE user_id = user_id_param
    AND (status = 'active' OR (status = 'cancelled' AND grace_period_end > now_time))
  ORDER BY created_at DESC
  LIMIT 1;

  -- אין מנוי בכלל
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'no_subscription', NULL::UUID, 'none', NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  END IF;

  -- בתקופת ניסיון חינם
  IF sub.free_trial_end IS NOT NULL AND sub.free_trial_end > now_time THEN
    RETURN QUERY SELECT true, 'free_trial', sub.id, sub.status, sub.free_trial_end;
    RETURN;
  END IF;

  -- מנוי פעיל עם recurring
  IF sub.status = 'active' AND sub.recurring_uid IS NOT NULL THEN
    -- בדוק אם יש יותר מדי כשלונות תשלום
    IF sub.payment_failures >= 3 THEN
      RETURN QUERY SELECT false, 'payment_failed', sub.id, sub.status, sub.next_payment_date;
      RETURN;
    END IF;
    
    RETURN QUERY SELECT true, 'active_subscription', sub.id, sub.status, sub.next_payment_date;
    RETURN;
  END IF;

  -- מנוי מבוטל אבל בתקופת חסד
  IF sub.status = 'cancelled' AND sub.grace_period_end > now_time THEN
    RETURN QUERY SELECT true, 'grace_period', sub.id, sub.status, sub.grace_period_end;
    RETURN;
  END IF;

  -- ברירת מחדל - אין גישה
  RETURN QUERY SELECT false, 'expired', sub.id, sub.status, sub.cancelled_at;
END;
$$ LANGUAGE plpgsql;

-- שלב 4: הוספת טבלת לוג לחיובים (tracking)
CREATE TABLE IF NOT EXISTS subscription_charges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'ILS',
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
  transaction_id TEXT,                          -- PayPlus transaction UID
  recurring_uid TEXT,                           -- PayPlus recurring UID
  payment_method TEXT,                          -- credit_card / direct_debit
  error_code TEXT,                              -- קוד שגיאה במקרה של כשלון
  error_message TEXT,                           -- הודעת שגיאה
  charged_at TIMESTAMP WITH TIME ZONE,          -- מתי חויב
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB                                -- מידע נוסף מ-PayPlus
);

-- אינדקסים לטבלת חיובים
CREATE INDEX IF NOT EXISTS idx_subscription_charges_subscription ON subscription_charges(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_charges_user ON subscription_charges(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_charges_status ON subscription_charges(status);
CREATE INDEX IF NOT EXISTS idx_subscription_charges_recurring ON subscription_charges(recurring_uid);

-- שלב 5: עדכון RLS policies
ALTER TABLE subscription_charges ENABLE ROW LEVEL SECURITY;

-- משתמש רגיל יכול לראות רק את החיובים שלו
CREATE POLICY "Users can view their own charges"
  ON subscription_charges FOR SELECT
  USING (auth.uid() = user_id);

-- Admin יכול לראות הכל
CREATE POLICY "Admins can view all charges"
  ON subscription_charges FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- שלב 6: Trigger לעדכון אוטומטי של next_payment_date
CREATE OR REPLACE FUNCTION update_next_payment_date()
RETURNS TRIGGER AS $$
BEGIN
  -- אם זה חיוב מוצלח, עדכן את next_payment_date
  IF NEW.status = 'success' AND OLD.status != 'success' THEN
    UPDATE subscriptions
    SET 
      last_payment_date = NEW.charged_at,
      next_payment_date = CASE 
        WHEN billing_cycle = 'monthly' THEN NEW.charged_at + INTERVAL '1 month'
        WHEN billing_cycle = 'yearly' THEN NEW.charged_at + INTERVAL '1 year'
        ELSE next_payment_date
      END,
      payment_failures = 0
    WHERE id = NEW.subscription_id;
  END IF;

  -- אם זה כשלון, הגדל את payment_failures
  IF NEW.status = 'failed' AND OLD.status != 'failed' THEN
    UPDATE subscriptions
    SET payment_failures = payment_failures + 1
    WHERE id = NEW.subscription_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_payment_dates
  AFTER UPDATE ON subscription_charges
  FOR EACH ROW
  EXECUTE FUNCTION update_next_payment_date();

-- שלב 7: הוספת הערות לתיעוד
COMMENT ON COLUMN subscriptions.recurring_uid IS 'PayPlus recurring payment UID';
COMMENT ON COLUMN subscriptions.payment_method IS 'שיטת תשלום: credit_card (כרטיס אשראי) או direct_debit (הוראת קבע בנקאית)';
COMMENT ON COLUMN subscriptions.free_trial_end IS 'סוף החודש החינם (מתנה ללקוחות חדשים)';
COMMENT ON COLUMN subscriptions.grace_period_end IS 'לקוח שביטל ממשיך לקבל גישה עד סוף החודש ששולם';
COMMENT ON COLUMN subscriptions.payment_failures IS 'ספירת כשלונות תשלום רצופים (אחרי 3 - חסימת גישה)';
COMMENT ON TABLE subscription_charges IS 'לוג של כל החיובים החודשיים (הצלחות וכשלונות)';

-- =====================================================
-- הרץ migration זה ב-Supabase SQL Editor
-- =====================================================
