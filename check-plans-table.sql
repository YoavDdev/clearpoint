-- בדיקת טבלת plans
-- הרץ את זה ב-Supabase SQL Editor

-- 1. בדיקת מבנה הטבלה
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'plans'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. בדיקת תוכן הטבלה
SELECT 
  id,
  name,
  plan_name,
  name_he,
  monthly_price,
  setup_price,
  connection_type,
  retention_days,
  created_at
FROM plans
ORDER BY monthly_price;

-- 3. ספירה
SELECT COUNT(*) as total_plans FROM plans;
