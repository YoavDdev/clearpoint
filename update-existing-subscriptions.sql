-- =====================================================
-- עדכון טבלת subscriptions קיימת
-- =====================================================

-- הוסף עמודות חסרות (רק אם לא קיימות)
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly', 'one_time'));
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'ILS' CHECK (currency IN ('ILS', 'USD', 'EUR'));
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS last_billing_date DATE;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS billing_day INTEGER CHECK (billing_day BETWEEN 1 AND 31);
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS payment_provider TEXT CHECK (payment_provider IN ('grow', 'stripe', 'payplus'));
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS provider_subscription_id TEXT UNIQUE;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS provider_customer_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- עדכן status constraint
DO $$ 
BEGIN
    ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
    ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_check CHECK (status IN ('active', 'cancelled', 'expired', 'paused', 'trial'));
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

SELECT '✅ Subscriptions עודכנה' as result;

-- ========================================

-- צור payments (אם לא קיימת)
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('one_time', 'recurring', 'refund')),
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT DEFAULT 'ILS' CHECK (currency IN ('ILS', 'USD', 'EUR')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')),
  payment_provider TEXT CHECK (payment_provider IN ('grow', 'stripe', 'payplus', 'manual')),
  provider_payment_id TEXT UNIQUE,
  provider_transaction_id TEXT,
  description TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  invoice_id TEXT,
  invoice_number TEXT,
  invoice_url TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  notes TEXT
);

SELECT '✅ Payments נוצרה' as result;

-- ========================================

-- צור subscription_history (אם לא קיימת)
CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'updated', 'cancelled', 'renewed', 'upgraded', 'downgraded', 'paused', 'resumed')),
  previous_status TEXT,
  new_status TEXT,
  previous_plan_id TEXT,
  new_plan_id TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

SELECT '✅ Subscription_history נוצרה' as result;

-- ========================================

-- אינדקסים
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_provider_payment_id ON payments(provider_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing_date ON subscriptions(next_billing_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider_subscription_id ON subscriptions(provider_subscription_id);

CREATE INDEX IF NOT EXISTS idx_subscription_history_subscription_id ON subscription_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_user_id ON subscription_history(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_created_at ON subscription_history(created_at DESC);

SELECT '✅ אינדקסים נוצרו' as result;

-- ========================================

-- עדכון users
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES subscriptions(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_method_on_file BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS billing_email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tax_id TEXT;

SELECT '✅ Users עודכנה' as result;

-- ========================================

-- Triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at 
    BEFORE UPDATE ON payments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at 
    BEFORE UPDATE ON subscriptions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

SELECT '✅ Triggers נוצרו' as result;

-- ========================================

-- RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own payments" ON payments;
CREATE POLICY "Users can view their own payments" 
  ON payments FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all payments" ON payments;
CREATE POLICY "Admins can view all payments" 
  ON payments FOR ALL 
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Users can view their own subscription" ON subscriptions;
CREATE POLICY "Users can view their own subscription" 
  ON subscriptions FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all subscriptions" ON subscriptions;
CREATE POLICY "Admins can view all subscriptions" 
  ON subscriptions FOR ALL 
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Users can view their own subscription history" ON subscription_history;
CREATE POLICY "Users can view their own subscription history" 
  ON subscription_history FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all subscription history" ON subscription_history;
CREATE POLICY "Admins can view all subscription history" 
  ON subscription_history FOR ALL 
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

SELECT '✅ RLS Policies נוצרו' as result;

-- ========================================

-- Views
DROP VIEW IF EXISTS active_subscriptions_with_users;
CREATE VIEW active_subscriptions_with_users AS
SELECT s.*, u.email, u.full_name, u.phone, p.name as plan_name, p.name_he as plan_name_he, p.connection_type
FROM subscriptions s
JOIN users u ON s.user_id = u.id
JOIN plans p ON s.plan_id = p.id
WHERE s.status = 'active';

DROP VIEW IF EXISTS recent_payments;
CREATE VIEW recent_payments AS
SELECT p.*, u.email, u.full_name, u.phone
FROM payments p
JOIN users u ON p.user_id = u.id
ORDER BY p.created_at DESC
LIMIT 100;

DROP VIEW IF EXISTS upcoming_billings;
CREATE VIEW upcoming_billings AS
SELECT s.*, u.email, u.full_name, u.phone, s.next_billing_date
FROM subscriptions s
JOIN users u ON s.user_id = u.id
WHERE s.status = 'active'
  AND s.next_billing_date IS NOT NULL
  AND s.next_billing_date <= CURRENT_DATE + INTERVAL '7 days'
ORDER BY s.next_billing_date ASC;

SELECT '✅ Views נוצרו' as result;

-- ========================================

COMMENT ON TABLE payments IS 'כל התשלומים במערכת - חד-פעמיים וחוזרים';
COMMENT ON TABLE subscriptions IS 'מנויים פעילים של לקוחות';
COMMENT ON TABLE subscription_history IS 'היסטוריה של שינויים במנויים';

SELECT '🎉🎉🎉 מערכת התשלומים הושלמה בהצלחה! 🎉🎉🎉' as final_result;
