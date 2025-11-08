-- בדיקה ידנית של הוספת מנוי
-- הרץ את זה ב-Supabase SQL Editor

-- 1. קבלת משתמש לבדיקה
SELECT 
  id,
  email,
  full_name,
  plan_id,
  custom_price
FROM users
LIMIT 1;

-- 2. נסיון להוסיף מנוי (החלף את USER_ID ו-PLAN_ID מהתוצאות למעלה)
-- INSERT INTO subscriptions (
--   user_id,
--   plan_id,
--   status,
--   billing_cycle,
--   amount,
--   currency,
--   next_billing_date,
--   billing_day,
--   payment_provider,
--   started_at
-- ) VALUES (
--   'USER_ID_HERE',  -- החלף
--   'PLAN_ID_HERE',  -- החלף
--   'active',
--   'monthly',
--   149,
--   'ILS',
--   CURRENT_DATE + INTERVAL '1 month',
--   EXTRACT(DAY FROM CURRENT_DATE),
--   'grow',
--   NOW()
-- );

-- אם זה עובד, הבעיה היא בקוד
-- אם זה נכשל, הבעיה היא ב-DB

SELECT '📝 Copy the user_id and plan_id from above, uncomment the INSERT, replace the values, and run again' as instructions;
