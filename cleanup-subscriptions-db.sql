-- 🗑️ מחיקת מערכת המנויים (אבל לא את ה-plans!)
-- ⚠️ הרץ את זה ב-Supabase SQL Editor
-- ✅ שומר את טבלת plans (sim-cloud-plan, wifi-cloud-plan)

-- ===================================
-- שלב 1: ניקוי foreign keys ב-users
-- ===================================

-- ניקוי כל ההפניות מ-users ל-subscriptions
UPDATE users 
SET 
  subscription_id = NULL,
  subscription_active = false,
  subscription_status = NULL
WHERE subscription_id IS NOT NULL;

-- ===================================
-- שלב 2: מחיקת כל רשומות המנויים
-- ===================================

-- מחיקת כל המנויים
DELETE FROM subscriptions;

-- מחיקת payments חוזרים (אופציונלי)
-- DELETE FROM payments WHERE payment_type = 'recurring';

-- ===================================
-- שלב 3: מחיקת טבלת subscriptions לגמרי
-- ===================================

DROP TABLE IF EXISTS subscriptions CASCADE;

-- ===================================
-- ⚠️ לא נוגעים ב-plans! (יש 2 תוכניות)
-- ===================================
-- ✅ sim-cloud-plan: ₪189/חודש
-- ✅ wifi-cloud-plan: ₪149/חודש

-- ===================================
-- שלב 3: בדיקה - מה נשאר
-- ===================================

-- רשימת כל הלקוחות
SELECT 
  id,
  full_name,
  email,
  customer_uid,
  created_at
FROM users
WHERE email IN ('admin@clearpoint.com', 'yoavdra@gmail.com')
ORDER BY created_at DESC;

-- ספירת תשלומים וחשבוניות
SELECT 
  'payments' as type,
  COUNT(*) as count
FROM payments

UNION ALL

SELECT 
  'invoices' as type,
  COUNT(*) as count
FROM invoices;

-- ===================================
-- שלב 4: ניקוי (אם צריך)
-- ===================================

-- מחיקת לקוחות שאינם admin או yoavdra (אופציונלי)
-- DELETE FROM users 
-- WHERE email NOT IN ('admin@clearpoint.com', 'yoavdra@gmail.com');

-- ===================================
-- סיכום: מה נותר
-- ===================================
SELECT 'סיימתי! נותרו:' as status;
SELECT COUNT(*) as total_users FROM users;
SELECT COUNT(*) as total_payments FROM payments;
SELECT COUNT(*) as total_invoices FROM invoices;
