-- הוספת תוכניות לטבלה הקיימת
-- הרץ את זה ב-Supabase SQL Editor

-- 1. בדיקה מהירה מה יש
SELECT 'Current plans in database:' as status;
SELECT id, name, name_he, monthly_price, connection_type FROM plans;

-- 2. הוספת תוכניות (אם לא קיימות)

-- Plan A: SIM Cloud
INSERT INTO plans (
  id,
  name,
  name_he,
  description_he,
  monthly_price,
  setup_price,
  retention_days,
  camera_limit,
  connection_type,
  live_enabled,
  cloud_enabled,
  data_allowance_gb
) VALUES (
  'plan-a-sim-cloud',
  'Plan A - SIM Cloud',
  'חבילת SIM + ענן',
  'חבילה מלאה עם SIM כרטיס לגישה מרחוק + שירות ענן מתקדם',
  149,
  0,
  7,
  8,
  'sim',
  true,
  true,
  50
)
ON CONFLICT (id) DO UPDATE SET
  name_he = EXCLUDED.name_he,
  description_he = EXCLUDED.description_he,
  monthly_price = EXCLUDED.monthly_price;

-- Plan B: Wi-Fi Cloud
INSERT INTO plans (
  id,
  name,
  name_he,
  description_he,
  monthly_price,
  setup_price,
  retention_days,
  camera_limit,
  connection_type,
  live_enabled,
  cloud_enabled,
  data_allowance_gb
) VALUES (
  'plan-b-wifi-cloud',
  'Plan B - Wi-Fi Cloud',
  'חבילת Wi-Fi + ענן',
  'חבילת Wi-Fi עם שירות ענן ושימור מוגבר של הקלטות',
  99,
  0,
  14,
  8,
  'wifi',
  true,
  true,
  null
)
ON CONFLICT (id) DO UPDATE SET
  name_he = EXCLUDED.name_he,
  description_he = EXCLUDED.description_he,
  monthly_price = EXCLUDED.monthly_price;

-- Plan C: Premium (אופציונלי - אם רוצה עוד אחת)
INSERT INTO plans (
  id,
  name,
  name_he,
  description_he,
  monthly_price,
  setup_price,
  retention_days,
  camera_limit,
  connection_type,
  live_enabled,
  cloud_enabled,
  data_allowance_gb
) VALUES (
  'plan-c-premium',
  'Plan C - Premium',
  'חבילת פרימיום',
  'חבילה מתקדמת עם שימור ארוך וללא הגבלת מצלמות',
  199,
  0,
  30,
  16,
  'sim',
  true,
  true,
  100
)
ON CONFLICT (id) DO UPDATE SET
  name_he = EXCLUDED.name_he,
  description_he = EXCLUDED.description_he,
  monthly_price = EXCLUDED.monthly_price;

-- 3. בדיקה סופית
SELECT 'Plans after insert:' as status;
SELECT 
  id,
  name,
  name_he,
  monthly_price,
  connection_type,
  retention_days,
  camera_limit
FROM plans
ORDER BY monthly_price;

SELECT '✅ Total plans: ' || COUNT(*) as result FROM plans;
