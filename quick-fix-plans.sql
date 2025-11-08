-- =====================================================
-- תיקון מהיר - וודא שיש 2 תוכניות
-- =====================================================

-- 1. בדוק מה יש עכשיו
SELECT COUNT(*) as total FROM public.plans;

-- 2. הצג את כל התוכניות
SELECT 
  id,
  name,
  name_he,
  connection_type,
  monthly_price,
  retention_days
FROM public.plans
ORDER BY monthly_price ASC;

-- 3. אם אין תוכניות, צור אותן:
-- (הסר את ה-comment אם צריך)

/*
INSERT INTO public.plans (
  id, name, name_he, connection_type, 
  monthly_price, setup_price, camera_limit, retention_days
) VALUES 
  ('wifi-cloud-plan', 'Wi-Fi Cloud', 'Wi-Fi Cloud', 'wifi_cloud', 149, 2990, 4, 14),
  ('sim-cloud-plan', 'SIM Cloud', 'SIM Cloud', 'sim', 189, 3290, 4, 14)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_he = EXCLUDED.name_he,
  connection_type = EXCLUDED.connection_type,
  monthly_price = EXCLUDED.monthly_price,
  setup_price = EXCLUDED.setup_price,
  camera_limit = EXCLUDED.camera_limit,
  retention_days = EXCLUDED.retention_days;
*/

-- 4. וידוא סופי
SELECT 
  id,
  name,
  connection_type,
  monthly_price
FROM public.plans
ORDER BY monthly_price ASC;
