-- 🔍 בדיקת מנוי ללקוח החדש
-- User ID: 685bd426-6bb5-4864-8898-2609e366983f
-- Email: yoavdrasteam@gmail.com

-- 1️⃣ בדיקת נתוני המשתמש
SELECT 
  id,
  email,
  full_name,
  subscription_status,
  custom_price,
  subscription_id,
  setup_paid,
  created_at
FROM users 
WHERE id = '685bd426-6bb5-4864-8898-2609e366983f';

-- 2️⃣ בדיקת מנוי חודשי בטבלת subscriptions
SELECT 
  id,
  user_id,
  status,
  amount,
  currency,
  billing_cycle,
  next_billing_date,
  provider_subscription_id,
  created_at,
  updated_at
FROM subscriptions 
WHERE user_id = '685bd426-6bb5-4864-8898-2609e366983f';

-- 3️⃣ בדיקת החשבונית שנוצרה
SELECT 
  id,
  invoice_number,
  user_id,
  status,
  total_amount,
  has_subscription,
  monthly_price,
  created_at,
  updated_at
FROM invoices 
WHERE user_id = '685bd426-6bb5-4864-8898-2609e366983f'
ORDER BY created_at DESC;

-- 4️⃣ בדיקת התשלום
SELECT 
  id,
  payment_type,
  amount,
  status,
  description,
  invoice_id,
  invoice_number,
  paid_at,
  created_at
FROM payments 
WHERE user_id = '685bd426-6bb5-4864-8898-2609e366983f'
ORDER BY created_at DESC;

-- ✅ מה אמור להיות:
-- users.subscription_id - צריך להיות מלא (UUID של המנוי)
-- subscriptions.status - צריך להיות 'active'
-- subscriptions.next_billing_date - צריך להיות בעוד חודש מהיום
-- subscriptions.amount - צריך להיות '1.00'
-- invoices.has_subscription - צריך להיות true
-- invoices.monthly_price - צריך להיות '1.00'
