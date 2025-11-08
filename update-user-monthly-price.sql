-- עדכון מחיר חודשי של משתמש
-- הרץ את זה ב-Supabase SQL Editor

-- 1. בדיקה - מה המחיר הנוכחי
SELECT 
  id,
  email,
  full_name,
  custom_price as "מחיר נוכחי",
  plan_id
FROM users
WHERE id = 'a6d9650e-4a29-44e2-ba0a-8f1ebf57b839';

-- 2. עדכון המחיר
UPDATE users
SET custom_price = 10  -- המחיר החדש
WHERE id = 'a6d9650e-4a29-44e2-ba0a-8f1ebf57b839';

-- 3. עדכון המנוי הקיים (אם יש)
UPDATE subscriptions
SET amount = 10  -- המחיר החדש
WHERE user_id = 'a6d9650e-4a29-44e2-ba0a-8f1ebf57b839'
  AND status = 'active';

-- 4. בדיקה - האם עודכן
SELECT 
  u.email,
  u.custom_price as "מחיר במשתמש",
  s.amount as "מחיר במנוי",
  s.status,
  s.next_billing_date
FROM users u
LEFT JOIN subscriptions s ON s.user_id = u.id
WHERE u.id = 'a6d9650e-4a29-44e2-ba0a-8f1ebf57b839';

SELECT '✅ המחיר עודכן!' as status;
