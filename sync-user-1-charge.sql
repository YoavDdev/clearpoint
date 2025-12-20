-- יצירת חיוב וחשבונית עבור yoavdrasteam@gmail.com
-- החיוב מ-19/12/2025

-- נתונים:
-- user_id: 3c6fc545-6401-4778-8157-3a3419d98668
-- subscription_id: 9a6a7826-3ef1-4ef2-9418-ba46d9e9b168
-- תאריך חיוב: 2025-12-19 20:47:51
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
  '9a6a7826-3ef1-4ef2-9418-ba46d9e9b168',
  '3c6fc545-6401-4778-8157-3a3419d98668',
  1.00,
  'ILS',
  'success',
  'SYNC-' || extract(epoch from now())::text,
  'credit_card',
  '2025-12-19 20:47:51+00',
  NOW()
)
ON CONFLICT DO NOTHING
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
    '3c6fc545-6401-4778-8157-3a3419d98668',
    COALESCE(
      (SELECT generate_invoice_number()),
      'INV-' || to_char(NOW(), 'YYYYMMDD') || '-' || floor(random() * 10000)::text
    ),
    'paid',
    1.00,
    'ILS',
    '2025-12-19 20:47:51+00',
    'חיוב חודשי אוטומטי - מנוי Clearpoint Security',
    true,
    NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM invoices 
    WHERE user_id = '3c6fc545-6401-4778-8157-3a3419d98668'
      AND paid_at = '2025-12-19 20:47:51+00'
  )
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
  'תקופה: 19/12/2025 - 19/01/2026',
  1,
  1.00,
  1.00,
  0
FROM new_invoice
WHERE id IS NOT NULL
RETURNING invoice_id;

-- 4. עדכן את המנוי שבוצע sync
UPDATE subscriptions
SET last_sync_with_payplus = NOW()
WHERE id = '9a6a7826-3ef1-4ef2-9418-ba46d9e9b168';

-- 5. בדיקה
SELECT 
  'sync completed' as status,
  (SELECT COUNT(*) FROM subscription_charges WHERE subscription_id = '9a6a7826-3ef1-4ef2-9418-ba46d9e9b168') as charges,
  (SELECT COUNT(*) FROM invoices WHERE user_id = '3c6fc545-6401-4778-8157-3a3419d98668' AND has_subscription = true) as invoices;
