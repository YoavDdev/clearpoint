-- בדיקת נתוני משתמש למנוי
-- הרץ את זה ב-Supabase SQL Editor

-- 1. בדיקת משתמשים עם כל השדות הנדרשים
SELECT 
  id,
  email,
  full_name,
  plan_id,
  custom_price,
  CASE 
    WHEN plan_id IS NULL THEN '❌ Missing plan_id'
    WHEN custom_price IS NULL THEN '⚠️ Missing custom_price (will use plan default)'
    ELSE '✅ Ready for subscription'
  END as status
FROM users
ORDER BY created_at DESC
LIMIT 10;

-- 2. בדיקת שדות שחסרים
SELECT 
  'Missing plan_id:' as check_type,
  COUNT(*) as count
FROM users
WHERE plan_id IS NULL;

SELECT 
  'Missing custom_price:' as check_type,
  COUNT(*) as count
FROM users
WHERE custom_price IS NULL;

-- 3. בדיקה אם השדה custom_price קיים בכלל
SELECT 
  'custom_price column exists:' as info,
  EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'custom_price'
  ) as exists;
