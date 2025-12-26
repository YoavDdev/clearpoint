-- יצירת Subscriptions עבור 2 לקוחות קיימים
-- אלה לקוחות ששילמו על התקנה ויש להם הוראת קבע ב-PayPlus
-- אבל אין להם subscription במערכת

-- Subscription ללקוח ראשון
INSERT INTO subscriptions (
  user_id,
  plan_id,
  status,
  billing_cycle,
  amount,
  currency,
  payment_method,
  provider,
  start_date,
  next_payment_date,
  last_payment_date,
  payment_failures,
  auto_renew,
  created_at,
  updated_at
) VALUES (
  '14a644fe-3bbe-44f3-ac91-1f6be8a20b0f',
  'basic',
  'active',
  'monthly',
  1,
  'ILS',
  'credit_card',
  'payplus',
  NOW(),
  NOW() + INTERVAL '1 month',
  NOW(),
  0,
  true,
  NOW(),
  NOW()
);

-- Subscription ללקוח שני
INSERT INTO subscriptions (
  user_id,
  plan_id,
  status,
  billing_cycle,
  amount,
  currency,
  payment_method,
  provider,
  start_date,
  next_payment_date,
  last_payment_date,
  payment_failures,
  auto_renew,
  created_at,
  updated_at
) VALUES (
  '39ec153a-fd3e-41c2-8760-0cc7b40e7737',
  'basic',
  'active',
  'monthly',
  1,
  'ILS',
  'credit_card',
  'payplus',
  NOW(),
  NOW() + INTERVAL '1 month',
  NOW(),
  0,
  true,
  NOW(),
  NOW()
);

-- בדוק שנוצרו
SELECT 
  id,
  user_id,
  status,
  amount,
  next_payment_date,
  payplus_customer_uid,
  recurring_uid
FROM subscriptions
WHERE user_id IN (
  '14a644fe-3bbe-44f3-ac91-1f6be8a20b0f',
  '39ec153a-fd3e-41c2-8760-0cc7b40e7737'
);

-- שים לב:
-- payplus_customer_uid ו-recurring_uid יהיו NULL
-- צריך לעדכן אותם מהמידע שיש לך ב-PayPlus Dashboard!
