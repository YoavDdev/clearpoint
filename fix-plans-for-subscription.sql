-- 🔧 תיקון טבלת plans למערכת מנויים
-- הרץ את כל הקובץ הזה ב-Supabase SQL Editor

-- =====================================================
-- 1. בדיקת מה קיים
-- =====================================================

SELECT 'Checking existing plans...' as status;

SELECT 
  id,
  name,
  COALESCE(plan_name, 'MISSING') as plan_name,
  COALESCE(name_he, 'MISSING') as name_he,
  monthly_price,
  connection_type,
  retention_days
FROM plans
ORDER BY monthly_price;

-- =====================================================
-- 2. הוספת שדות חסרים אם לא קיימים
-- =====================================================

-- הוספת plan_name אם חסר
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'plans' AND column_name = 'plan_name'
  ) THEN
    ALTER TABLE plans ADD COLUMN plan_name TEXT;
  END IF;
END $$;

-- הוספת name_he אם חסר
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'plans' AND column_name = 'name_he'
  ) THEN
    ALTER TABLE plans ADD COLUMN name_he TEXT;
  END IF;
END $$;

-- =====================================================
-- 3. עדכון/יצירת תוכניות בסיסיות
-- =====================================================

-- Plan A: SIM Cloud
INSERT INTO plans (
  name,
  plan_name,
  name_he,
  monthly_price,
  setup_price,
  connection_type,
  retention_days,
  camera_limit,
  description
) VALUES (
  'Plan A - SIM Cloud',
  'Plan A',
  'חבילת SIM + ענן',
  149,
  0,
  'sim',
  7,
  8,
  'חבילה מלאה עם SIM כרטיס לגישה מרחוק + שירות ענן'
)
ON CONFLICT (id) DO NOTHING;

-- אם כבר קיים Plan A, רק נעדכן את השדות החסרים
UPDATE plans
SET 
  plan_name = COALESCE(plan_name, 'Plan A'),
  name_he = COALESCE(name_he, 'חבילת SIM + ענן')
WHERE name = 'Plan A - SIM Cloud' 
  OR (connection_type = 'sim' AND monthly_price = 149);

-- Plan B: Wi-Fi Cloud
INSERT INTO plans (
  name,
  plan_name,
  name_he,
  monthly_price,
  setup_price,
  connection_type,
  retention_days,
  camera_limit,
  description
) VALUES (
  'Plan B - Wi-Fi Cloud',
  'Plan B',
  'חבילת Wi-Fi + ענן',
  99,
  0,
  'wifi',
  14,
  8,
  'חבילת Wi-Fi + שירות ענן עם שימור מוגבר'
)
ON CONFLICT (id) DO NOTHING;

-- אם כבר קיים Plan B, רק נעדכן את השדות החסרים
UPDATE plans
SET 
  plan_name = COALESCE(plan_name, 'Plan B'),
  name_he = COALESCE(name_he, 'חבילת Wi-Fi + ענן')
WHERE name = 'Plan B - Wi-Fi Cloud'
  OR (connection_type = 'wifi' AND monthly_price = 99);

-- =====================================================
-- 4. בדיקה סופית
-- =====================================================

SELECT 'Final check - All plans with complete data:' as status;

SELECT 
  id,
  name,
  plan_name,
  name_he,
  monthly_price,
  connection_type,
  retention_days,
  CASE 
    WHEN plan_name IS NULL OR name_he IS NULL THEN '❌ INCOMPLETE'
    ELSE '✅ COMPLETE'
  END as status
FROM plans
ORDER BY monthly_price;

-- =====================================================
-- 5. בדיקת RLS Policy
-- =====================================================

SELECT 'Checking RLS policies...' as status;

SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'plans';

-- אם אין policy, צור אחת:
DO $$ 
BEGIN
  -- בדיקה אם יש כבר policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'plans' AND cmd = 'SELECT'
  ) THEN
    -- הפעלת RLS
    ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
    
    -- יצירת policy לקריאה
    CREATE POLICY "Allow public read access to plans"
    ON plans FOR SELECT
    TO public
    USING (true);
    
    RAISE NOTICE '✅ Created RLS policy for plans table';
  ELSE
    RAISE NOTICE '✅ RLS policy already exists';
  END IF;
END $$;

SELECT '🎉 Done! Check the results above.' as status;
