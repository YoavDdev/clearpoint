-- =====================================================
-- הוספת עמודת is_active לטבלת plans
-- התאמה למבנה הטבלה האמיתי
-- =====================================================

-- 1. הוסף עמודה is_active אם לא קיימת
ALTER TABLE public.plans 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. עדכן כל התוכניות הקיימות ל-false (מסתיר הכל)
UPDATE public.plans SET is_active = false;

-- 3. הפעל רק את Wi-Fi Cloud (₪149) ו-SIM Cloud (₪189)
UPDATE public.plans 
SET is_active = true 
WHERE connection_type IN ('wifi_cloud', 'sim', 'wifi', 'sim_router')
  AND monthly_price BETWEEN 140 AND 200;

-- 4. בדוק מה יש עכשיו
SELECT 
  id,
  name,
  name_he,
  connection_type,
  monthly_price,
  setup_price,
  is_active
FROM public.plans
ORDER BY is_active DESC, monthly_price ASC;

-- =====================================================
-- תוצאה צפויה: רק 2 תוכניות עם is_active = true
-- =====================================================
