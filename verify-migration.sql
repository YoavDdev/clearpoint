-- =====================================================
-- וידוא מיגרציה - בדיקה סופית
-- =====================================================

-- 1. כמה תוכניות יש?
SELECT 
  '1. סה"כ תוכניות' as check_item,
  COUNT(*) as result,
  CASE 
    WHEN COUNT(*) = 2 THEN '✅ מושלם!'
    ELSE '⚠️ צריך להיות 2'
  END as status
FROM public.plans;

-- 2. אילו תוכניות?
SELECT 
  '2. רשימת תוכניות' as check_item,
  id,
  name_he,
  monthly_price,
  setup_price,
  is_active
FROM public.plans
ORDER BY monthly_price ASC;

-- 3. כמה משתמשים יש?
SELECT 
  '3. משתמשים' as check_item,
  p.name_he as plan,
  COUNT(u.id) as users_count,
  STRING_AGG(u.full_name || ' (' || u.email || ')', ', ') as user_list
FROM public.plans p
LEFT JOIN public.users u ON u.plan_id = p.id
GROUP BY p.id, p.name_he
ORDER BY p.monthly_price ASC;

-- 4. האם יש תוכניות ישנות?
SELECT 
  '4. תוכניות ישנות' as check_item,
  COUNT(*) as old_plans_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ אין - הכל נקי!'
    ELSE '⚠️ עדיין יש תוכניות ישנות'
  END as status
FROM public.plans
WHERE id NOT IN ('wifi-cloud-plan', 'sim-cloud-plan');

-- 5. האם יש משתמשים עם תוכניות לא קיימות?
SELECT 
  '5. משתמשים עם תוכניות שבורות' as check_item,
  COUNT(*) as broken_links,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ הכל מקושר נכון!'
    ELSE '⚠️ יש משתמשים עם plan_id לא קיים'
  END as status
FROM public.users u
WHERE u.plan_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.plans p WHERE p.id = u.plan_id
  );

-- 6. סיכום סופי
SELECT 
  'סיכום' as summary,
  (SELECT COUNT(*) FROM public.plans) as total_plans,
  (SELECT COUNT(*) FROM public.users WHERE plan_id IS NOT NULL) as users_with_plans,
  (SELECT COUNT(*) FROM public.subscriptions WHERE status = 'active') as active_subscriptions;

-- =====================================================
-- אם הכל תקין:
-- - total_plans = 2
-- - כל המשתמשים מקושרים ל-wifi-cloud-plan או sim-cloud-plan
-- - אין תוכניות ישנות
-- =====================================================
