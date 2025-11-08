-- =====================================================
-- מחיקה בטוחה והגדרת 2 תוכניות בלבד
-- Wi-Fi Cloud (₪149) + SIM Cloud (₪189)
-- =====================================================

-- ⚠️ סקריפט זה מטפל במשתמשים קיימים בצורה בטוחה

-- שלב 1: צור את 2 התוכניות החדשות (אם לא קיימות)
ALTER TABLE public.plans 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

INSERT INTO public.plans (
  id,
  name,
  name_he,
  connection_type,
  monthly_price,
  setup_price,
  camera_limit,
  retention_days,
  data_allowance_gb,
  description_he,
  live_enabled,
  cloud_enabled,
  is_active
) VALUES (
  'wifi-cloud-plan',
  'Wi-Fi Cloud',
  'Wi-Fi Cloud',
  'wifi_cloud',
  149,
  2990,
  4,
  14,
  NULL,
  'חיבור לאינטרנט קיים של הלקוח - 4 מצלמות HD, Mini PC חכם, חיבור Wi-Fi קיים, צפייה חיה + הקלטות, 14 ימי שמירה בענן, התקנה מלאה + הדרכה',
  true,
  true,
  true
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.plans (
  id,
  name,
  name_he,
  connection_type,
  monthly_price,
  setup_price,
  camera_limit,
  retention_days,
  data_allowance_gb,
  description_he,
  live_enabled,
  cloud_enabled,
  is_active
) VALUES (
  'sim-cloud-plan',
  'SIM Cloud',
  'SIM Cloud',
  'sim',
  189,
  3290,
  4,
  14,
  500,
  'כולל ראוטר SIM + 500GB גלישה - 4 מצלמות HD, Mini PC + ראוטר SIM, חבילת 500GB גלישה, צפייה חיה + הקלטות, 14 ימי שמירה בענן, התקנה מלאה + הדרכה',
  true,
  true,
  true
)
ON CONFLICT (id) DO NOTHING;

-- שלב 2: בדוק אילו משתמשים מקושרים לתוכניות ישנות
SELECT 
  u.id,
  u.full_name,
  u.email,
  u.plan_id,
  p.name as current_plan_name
FROM public.users u
LEFT JOIN public.plans p ON u.plan_id = p.id
WHERE u.plan_id IS NOT NULL
  AND u.plan_id NOT IN ('wifi-cloud-plan', 'sim-cloud-plan');

-- שלב 3: העבר משתמשים לתוכנית המתאימה
-- כל מי שיש לו SIM/sim_router → SIM Cloud
UPDATE public.users 
SET plan_id = 'sim-cloud-plan'
WHERE plan_id IS NOT NULL
  AND plan_id NOT IN ('wifi-cloud-plan', 'sim-cloud-plan')
  AND plan_id ILIKE '%sim%';

-- כל השאר → Wi-Fi Cloud (זול יותר)
UPDATE public.users 
SET plan_id = 'wifi-cloud-plan'
WHERE plan_id IS NOT NULL
  AND plan_id NOT IN ('wifi-cloud-plan', 'sim-cloud-plan');

-- שלב 4: בדוק שאין יותר משתמשים מקושרים לתוכניות ישנות
SELECT 
  u.id,
  u.full_name,
  u.plan_id
FROM public.users u
WHERE u.plan_id IS NOT NULL
  AND u.plan_id NOT IN ('wifi-cloud-plan', 'sim-cloud-plan');
-- אמור להחזיר 0 שורות!

-- שלב 5: עכשיו אפשר למחוק תוכניות ישנות בטוחות
DELETE FROM public.plans 
WHERE id NOT IN ('wifi-cloud-plan', 'sim-cloud-plan');

-- שלב 6: וידוא - כמה תוכניות נשארו?
SELECT COUNT(*) as total_plans FROM public.plans;
-- אמור להיות: 2

-- שלב 7: הצג את התוכניות הסופיות
SELECT 
  id,
  name_he,
  monthly_price,
  setup_price,
  camera_limit,
  retention_days,
  data_allowance_gb,
  is_active
FROM public.plans
ORDER BY monthly_price ASC;

-- שלב 8: בדוק את התפלגות המשתמשים
SELECT 
  p.name_he,
  COUNT(u.id) as users_count
FROM public.plans p
LEFT JOIN public.users u ON u.plan_id = p.id
GROUP BY p.id, p.name_he
ORDER BY users_count DESC;

-- =====================================================
-- תוצאה צפויה:
-- =====================================================
-- total_plans: 2
-- 
-- wifi-cloud-plan | Wi-Fi Cloud | 149 | 2990 | 4 | 14 | NULL | true
-- sim-cloud-plan  | SIM Cloud   | 189 | 3290 | 4 | 14 | 500  | true
-- 
-- התפלגות משתמשים:
-- Wi-Fi Cloud: X משתמשים
-- SIM Cloud: Y משתמשים
-- =====================================================
