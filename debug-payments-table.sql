-- בדיקה מקיפה של טבלת payments
-- =====================================

-- 1. בדוק אם הטבלה קיימת
SELECT table_name, table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'payments';

-- 2. בדוק את כל העמודות
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'payments'
ORDER BY ordinal_position;

-- 3. בדוק RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'payments';

-- 4. בדוק אם RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'payments';
