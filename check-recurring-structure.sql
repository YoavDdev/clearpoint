-- בדיקת מבנה הטבלאות לזיהוי הוראות קבע

-- 1. מבנה טבלת subscriptions
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'subscriptions'
ORDER BY ordinal_position;

-- 2. מבנה טבלת payments
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'payments'
ORDER BY ordinal_position;

-- 3. מבנה טבלת invoices
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'invoices'
ORDER BY ordinal_position;

-- 4. בדיקת אם יש metadata בתשלומים שמתעד recurring token
SELECT 
  id,
  user_id,
  status,
  payment_type,
  provider,
  metadata
FROM payments
WHERE user_id = '3c6fc545-6401-4778-8157-3a3419d98668'
ORDER BY created_at DESC
LIMIT 5;

-- 5. בדיקת המנוי הספציפי
SELECT 
  id,
  user_id,
  plan_id,
  status,
  amount,
  billing_cycle,
  next_billing_date,
  created_at
FROM subscriptions
WHERE user_id = '3c6fc545-6401-4778-8157-3a3419d98668';
