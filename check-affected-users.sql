-- =====================================================
-- בדוק אילו משתמשים יושפעו מהמחיקה
-- =====================================================

-- 1. כמה משתמשים יש בכלל?
SELECT COUNT(*) as total_users FROM public.users;

-- 2. כמה משתמשים מקושרים לתוכניות?
SELECT COUNT(*) as users_with_plans 
FROM public.users 
WHERE plan_id IS NOT NULL;

-- 3. אילו תוכניות יש עכשיו?
SELECT 
  id,
  name,
  name_he,
  monthly_price,
  COUNT(u.id) as users_count
FROM public.plans p
LEFT JOIN public.users u ON u.plan_id = p.id
GROUP BY p.id, p.name, p.name_he, p.monthly_price
ORDER BY users_count DESC;

-- 4. משתמשים ספציפיים לפי תוכנית
SELECT 
  p.id as plan_id,
  p.name_he as plan_name,
  u.id as user_id,
  u.full_name,
  u.email,
  u.custom_price
FROM public.users u
INNER JOIN public.plans p ON u.plan_id = p.id
ORDER BY p.id, u.full_name;

-- 5. משתמשים שיושפעו (לא Wi-Fi Cloud או SIM Cloud)
SELECT 
  u.id,
  u.full_name,
  u.email,
  u.plan_id,
  p.name_he as current_plan,
  CASE 
    WHEN p.id ILIKE '%sim%' THEN 'sim-cloud-plan → SIM Cloud'
    ELSE 'wifi-cloud-plan → Wi-Fi Cloud'
  END as will_move_to
FROM public.users u
LEFT JOIN public.plans p ON u.plan_id = p.id
WHERE u.plan_id IS NOT NULL
  AND u.plan_id NOT IN ('wifi-cloud-plan', 'sim-cloud-plan');

-- =====================================================
-- הערה: משתמשים אלה יועברו אוטומטית לתוכנית חדשה
-- לא נמחק שום משתמש, רק מעדכנים את התוכנית שלהם
-- =====================================================
