-- בדיקה והוספת RLS policy לטבלת plans
-- הרץ את זה ב-Supabase SQL Editor

-- 1. בדיקת RLS נוכחי
SELECT 'Current RLS status for plans:' as info;

SELECT 
  schemaname,
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE tablename = 'plans';

-- 2. בדיקת policies קיימות
SELECT 'Existing policies:' as info;

SELECT 
  policyname,
  cmd,
  roles,
  qual
FROM pg_policies
WHERE tablename = 'plans';

-- 3. הפעלת RLS והוספת policy לקריאה ציבורית
-- (כי הקומפוננטה קוראת מה-client side)

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- מחיקת policy ישנה אם קיימת
DROP POLICY IF EXISTS "Allow public read access to plans" ON plans;
DROP POLICY IF EXISTS "Plans are viewable by everyone" ON plans;
DROP POLICY IF EXISTS "Enable read access for all users" ON plans;

-- יצירת policy חדשה
CREATE POLICY "Enable read access for all users"
ON plans FOR SELECT
TO public
USING (true);

-- 4. בדיקה סופית
SELECT '✅ RLS policies after setup:' as info;

SELECT 
  policyname,
  cmd,
  roles,
  CASE 
    WHEN qual = 'true' THEN '✅ Public access'
    ELSE qual::text
  END as access_rule
FROM pg_policies
WHERE tablename = 'plans';
