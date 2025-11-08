-- בדיקת החשבונית שנוצרה
-- הרץ את זה אחרי שיצרת חשבונית

-- 1. כל החשבוניות
SELECT 
  invoice_number,
  status,
  total_amount,
  created_at,
  payment_link IS NOT NULL as has_payment_link
FROM invoices
ORDER BY created_at DESC
LIMIT 5;

-- 2. פריטי החשבונית האחרונה
SELECT 
  i.invoice_number,
  ii.item_name,
  ii.quantity,
  ii.unit_price,
  ii.total_price
FROM invoices i
JOIN invoice_items ii ON i.id = ii.invoice_id
ORDER BY i.created_at DESC, ii.sort_order
LIMIT 10;

-- 3. בדיקת התשלום שנוצר
SELECT 
  p.amount,
  p.status,
  p.description,
  p.provider_payment_url IS NOT NULL as has_payment_url
FROM payments p
ORDER BY p.created_at DESC
LIMIT 5;
