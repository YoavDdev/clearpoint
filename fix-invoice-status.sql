-- 🔍 בדיקת סטטוס החשבונית #2025120020
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
WHERE invoice_number = '2025120020';

-- 🔍 בדיקת התשלום המקושר
SELECT 
  id,
  status,
  amount,
  paid_at,
  invoice_id,
  description
FROM payments 
WHERE user_id = '685bd426-6bb5-4864-8898-2609e366983f'
ORDER BY created_at DESC
LIMIT 1;

-- 🔧 תיקון 1: עדכון סטטוס החשבונית ל-paid
UPDATE invoices 
SET 
  status = 'paid',
  updated_at = NOW()
WHERE invoice_number = '2025120020';

-- 🔧 תיקון 2: קישור התשלום לחשבונית (invoice_id היה null!)
UPDATE payments 
SET 
  invoice_id = (SELECT id FROM invoices WHERE invoice_number = '2025120020'),
  updated_at = NOW()
WHERE id = '33d4ea6a-a07e-4062-ae8f-e9fa52d8f708';

-- 🔧 תיקון 3: עדכון subscription ל-active (אם קיים)
UPDATE subscriptions 
SET 
  status = 'active',
  updated_at = NOW()
WHERE user_id = '685bd426-6bb5-4864-8898-2609e366983f'
AND status != 'active';

-- ✅ בדיקה סופית שהכל עבד
SELECT 
  i.invoice_number,
  i.status AS invoice_status,
  i.total_amount,
  i.has_subscription,
  p.id AS payment_id,
  p.status AS payment_status,
  p.invoice_id AS payment_invoice_link
FROM invoices i
LEFT JOIN payments p ON p.invoice_id::uuid = i.id
WHERE i.invoice_number = '2025120020';
