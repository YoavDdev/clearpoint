-- יצירת חיוב וחשבונית עבור התשלום שעבר ב-PayPlus
-- החיוב מ-20/12/2025, מספר אישור: 0737825
-- רוץ את זה ב-Supabase SQL Editor

-- נתונים:
-- user_id: 467d8618-42bd-468a-bc9d-7220e66f9abc
-- subscription_id: a5f735d6-4ad4-4281-86fa-e926e9145a8f
-- תאריך חיוב: 2025-12-20 04:13:00
-- מספר אישור: 0737825
-- סכום: 1.00

-- 1. יצירת רשומת חיוב
INSERT INTO subscription_charges (
  subscription_id,
  user_id,
  amount,
  currency,
  status,
  transaction_id,
  payment_method,
  charged_at,
  created_at
)
VALUES (
  'a5f735d6-4ad4-4281-86fa-e926e9145a8f', -- subscription_id
  '467d8618-42bd-468a-bc9d-7220e66f9abc', -- user_id
  1.00,
  'ILS',
  'success',
  '0737825', -- מספר אישור מ-PayPlus
  'credit_card',
  '2025-12-20 04:13:00+00', -- תאריך ושעה מדויקים
  NOW()
)
RETURNING id;

-- 2. יצירת חשבונית
WITH new_invoice AS (
  INSERT INTO invoices (
    user_id,
    invoice_number,
    status,
    total_amount,
    currency,
    paid_at,
    notes,
    has_subscription,
    created_at
  )
  SELECT
    '467d8618-42bd-468a-bc9d-7220e66f9abc',
    COALESCE(
      (SELECT generate_invoice_number()),
      'INV-' || to_char(NOW(), 'YYYYMMDD') || '-' || floor(random() * 10000)::text
    ),
    'paid',
    1.00,
    'ILS',
    '2025-12-20 04:13:00+00',
    'חיוב חודשי אוטומטי - מנוי Clearpoint Security (מספר אישור: 0737825)',
    true,
    NOW()
  RETURNING id, invoice_number, user_id
)
-- 3. יצירת פריט חשבונית
INSERT INTO invoice_items (
  invoice_id,
  item_type,
  item_name,
  item_description,
  quantity,
  unit_price,
  total_price,
  sort_order
)
SELECT
  id,
  'subscription',
  'מנוי חודשי Clearpoint Security',
  'תקופה: 20/12/2025 - 20/01/2026',
  1,
  1.00,
  1.00,
  0
FROM new_invoice
RETURNING invoice_id;

-- 4. יצירת רשומת תשלום
WITH invoice_data AS (
  SELECT id, invoice_number
  FROM invoices
  WHERE user_id = '467d8618-42bd-468a-bc9d-7220e66f9abc'
    AND paid_at = '2025-12-20 04:13:00+00'
  ORDER BY created_at DESC
  LIMIT 1
)
INSERT INTO payments (
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
)
SELECT
  '467d8618-42bd-468a-bc9d-7220e66f9abc',
  'payplus',
  'recurring',
  '1.00',
  'ILS',
  'completed',
  'חיוב חודשי אוטומטי',
  id,
  '0737825',
  '2025-12-20 04:13:00+00',
  NOW()
FROM invoice_data
RETURNING id, invoice_id, provider_transaction_id;

-- 5. בדיקה - הצג את כל מה שנוצר
SELECT 
  'subscription_charges' as table_name,
  COUNT(*) as count
FROM subscription_charges
WHERE user_id = '467d8618-42bd-468a-bc9d-7220e66f9abc'
UNION ALL
SELECT 
  'invoices',
  COUNT(*)
FROM invoices
WHERE user_id = '467d8618-42bd-468a-bc9d-7220e66f9abc'
  AND has_subscription = true
UNION ALL
SELECT 
  'invoice_items',
  COUNT(*)
FROM invoice_items ii
JOIN invoices i ON i.id = ii.invoice_id
WHERE i.user_id = '467d8618-42bd-468a-bc9d-7220e66f9abc'
  AND ii.item_type = 'subscription'
UNION ALL
SELECT 
  'payments',
  COUNT(*)
FROM payments
WHERE user_id = '467d8618-42bd-468a-bc9d-7220e66f9abc'
  AND payment_type = 'recurring';

-- 6. הצג את החשבונית שנוצרה
SELECT 
  i.id,
  i.invoice_number,
  i.status,
  i.total_amount,
  i.paid_at,
  i.notes,
  ii.item_name,
  ii.item_description
FROM invoices i
LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
WHERE i.user_id = '467d8618-42bd-468a-bc9d-7220e66f9abc'
  AND i.has_subscription = true
ORDER BY i.created_at DESC
LIMIT 1;
