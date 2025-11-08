-- =====================================================
-- TEST - רק טבלת subscriptions
-- =====================================================

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES plans(id),
  status TEXT NOT NULL DEFAULT 'active',
  amount DECIMAL(10, 2) NOT NULL,
  next_billing_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

SELECT 'Subscriptions table created! ✅' as result;
