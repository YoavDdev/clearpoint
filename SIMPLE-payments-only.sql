-- =====================================================
-- פשוט מאוד - רק payments ו-subscription_history
-- לא נוגע ב-subscriptions בכלל!
-- =====================================================

-- מחק אם קיים
DROP TABLE IF EXISTS subscription_history CASCADE;
DROP TABLE IF EXISTS payments CASCADE;

-- צור payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('one_time', 'recurring', 'refund')),
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT DEFAULT 'ILS',
  status TEXT NOT NULL DEFAULT 'pending',
  payment_provider TEXT,
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

SELECT '✅ Payments נוצרה!' as result;

-- צור subscription_history
CREATE TABLE subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  previous_plan_id TEXT,
  new_plan_id TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

SELECT '✅ Subscription_history נוצרה!' as result;

-- אינדקסים
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);

CREATE INDEX idx_subscription_history_subscription_id ON subscription_history(subscription_id);
CREATE INDEX idx_subscription_history_user_id ON subscription_history(user_id);

SELECT '✅ אינדקסים נוצרו!' as result;

SELECT '🎉 DONE! Payments system is ready!' as final_result;
