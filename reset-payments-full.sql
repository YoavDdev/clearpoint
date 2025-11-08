-- =====================================================
-- Clearpoint Security - FULL RESET Payment System
-- סקריפט אחד שעושה הכל: ניקוי + יצירה
-- =====================================================

-- ========== חלק 1: ניקוי מלא ==========

-- מחק הכל בסדר הפוך (Views → Functions → Columns → Tables)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- מחק Views
    FOR r IN (SELECT viewname FROM pg_views WHERE schemaname = 'public' AND viewname IN ('upcoming_billings', 'recent_payments', 'active_subscriptions_with_users')) LOOP
        EXECUTE 'DROP VIEW IF EXISTS ' || quote_ident(r.viewname) || ' CASCADE';
    END LOOP;
    
    -- מחק Functions
    DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
    
    -- הסר עמודות מטבלת users
    ALTER TABLE IF EXISTS users DROP COLUMN IF EXISTS subscription_id CASCADE;
    ALTER TABLE IF EXISTS users DROP COLUMN IF EXISTS payment_method_on_file CASCADE;
    ALTER TABLE IF EXISTS users DROP COLUMN IF EXISTS billing_email CASCADE;
    ALTER TABLE IF EXISTS users DROP COLUMN IF EXISTS tax_id CASCADE;
    
    -- מחק טבלאות (סדר הפוך בגלל foreign keys)
    DROP TABLE IF EXISTS subscription_history CASCADE;
    DROP TABLE IF EXISTS subscriptions CASCADE;
    DROP TABLE IF EXISTS payments CASCADE;
    
    RAISE NOTICE 'Cleanup completed!';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Cleanup error (ignored): %', SQLERRM;
END $$;

-- ========== חלק 2: יצירה מחדש ==========

-- טבלת תשלומים
CREATE TABLE payments (
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

-- אינדקסים לטבלת payments
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_provider_payment_id ON payments(provider_payment_id);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);

-- ========================================

-- טבלת מנויים
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES plans(id),
  
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'paused', 'trial')),
  
  billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly', 'one_time')),
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT DEFAULT 'ILS' CHECK (currency IN ('ILS', 'USD', 'EUR')),
  
  next_billing_date DATE,
  last_billing_date DATE,
  billing_day INTEGER CHECK (billing_day BETWEEN 1 AND 31),
  
  payment_provider TEXT CHECK (payment_provider IN ('grow', 'stripe', 'payplus')),
  provider_subscription_id TEXT UNIQUE,
  provider_customer_id TEXT,
  
  trial_ends_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  metadata JSONB DEFAULT '{}'::jsonb,
  cancellation_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- אינדקסים לטבלת subscriptions
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_next_billing_date ON subscriptions(next_billing_date) WHERE status = 'active';
CREATE INDEX idx_subscriptions_provider_subscription_id ON subscriptions(provider_subscription_id);

-- ========================================

-- טבלת היסטוריית מנויים
CREATE TABLE subscription_history (
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

CREATE INDEX idx_subscription_history_subscription_id ON subscription_history(subscription_id);
CREATE INDEX idx_subscription_history_user_id ON subscription_history(user_id);
CREATE INDEX idx_subscription_history_created_at ON subscription_history(created_at DESC);

-- ========================================

-- עדכון טבלת users
ALTER TABLE users ADD COLUMN subscription_id UUID REFERENCES subscriptions(id);
ALTER TABLE users ADD COLUMN payment_method_on_file BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN billing_email TEXT;
ALTER TABLE users ADD COLUMN tax_id TEXT;

-- ========================================

-- Triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payments_updated_at 
    BEFORE UPDATE ON payments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at 
    BEFORE UPDATE ON subscriptions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================

-- RLS Policies
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payments" 
  ON payments FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all payments" 
  ON payments FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Users can view their own subscription" 
  ON subscriptions FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions" 
  ON subscriptions FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Users can view their own subscription history" 
  ON subscription_history FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscription history" 
  ON subscription_history FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- ========================================

-- Views
CREATE OR REPLACE VIEW active_subscriptions_with_users AS
SELECT 
  s.*,
  u.email,
  u.full_name,
  u.phone,
  p.name as plan_name,
  p.name_he as plan_name_he,
  p.connection_type
FROM subscriptions s
JOIN users u ON s.user_id = u.id
JOIN plans p ON s.plan_id = p.id
WHERE s.status = 'active';

CREATE OR REPLACE VIEW recent_payments AS
SELECT 
  p.*,
  u.email,
  u.full_name,
  u.phone
FROM payments p
JOIN users u ON p.user_id = u.id
ORDER BY p.created_at DESC
LIMIT 100;

CREATE OR REPLACE VIEW upcoming_billings AS
SELECT 
  s.*,
  u.email,
  u.full_name,
  u.phone,
  s.next_billing_date
FROM subscriptions s
JOIN users u ON s.user_id = u.id
WHERE s.status = 'active'
  AND s.next_billing_date IS NOT NULL
  AND s.next_billing_date <= CURRENT_DATE + INTERVAL '7 days'
ORDER BY s.next_billing_date ASC;

-- ========================================

COMMENT ON TABLE payments IS 'כל התשלומים במערכת - חד-פעמיים וחוזרים';
COMMENT ON TABLE subscriptions IS 'מנויים פעילים של לקוחות';
COMMENT ON TABLE subscription_history IS 'היסטוריה של שינויים במנויים';
COMMENT ON COLUMN payments.items IS 'מערך JSON של פריטים שנקנו';
COMMENT ON COLUMN payments.metadata IS 'מידע נוסף כ-JSON';

-- ========================================

SELECT 'Payment system created successfully! ✅' as status;
