-- יצירת תוכניות ברירת מחדל
-- הרץ את זה אם אין תוכניות בטבלה

-- מחיקת תוכניות ישנות (אם יש)
-- DELETE FROM plans; -- להסיר את ה-comment אם רוצה למחוק ולהתחיל מחדש

-- Plan A: SIM Cloud (יקר יותר)
INSERT INTO plans (
  name,
  plan_name,
  name_he,
  monthly_price,
  setup_price,
  connection_type,
  retention_days,
  camera_limit,
  description
) VALUES (
  'Plan A - SIM Cloud',
  'Plan A',
  'חבילת SIM + ענן',
  149,
  0,
  'sim',
  7,
  8,
  'חבילה מלאה עם SIM כרטיס לגישה מרחוק + שירות ענן'
) ON CONFLICT (name) DO UPDATE SET
  name_he = EXCLUDED.name_he,
  monthly_price = EXCLUDED.monthly_price,
  retention_days = EXCLUDED.retention_days;

-- Plan B: Wi-Fi Cloud (זול יותר)
INSERT INTO plans (
  name,
  plan_name,
  name_he,
  monthly_price,
  setup_price,
  connection_type,
  retention_days,
  camera_limit,
  description
) VALUES (
  'Plan B - Wi-Fi Cloud',
  'Plan B',
  'חבילת Wi-Fi + ענן',
  99,
  0,
  'wifi',
  14,
  8,
  'חבילת Wi-Fi + שירות ענן עם שימור מוגבר'
) ON CONFLICT (name) DO UPDATE SET
  name_he = EXCLUDED.name_he,
  monthly_price = EXCLUDED.monthly_price,
  retention_days = EXCLUDED.retention_days;

-- בדיקה שהתוכניות נוספו
SELECT 
  id,
  name,
  name_he,
  monthly_price,
  connection_type,
  retention_days
FROM plans
ORDER BY monthly_price;
