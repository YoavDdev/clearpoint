-- בדיקה מלאה של חיוב ההוראת קבע
-- רץ את זה ב-Supabase SQL Editor

-- 1. בדיקת המנוי של הלקוח
SELECT 
  id,
  user_id,
  status,
  billing_cycle,
  amount,
  currency,
  recurring_uid,
  payplus_customer_uid,
  last_payment_date,
  next_payment_date,
  payment_failures,
  auto_renew,
  created_at
FROM subscriptions
WHERE user_id = '467d8618-42bd-468a-bc9d-7220e66f9abc'
ORDER BY created_at DESC;

-- 2. בדיקת חיובים שהתקבלו (subscription_charges)
SELECT 
  id,
  subscription_id,
  user_id,
  amount,
  currency,
  status,
  transaction_id,
  recurring_uid,
  charged_at,
  created_at,
  error_message
FROM subscription_charges
WHERE user_id = '467d8618-42bd-468a-bc9d-7220e66f9abc'
ORDER BY charged_at DESC;

-- 3. בדיקת חשבוניות אוטומטיות שנוצרו
SELECT 
  id,
  user_id,
  invoice_number,
  status,
  total_amount,
  currency,
  paid_at,
  notes,
  has_subscription,
  created_at
FROM invoices
WHERE user_id = '467d8618-42bd-468a-bc9d-7220e66f9abc'
ORDER BY created_at DESC;

-- 4. בדיקת פריטי חשבוניות מנוי
SELECT 
  ii.id,
  ii.invoice_id,
  ii.item_type,
  ii.item_name,
  ii.quantity,
  ii.unit_price,
  ii.total_price,
  i.invoice_number,
  i.status as invoice_status
FROM invoice_items ii
JOIN invoices i ON i.id = ii.invoice_id
WHERE i.user_id = '467d8618-42bd-468a-bc9d-7220e66f9abc'
  AND ii.item_type = 'subscription'
ORDER BY ii.created_at DESC;

-- 5. בדיקת רשומות תשלום (payments)
SELECT 
  id,
  user_id,
  payment_provider,
  payment_type,
  amount,
  currency,
  status,
  description,
  invoice_id,
  provider_transaction_id,
  paid_at,
  created_at
FROM payments
WHERE user_id = '467d8618-42bd-468a-bc9d-7220e66f9abc'
ORDER BY created_at DESC;

-- 6. בדיקת פרטי המשתמש
SELECT 
  id,
  full_name,
  email,
  phone,
  role,
  created_at
FROM users
WHERE id = '467d8618-42bd-468a-bc9d-7220e66f9abc';

-- 7. ספירה כוללת
SELECT 
  'Subscriptions' as table_name,
  COUNT(*) as count
FROM subscriptions
WHERE user_id = '467d8618-42bd-468a-bc9d-7220e66f9abc'
UNION ALL
SELECT 
  'Subscription Charges' as table_name,
  COUNT(*) as count
FROM subscription_charges
WHERE user_id = '467d8618-42bd-468a-bc9d-7220e66f9abc'
UNION ALL
SELECT 
  'Invoices (Subscription)' as table_name,
  COUNT(*) as count
FROM invoices
WHERE user_id = '467d8618-42bd-468a-bc9d-7220e66f9abc'
  AND has_subscription = true
UNION ALL
SELECT 
  'Payments (Recurring)' as table_name,
  COUNT(*) as count
FROM payments
WHERE user_id = '467d8618-42bd-468a-bc9d-7220e66f9abc'
  AND payment_type = 'recurring';
