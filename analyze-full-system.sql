-- ניתוח מלא של מערכת התשלומים והמנויים
-- הרץ את זה ב-Supabase SQL Editor

-- 1. טבלת משתמשים - מה יש להם
SELECT 
  'users' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. טבלת תשלומים - מה יש
SELECT 
  'payments' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'payments'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. טבלת מנויים - האם קיימת?
SELECT 
  'subscriptions' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'subscriptions'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. טבלת תוכניות - מה קיים?
SELECT 
  'plans' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'plans'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. טבלת חשבוניות החדשה
SELECT 
  'invoices' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'invoices'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6. בדיקה מה יש בפועל
SELECT 'Total Users' as metric, COUNT(*)::text as value FROM users
UNION ALL
SELECT 'Total Payments', COUNT(*)::text FROM payments
UNION ALL
SELECT 'Active Subscriptions', COUNT(*)::text FROM subscriptions WHERE status = 'active'
UNION ALL
SELECT 'Total Invoices', COUNT(*)::text FROM invoices
UNION ALL
SELECT 'Available Plans', COUNT(*)::text FROM plans;
