-- בדיקה אם הפונקציה update_updated_at_column קיימת
-- הרץ את זה ב-Supabase SQL Editor

-- 1. בדיקת קיום הפונקציה
SELECT 
  'Function exists:' as info,
  EXISTS (
    SELECT 1 
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname = 'update_updated_at_column'
  ) as exists;

-- 2. אם לא קיימת, ניצור אותה
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

SELECT '✅ Function created/verified' as status;
