-- ביטול מנוי ידני דרך SQL
-- הרץ את זה ב-Supabase SQL Editor

-- 1. בדיקה - מי יש לו מנויים פעילים
SELECT 
  s.id,
  u.email,
  u.full_name,
  s.status,
  s.amount,
  s.next_billing_date
FROM subscriptions s
JOIN users u ON s.user_id = u.id
WHERE s.status = 'active'
ORDER BY s.created_at DESC;

-- 2. ביטול מנוי ספציפי
-- UPDATE subscriptions
-- SET 
--   status = 'cancelled',
--   cancelled_at = NOW()
-- WHERE id = 'SUBSCRIPTION_ID_HERE';

-- 3. או לפי user_id
UPDATE subscriptions
SET 
  status = 'cancelled',
  cancelled_at = NOW()
WHERE user_id = 'a6d9650e-4a29-44e2-ba0a-8f1ebf57b839'
  AND status = 'active';

SELECT '✅ המנוי בוטל!' as status;

-- 4. בדיקה
SELECT 
  u.email,
  s.status,
  s.cancelled_at
FROM subscriptions s
JOIN users u ON s.user_id = u.id
WHERE s.user_id = 'a6d9650e-4a29-44e2-ba0a-8f1ebf57b839';
