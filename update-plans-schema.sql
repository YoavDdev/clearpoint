-- ================================================
-- עדכון טבלת התוכניות למודל החדש - 2 תוכניות בלבד
-- Wi-Fi Cloud & SIM Cloud עם 14 ימי אחסון לכולם
-- ================================================

-- הוסף עמודות חדשות
ALTER TABLE public.plans 
  ADD COLUMN IF NOT EXISTS setup_price INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS camera_limit INTEGER NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS data_allowance_gb INTEGER NULL,
  ADD COLUMN IF NOT EXISTS name_he TEXT NULL,
  ADD COLUMN IF NOT EXISTS description_he TEXT NULL;

-- הצג תוכניות ישנות ומשתמשים שלהן
SELECT 
  p.id as plan_id, 
  p.name as plan_name, 
  COUNT(u.id) as user_count
FROM public.plans p
LEFT JOIN public.users u ON u.plan_id = p.id
GROUP BY p.id, p.name
ORDER BY user_count DESC;

-- 🎯 שלב 1: הכנס את 2 התוכניות החדשות תחילה
INSERT INTO public.plans (
  id,
  name,
  name_he,
  description_he,
  monthly_price,
  setup_price,
  retention_days,
  camera_limit,
  connection_type,
  data_allowance_gb,
  live_enabled,
  cloud_enabled
) VALUES 
(
  'wifi-cloud',
  'Wi-Fi Cloud',
  'Wi-Fi Cloud',
  'מערכת מלאה עם חיבור לאינטרנט קיים - 4 מצלמות, 14 ימי אחסון בענן',
  149,
  2990,
  14,
  4,
  'wifi',
  NULL,
  true,
  true
),
(
  'sim-cloud',
  'SIM Cloud',
  'SIM Cloud',
  'מערכת מלאה עם ראוטר SIM עצמאי - 4 מצלמות, 14 ימי אחסון בענן, 500GB גלישה',
  189,
  3290,
  14,
  4,
  'sim',
  500,
  true,
  true
);

-- 🎯 שלב 2: עדכן משתמשים קיימים לתוכניות החדשות (עכשיו שהן קיימות!)
-- משתמשים עם תוכניות SIM ישנות -> sim-cloud
UPDATE public.users
SET plan_id = 'sim-cloud'
WHERE plan_id LIKE 'sim%' AND plan_id != 'sim-cloud';

-- משתמשים עם תוכניות WiFi/B ישנות -> wifi-cloud  
UPDATE public.users
SET plan_id = 'wifi-cloud'
WHERE plan_id LIKE 'a%' OR plan_id LIKE 'b%' OR (plan_id NOT IN ('sim-cloud', 'wifi-cloud') AND plan_id IS NOT NULL);

-- 🎯 שלב 3: מחק תוכניות ישנות (עכשיו זה יעבוד!)
DELETE FROM public.plans 
WHERE id NOT IN ('wifi-cloud', 'sim-cloud');

-- ✅ בדיקה שהכל עבד - הצג תוכניות חדשות
SELECT 
  id,
  name_he,
  monthly_price,
  setup_price,
  retention_days,
  camera_limit,
  connection_type,
  data_allowance_gb
FROM public.plans
ORDER BY monthly_price;

-- ✅ הצג כמה משתמשים בכל תוכנית
SELECT 
  p.id as plan_id,
  p.name_he as plan_name,
  COUNT(u.id) as user_count
FROM public.plans p
LEFT JOIN public.users u ON u.plan_id = p.id
GROUP BY p.id, p.name_he
ORDER BY user_count DESC;
