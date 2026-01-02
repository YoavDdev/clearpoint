-- בדיקת סטטוס מנוי ללקוח yoavdra@gmail.com

-- 1. מצא את המשתמש
SELECT 
  id,
  full_name,
  email,
  phone,
  plan_id,
  customer_uid,
  created_at
FROM users
WHERE email = 'yoavdra@gmail.com';

-- 2. בדוק payments של המשתמש
SELECT 
  id,
  amount,
  currency,
  status,
  transaction_id,
  created_at,
  metadata
FROM payments
WHERE user_id = (SELECT id FROM users WHERE email = 'yoavdra@gmail.com')
ORDER BY created_at DESC;

-- 3. בדוק invoices של המשתמש
SELECT 
  i.id,
  i.status,
  i.total_amount,
  i.currency,
  i.created_at,
  i.paid_at,
  COUNT(ii.id) as items_count
FROM invoices i
LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
WHERE i.user_id = (SELECT id FROM users WHERE email = 'yoavdra@gmail.com')
GROUP BY i.id, i.status, i.total_amount, i.currency, i.created_at, i.paid_at
ORDER BY i.created_at DESC;

-- 4. בדוק subscriptions (אם יש טבלה כזו)
SELECT 
  id,
  status,
  plan_id,
  amount,
  billing_cycle,
  started_at,
  trial_ends_at,
  next_billing_date,
  payment_provider
FROM subscriptions
WHERE user_id = (SELECT id FROM users WHERE email = 'yoavdra@gmail.com')
ORDER BY created_at DESC;
