-- בדיקת RLS policies לטבלת subscriptions
-- הרץ את זה ב-Supabase SQL Editor

-- 1. בדיקת RLS מופעל
SELECT 
  'RLS Status:' as info,
  relrowsecurity as "RLS Enabled"
FROM pg_class
WHERE relname = 'subscriptions';

-- 2. רשימת policies קיימות
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'subscriptions';

-- 3. הוספת policies אם חסרות
-- Policy לשרת (service_role)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'subscriptions' 
    AND policyname = 'Enable full access for service role'
  ) THEN
    CREATE POLICY "Enable full access for service role"
    ON subscriptions FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
    
    RAISE NOTICE '✅ Created service_role policy';
  ELSE
    RAISE NOTICE '✅ Service role policy already exists';
  END IF;
END $$;

-- 4. בדיקה סופית
SELECT '✅ Policies configured' as status;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'subscriptions';
