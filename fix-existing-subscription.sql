-- תיקון: מחיקת מנוי קיים למשתמש
-- הרץ את זה ב-Supabase SQL Editor

-- 1. בדיקה - מי יש לו מנויים
SELECT 
  s.id,
  s.user_id,
  u.email,
  u.full_name,
  s.status,
  s.amount,
  s.created_at
FROM subscriptions s
JOIN users u ON s.user_id = u.id
ORDER BY s.created_at DESC;

-- 2. מחיקת המנוי של המשתמש הספציפי (אם רוצה)
-- DELETE FROM subscriptions 
-- WHERE user_id = 'a6d9650e-4a29-44e2-ba0a-8f1ebf57b839';

-- 3. או מחיקת כל המנויים (אם זה דב ואתה רוצה לנקות)
-- DELETE FROM subscriptions;

SELECT '📝 Uncomment the DELETE command you want to use' as instructions;
