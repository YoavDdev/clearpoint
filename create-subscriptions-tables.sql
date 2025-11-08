-- יצירת טבלאות מנויים
-- הרץ את זה ב-Supabase SQL Editor

-- 1. טבלת subscriptions (אם לא קיימת)
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'paused')),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ILS',
  next_billing_date DATE NOT NULL,
  billing_day INTEGER,
  payment_provider TEXT DEFAULT 'grow',
  provider_subscription_id TEXT,
  provider_customer_id TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. אינדקסים
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing ON subscriptions(next_billing_date);

-- 3. RLS Policies
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy לאדמינים (מלא)
CREATE POLICY "Enable full access for service role"
ON subscriptions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy למשתמשים (קריאה בלבד של המנויים שלהם)
CREATE POLICY "Users can view own subscriptions"
ON subscriptions FOR SELECT
TO authenticated
USING (auth.uid()::text = user_id::text);

-- 4. עדכון אוטומטי של updated_at
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscriptions_updated_at
BEFORE UPDATE ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_subscriptions_updated_at();

-- 5. בדיקה
SELECT '✅ subscriptions table created/verified' as status;
SELECT COUNT(*) as total_subscriptions FROM subscriptions;
