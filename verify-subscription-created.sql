-- בדיקה שהמנוי נוצר אוטומטית אחרי החיוב מ-PayPlus

-- 1. בדיקת מנוי חדש (צריך להיות status = 'active')
SELECT 
  id,
  user_id,
  status,
  amount,
  next_billing_date,
  started_at,
  created_at,
  metadata
FROM subscriptions 
WHERE user_id = '3c6fc545-6401-4778-8157-3a3419d98668'
ORDER BY created_at DESC
LIMIT 2;

-- 2. בדיקת users.subscription_active (צריך להיות true)
SELECT 
  id,
  email,
  full_name,
  subscription_active,
  subscription_status,
  subscription_id
FROM users 
WHERE id = '3c6fc545-6401-4778-8157-3a3419d98668';

-- 3. בדיקת התשלום שנרשם
SELECT 
  id,
  amount,
  status,
  payment_type,
  description,
  provider_payment_id,
  paid_at,
  created_at
FROM payments 
WHERE user_id = '3c6fc545-6401-4778-8157-3a3419d98668'
ORDER BY created_at DESC
LIMIT 3;

-- 4. בדיקת החשבונית שנוצרה
SELECT 
  i.id,
  i.invoice_number,
  i.status,
  i.total_amount,
  i.has_subscription,
  i.created_at,
  ii.item_name,
  ii.item_description
FROM invoices i
LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
WHERE i.user_id = '3c6fc545-6401-4778-8157-3a3419d98668'
ORDER BY i.created_at DESC
LIMIT 5;
