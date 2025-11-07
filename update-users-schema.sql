-- ================================================
-- עדכון טבלת המשתמשים למודל החדש
-- הסרת תוכנית local, 14 ימים לכולם, הוספת setup_paid
-- ================================================

-- 🎯 שלב 1: הוסף עמודת setup_paid
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS setup_paid BOOLEAN DEFAULT false;

-- 🎯 שלב 2: עדכן כל המשתמשים ל-14 ימים
UPDATE public.users
SET plan_duration_days = 14
WHERE plan_duration_days IS NOT NULL 
  AND plan_duration_days != 14;

-- 🎯 שלב 3: הסר constraints ישנים
ALTER TABLE public.users 
  DROP CONSTRAINT IF EXISTS valid_plan_type;

ALTER TABLE public.users 
  DROP CONSTRAINT IF EXISTS valid_plan_duration;

ALTER TABLE public.users 
  DROP CONSTRAINT IF EXISTS valid_retention;

-- 🎯 שלב 4: הוסף constraint חדש
-- רק 14 ימים מותרים (או NULL)
ALTER TABLE public.users 
  ADD CONSTRAINT valid_retention 
  CHECK (plan_duration_days = 14 OR plan_duration_days IS NULL);

-- 🎯 שלב 5: מחק את השדה plan_type (legacy field - לא נחוץ יותר)
-- כל המידע נמצא ב-plan_id
ALTER TABLE public.users 
  DROP COLUMN IF EXISTS plan_type;

-- 🎯 שלב 6: הצג סטטיסטיקות
SELECT 
  plan_id,
  plan_duration_days,
  setup_paid,
  COUNT(*) as user_count
FROM public.users
GROUP BY plan_id, plan_duration_days, setup_paid
ORDER BY user_count DESC;

-- 🎯 שלב 7: הצג משתמשים שצריכים תשומת לב
SELECT 
  id,
  email,
  full_name,
  plan_id,
  plan_duration_days,
  setup_paid,
  custom_price
FROM public.users
WHERE plan_id IS NULL 
   OR plan_duration_days IS NULL
ORDER BY created_at DESC;
