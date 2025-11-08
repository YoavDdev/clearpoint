-- =====================================================
-- יצירת טבלת subscriptions צעד אחר צעד
-- =====================================================

-- שלב 1: צור טבלה בסיסית בלי next_billing_date
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'paused', 'trial')),
  billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly', 'one_time')),
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT DEFAULT 'ILS' CHECK (currency IN ('ILS', 'USD', 'EUR')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- שלב 2: הוסף את next_billing_date
ALTER TABLE subscriptions ADD COLUMN next_billing_date DATE;

-- שלב 3: הוסף את שאר העמודות
ALTER TABLE subscriptions ADD COLUMN last_billing_date DATE;
ALTER TABLE subscriptions ADD COLUMN billing_day INTEGER CHECK (billing_day BETWEEN 1 AND 31);
ALTER TABLE subscriptions ADD COLUMN payment_provider TEXT CHECK (payment_provider IN ('grow', 'stripe', 'payplus'));
ALTER TABLE subscriptions ADD COLUMN provider_subscription_id TEXT UNIQUE;
ALTER TABLE subscriptions ADD COLUMN provider_customer_id TEXT;
ALTER TABLE subscriptions ADD COLUMN trial_ends_at TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN started_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE subscriptions ADD COLUMN cancelled_at TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN expires_at TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE subscriptions ADD COLUMN cancellation_reason TEXT;
ALTER TABLE subscriptions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

SELECT 'Subscriptions table created step by step! ✅' as status;
