-- =====================================================
-- דיבוג בעיית API התוכניות
-- =====================================================

-- 1. בדוק אם יש עמודת is_active
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'plans' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. בדוק מה יש בטבלה
SELECT 
  id,
  name,
  name_he,
  connection_type,
  monthly_price,
  retention_days,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'plans' AND column_name = 'is_active'
    ) 
    THEN is_active::text
    ELSE 'no_column'
  END as is_active_status
FROM public.plans
ORDER BY monthly_price ASC;

-- 3. אם אין is_active, הצג הכל
SELECT * FROM public.plans ORDER BY monthly_price ASC;
