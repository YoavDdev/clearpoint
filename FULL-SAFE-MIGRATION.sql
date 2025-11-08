-- =====================================================
-- מיגרציה מלאה ובטוחה ל-2 תוכניות בלבד
-- Wi-Fi Cloud (₪149) + SIM Cloud (₪189)
-- =====================================================
-- סקריפט זה:
-- 1. בודק מצב קיים
-- 2. יוצר 2 תוכניות חדשות
-- 3. מעביר משתמשים ומנויים
-- 4. מוחק תוכניות ישנות
-- =====================================================

-- ===== חלק 1: בדיקה =====
SELECT '=== סטטוס נוכחי ===' as step;

SELECT 
  'סה"כ תוכניות' as item,
  COUNT(*) as count 
FROM public.plans;

SELECT 
  'משתמשים עם תוכניות' as item,
  COUNT(*) as count 
FROM public.users 
WHERE plan_id IS NOT NULL;

SELECT 
  'מנויים פעילים' as item,
  COUNT(*) as count 
FROM public.subscriptions 
WHERE status = 'active';

-- ===== חלק 2: הכנה =====
SELECT '=== יצירת תוכניות חדשות ===' as step;

-- הוסף is_active אם לא קיים
ALTER TABLE public.plans 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- צור Wi-Fi Cloud
INSERT INTO public.plans (
  id, name, name_he, connection_type, monthly_price, setup_price,
  camera_limit, retention_days, data_allowance_gb, description_he,
  live_enabled, cloud_enabled, is_active
) VALUES (
  'wifi-cloud-plan',
  'Wi-Fi Cloud',
  'Wi-Fi Cloud',
  'wifi_cloud',
  149, 2990, 4, 14, NULL,
  'חיבור לאינטרנט קיים של הלקוח - 4 מצלמות HD, Mini PC חכם, חיבור Wi-Fi קיים, צפייה חיה + הקלטות, 14 ימי שמירה בענן, התקנה מלאה + הדרכה',
  true, true, true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_he = EXCLUDED.name_he,
  monthly_price = EXCLUDED.monthly_price,
  setup_price = EXCLUDED.setup_price,
  description_he = EXCLUDED.description_he,
  is_active = true;

-- צור SIM Cloud
INSERT INTO public.plans (
  id, name, name_he, connection_type, monthly_price, setup_price,
  camera_limit, retention_days, data_allowance_gb, description_he,
  live_enabled, cloud_enabled, is_active
) VALUES (
  'sim-cloud-plan',
  'SIM Cloud',
  'SIM Cloud',
  'sim',
  189, 3290, 4, 14, 500,
  'כולל ראוטר SIM + 500GB גלישה - 4 מצלמות HD, Mini PC + ראוטר SIM, חבילת 500GB גלישה, צפייה חיה + הקלטות, 14 ימי שמירה בענן, התקנה מלאה + הדרכה',
  true, true, true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_he = EXCLUDED.name_he,
  monthly_price = EXCLUDED.monthly_price,
  setup_price = EXCLUDED.setup_price,
  description_he = EXCLUDED.description_he,
  is_active = true;

-- ===== חלק 3: מיגרציה =====
SELECT '=== העברת משתמשים ===' as step;

-- הצג מי יועבר
SELECT 
  u.id,
  u.full_name,
  u.plan_id as old_plan_id,
  CASE 
    WHEN u.plan_id ILIKE '%sim%' THEN 'sim-cloud-plan'
    ELSE 'wifi-cloud-plan'
  END as new_plan_id
FROM public.users u
WHERE u.plan_id IS NOT NULL
  AND u.plan_id NOT IN ('wifi-cloud-plan', 'sim-cloud-plan');

-- העבר משתמשים עם SIM → SIM Cloud
UPDATE public.users 
SET plan_id = 'sim-cloud-plan'
WHERE plan_id IS NOT NULL
  AND plan_id NOT IN ('wifi-cloud-plan', 'sim-cloud-plan')
  AND (plan_id ILIKE '%sim%' OR plan_id ILIKE '%router%');

-- העבר כל השאר → Wi-Fi Cloud
UPDATE public.users 
SET plan_id = 'wifi-cloud-plan'
WHERE plan_id IS NOT NULL
  AND plan_id NOT IN ('wifi-cloud-plan', 'sim-cloud-plan');

-- ===== חלק 4: מנויים =====
SELECT '=== עדכון מנויים ===' as step;

-- עדכן מנויים עם SIM → SIM Cloud
UPDATE public.subscriptions 
SET plan_id = 'sim-cloud-plan'
WHERE plan_id IS NOT NULL
  AND plan_id NOT IN ('wifi-cloud-plan', 'sim-cloud-plan')
  AND (plan_id ILIKE '%sim%' OR plan_id ILIKE '%router%');

-- עדכן שאר המנויים → Wi-Fi Cloud
UPDATE public.subscriptions 
SET plan_id = 'wifi-cloud-plan'
WHERE plan_id IS NOT NULL
  AND plan_id NOT IN ('wifi-cloud-plan', 'sim-cloud-plan');

-- ===== חלק 5: ניקיון =====
SELECT '=== בדיקה לפני מחיקה ===' as step;

-- וודא שאין משתמשים מקושרים לתוכניות ישנות
SELECT 
  COUNT(*) as users_still_linked
FROM public.users 
WHERE plan_id IS NOT NULL
  AND plan_id NOT IN ('wifi-cloud-plan', 'sim-cloud-plan');
-- צריך להיות: 0

-- וודא שאין מנויים מקושרים לתוכניות ישנות
SELECT 
  COUNT(*) as subscriptions_still_linked
FROM public.subscriptions 
WHERE plan_id IS NOT NULL
  AND plan_id NOT IN ('wifi-cloud-plan', 'sim-cloud-plan');
-- צריך להיות: 0

-- מחק תוכניות ישנות
DELETE FROM public.plans 
WHERE id NOT IN ('wifi-cloud-plan', 'sim-cloud-plan');

-- ===== חלק 6: וידוא =====
SELECT '=== תוצאה סופית ===' as step;

-- כמה תוכניות נשארו
SELECT COUNT(*) as total_plans FROM public.plans;

-- הצג את התוכניות
SELECT 
  id,
  name_he,
  monthly_price,
  setup_price,
  is_active
FROM public.plans
ORDER BY monthly_price ASC;

-- התפלגות משתמשים
SELECT 
  p.name_he as plan,
  COUNT(DISTINCT u.id) as users,
  COUNT(DISTINCT s.id) as active_subscriptions
FROM public.plans p
LEFT JOIN public.users u ON u.plan_id = p.id
LEFT JOIN public.subscriptions s ON s.plan_id = p.id AND s.status = 'active'
GROUP BY p.id, p.name_he
ORDER BY p.monthly_price ASC;

-- =====================================================
-- סיימנו! ✅
-- צריך להיות רק 2 תוכניות בטבלה
-- כל המשתמשים והמנויים עודכנו
-- =====================================================
