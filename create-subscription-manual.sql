-- יצירת מנוי ידני עבור הלקוח שכבר יש לו הוראת קבע ב-PayPlus
-- רוץ את זה ב-Supabase SQL Editor

-- 1. יצירת המנוי
INSERT INTO subscriptions (
  user_id,
  plan_id,
  payplus_customer_uid,
  recurring_uid,
  amount,
  currency,
  billing_cycle,
  status,
  payment_method,
  auto_renew,
  next_payment_date,
  payment_failures,
  created_at,
  updated_at
)
VALUES (
  '467d8618-42bd-468a-bc9d-7220e66f9abc', -- user_id
  'wifi-cloud-plan', -- plan_id (מהגדרות הלקוח)
  '4091122a-3a84-48b0-b930-e3d7dec81018', -- customer_uid מ-PayPlus
  NULL, -- recurring_uid - אם יש לך, הוסף כאן
  1.00, -- סכום החיוב החודשי
  'ILS',
  'monthly',
  'active',
  'credit_card',
  true,
  '2026-01-20', -- תאריך החיוב הבא (20 בחודש הבא)
  0,
  NOW(),
  NOW()
)
ON CONFLICT (user_id) 
DO UPDATE SET
  plan_id = EXCLUDED.plan_id,
  payplus_customer_uid = EXCLUDED.payplus_customer_uid,
  recurring_uid = EXCLUDED.recurring_uid,
  amount = EXCLUDED.amount,
  status = EXCLUDED.status,
  auto_renew = EXCLUDED.auto_renew,
  next_payment_date = EXCLUDED.next_payment_date,
  payment_failures = 0,
  updated_at = NOW();

-- 2. בדיקה שהמנוי נוצר
SELECT 
  id,
  user_id,
  status,
  amount,
  billing_cycle,
  next_payment_date,
  payplus_customer_uid,
  created_at
FROM subscriptions
WHERE user_id = '467d8618-42bd-468a-bc9d-7220e66f9abc';
