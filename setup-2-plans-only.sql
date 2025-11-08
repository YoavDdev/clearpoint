-- =====================================================
-- הגדרת 2 תוכניות בלבד ב-/subscribe
-- Wi-Fi Cloud (₪149) + SIM Cloud (₪189)
-- =====================================================

-- שלב 1: הוסף עמודת is_active (אם לא קיימת)
ALTER TABLE public.plans 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- שלב 2: מחק את כל התוכניות שאינן Wi-Fi Cloud או SIM Cloud
DELETE FROM public.plans 
WHERE id NOT IN ('wifi-cloud-plan', 'sim-cloud-plan');

-- שלב 3: צור/עדכן Wi-Fi Cloud
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
  cloud_enabled
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
  true
)
ON CONFLICT (id) 
DO UPDATE SET
  name = EXCLUDED.name,
  name_he = EXCLUDED.name_he,
  connection_type = EXCLUDED.connection_type,
  monthly_price = EXCLUDED.monthly_price,
  setup_price = EXCLUDED.setup_price,
  camera_limit = EXCLUDED.camera_limit,
  retention_days = EXCLUDED.retention_days,
  data_allowance_gb = EXCLUDED.data_allowance_gb,
  description_he = EXCLUDED.description_he,
  live_enabled = EXCLUDED.live_enabled,
  cloud_enabled = EXCLUDED.cloud_enabled;

-- שלב 4: צור/עדכן SIM Cloud
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
  cloud_enabled
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
  true
)
ON CONFLICT (id) 
DO UPDATE SET
  name = EXCLUDED.name,
  name_he = EXCLUDED.name_he,
  connection_type = EXCLUDED.connection_type,
  monthly_price = EXCLUDED.monthly_price,
  setup_price = EXCLUDED.setup_price,
  camera_limit = EXCLUDED.camera_limit,
  retention_days = EXCLUDED.retention_days,
  data_allowance_gb = EXCLUDED.data_allowance_gb,
  description_he = EXCLUDED.description_he,
  live_enabled = EXCLUDED.live_enabled,
  cloud_enabled = EXCLUDED.cloud_enabled;

-- שלב 5: הפעל רק את 2 התוכניות האלה
UPDATE public.plans 
SET is_active = true 
WHERE id IN ('wifi-cloud-plan', 'sim-cloud-plan');

-- שלב 6: בדוק כמה תוכניות נשארו
SELECT COUNT(*) as total_plans FROM public.plans;
-- צריך להיות: 2

-- שלב 7: בדוק את התוצאה המלאה
SELECT 
  id,
  name,
  name_he,
  connection_type,
  monthly_price,
  setup_price,
  camera_limit,
  retention_days,
  data_allowance_gb,
  is_active
FROM public.plans
ORDER BY monthly_price ASC;

-- =====================================================
-- תוצאה צפויה - רק 2 תוכניות בדיוק (כל השאר נמחק):
-- =====================================================
-- wifi-cloud-plan | Wi-Fi Cloud | 149 | 2990 | 4 | 14 | NULL | true
-- sim-cloud-plan  | SIM Cloud   | 189 | 3290 | 4 | 14 | 500  | true
-- =====================================================
-- סה"כ: 2 שורות בלבד!
-- =====================================================
