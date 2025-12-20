-- בדיקה מי הבעלים של החשבוניות

-- 1. כל החשבוניות שיש במערכת
SELECT 
  i.id,
  i.invoice_number,
  i.user_id,
  u.email,
  u.full_name,
  i.total_amount,
  i.status,
  i.created_at,
  i.has_subscription
FROM invoices i
JOIN users u ON u.id = i.user_id
ORDER BY i.created_at DESC;

-- 2. ספירה לפי משתמש
SELECT 
  u.email,
  u.full_name,
  COUNT(i.id) as invoice_count,
  SUM(i.total_amount) as total_amount
FROM users u
LEFT JOIN invoices i ON i.user_id = u.id
GROUP BY u.id, u.email, u.full_name
ORDER BY invoice_count DESC;

-- 3. חיובי מנוי לפי משתמש
SELECT 
  u.email,
  u.full_name,
  COUNT(sc.id) as charge_count,
  SUM(sc.amount) as total_charges
FROM users u
LEFT JOIN subscriptions s ON s.user_id = u.id
LEFT JOIN subscription_charges sc ON sc.subscription_id = s.id
GROUP BY u.id, u.email, u.full_name
ORDER BY charge_count DESC;
