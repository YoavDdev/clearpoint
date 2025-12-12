-- הוספת עמודות לניהול תכונות לפי מנוי
-- Add columns for subscription-based feature management

-- הוספת עמודות לטבלת users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS subscription_active boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS features_disabled_at timestamptz DEFAULT NULL;

-- הוספת index לביצועים
CREATE INDEX IF NOT EXISTS idx_users_subscription_active 
ON users(subscription_active);

-- תגובות
COMMENT ON COLUMN users.subscription_active IS 'האם למשתמש יש מנוי פעיל';
COMMENT ON COLUMN users.features_disabled_at IS 'מתי התכונות הושבתו עקב חוסר מנוי';

-- עדכון משתמשים קיימים עם מנוי פעיל
UPDATE users u
SET subscription_active = true
WHERE EXISTS (
  SELECT 1 FROM subscriptions s
  WHERE s.user_id = u.id 
  AND s.status = 'active'
  AND (s.next_billing_date IS NULL OR s.next_billing_date >= CURRENT_DATE)
);

-- הצגת סטטיסטיקה
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN subscription_active = true THEN 1 END) as active_subscriptions,
  COUNT(CASE WHEN subscription_active = false THEN 1 END) as inactive_subscriptions
FROM users;
