-- =====================================================
-- מחיקה נקייה והגדרת 2 תוכניות בלבד
-- Wi-Fi Cloud (₪149) + SIM Cloud (₪189)
-- =====================================================

-- ⚠️ אזהרה: סקריפט זה ימחק את כל התוכניות הקיימות!
-- ⚠️ רק Wi-Fi Cloud ו-SIM Cloud יישארו.

-- שלב 1: מחק את הכל (התחלה נקייה)
DELETE FROM public.plans;

-- שלב 2: וודא שיש עמודת is_active
ALTER TABLE public.plans 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- שלב 3: צור Wi-Fi Cloud
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
);

-- שלב 4: צור SIM Cloud
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
);

-- שלב 5: וידוא - כמה תוכניות יש?
SELECT COUNT(*) as total_plans FROM public.plans;
-- אמור להיות: 2

-- שלב 6: הצג את התוכניות
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

-- =====================================================
-- תוצאה:
-- =====================================================
-- total_plans: 2
-- 
-- wifi-cloud-plan | Wi-Fi Cloud | 149 | 2990 | 4 | 14 | NULL | true
-- sim-cloud-plan  | SIM Cloud   | 189 | 3290 | 4 | 14 | 500  | true
-- =====================================================
