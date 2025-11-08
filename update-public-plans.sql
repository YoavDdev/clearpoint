-- =====================================================
-- עדכון תוכניות ציבוריות ל-/subscribe
-- רק 2 תוכניות: Wi-Fi Cloud ו-SIM Cloud
-- =====================================================

-- 1. מחק תוכניות ישנות/מיותרות (אופציונלי)
-- DELETE FROM plans WHERE connection_type NOT IN ('wifi_cloud', 'sim');

-- 2. עדכן/הוסף Wi-Fi Cloud (התאמה למבנה הטבלה האמיתי)
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
  description_he
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
  'חיבור לאינטרנט קיים - 4 מצלמות HD, Mini PC, 14 ימי שמירה בענן, התקנה מלאה + הדרכה'
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
  description_he = EXCLUDED.description_he;

-- 3. עדכן/הוסף SIM Cloud (התאמה למבנה הטבלה האמיתי)
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
  description_he
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
  'כולל ראוטר SIM + 500GB גלישה - 4 מצלמות HD, Mini PC, 14 ימי שמירה בענן, התקנה מלאה + הדרכה'
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
  description_he = EXCLUDED.description_he;

-- 4. בדוק מה יש עכשיו
SELECT 
  id,
  name,
  name_he,
  connection_type,
  monthly_price,
  setup_price,
  camera_limit,
  retention_days
FROM public.plans
ORDER BY monthly_price ASC;

-- =====================================================
-- תוצאה צפויה:
-- =====================================================
-- wifi-cloud-plan | Wi-Fi Cloud | wifi_cloud | 149 | 2990 | 4 | 14
-- sim-cloud-plan  | SIM Cloud   | sim        | 189 | 3290 | 4 | 14
-- =====================================================

-- 5. אם רצית is_active, הרץ קודם את add-is-active-to-plans.sql
