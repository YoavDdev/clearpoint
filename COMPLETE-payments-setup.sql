-- =====================================================
-- השלמת מערכת התשלומים - Triggers, RLS, Views
-- =====================================================

-- אינדקסים נוספים
CREATE INDEX IF NOT EXISTS idx_payments_provider_payment_id ON payments(provider_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing_date ON subscriptions(next_billing_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider_subscription_id ON subscriptions(provider_subscription_id);

CREATE INDEX IF NOT EXISTS idx_subscription_history_created_at ON subscription_history(created_at DESC);

SELECT '✅ אינדקסים נוספים נוצרו' as result;

-- ========================================

-- עדכון טבלת users
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

-- RLS Policies
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

-- Payments Policies
DROP POLICY IF EXISTS "Users can view their own payments" ON payments;
CREATE POLICY "Users can view their own payments" 
  ON payments FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all payments" ON payments;
CREATE POLICY "Admins can view all payments" 
  ON payments FOR ALL 
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Subscriptions Policies
DROP POLICY IF EXISTS "Users can view their own subscription" ON subscriptions;
CREATE POLICY "Users can view their own subscription" 
  ON subscriptions FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all subscriptions" ON subscriptions;
CREATE POLICY "Admins can view all subscriptions" 
  ON subscriptions FOR ALL 
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Subscription History Policies
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
DROP VIEW IF EXISTS active_subscriptions_with_users CASCADE;
CREATE VIEW active_subscriptions_with_users AS
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

DROP VIEW IF EXISTS recent_payments CASCADE;
CREATE VIEW recent_payments AS
SELECT 
  p.*,
  u.email,
  u.full_name,
  u.phone
FROM payments p
JOIN users u ON p.user_id = u.id
ORDER BY p.created_at DESC
LIMIT 100;

DROP VIEW IF EXISTS upcoming_billings CASCADE;
CREATE VIEW upcoming_billings AS
SELECT 
  s.*,
  u.email,
  u.full_name,
  u.phone
FROM subscriptions s
JOIN users u ON s.user_id = u.id
WHERE s.status = 'active'
  AND s.next_billing_date IS NOT NULL
  AND s.next_billing_date <= CURRENT_DATE + INTERVAL '7 days'
ORDER BY s.next_billing_date ASC;

SELECT '✅ Views נוצרו' as result;

-- ========================================

-- Comments
COMMENT ON TABLE payments IS 'כל התשלומים במערכת - חד-פעמיים וחוזרים';
COMMENT ON TABLE subscriptions IS 'מנויים פעילים של לקוחות';
COMMENT ON TABLE subscription_history IS 'היסטוריה של שינויים במנויים';
COMMENT ON COLUMN payments.items IS 'מערך JSON של פריטים שנקנו';
COMMENT ON COLUMN payments.metadata IS 'מידע נוסף כ-JSON';

SELECT '✅ Comments נוספו' as result;

-- ========================================

SELECT '🎉🎉🎉 מערכת התשלומים הושלמה במלואה! 🎉🎉🎉' as final_status;
