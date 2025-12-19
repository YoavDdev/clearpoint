-- Focused debug for subscription display issue
-- User: yoavdrasteam@gmail.com
-- ID: 3c6fc545-6401-4778-8157-3a3419d98668

-- 1. Check the subscription record directly
SELECT 
  s.id,
  s.user_id,
  s.plan_id,
  s.status,
  s.amount,
  s.billing_cycle,
  s.next_billing_date,
  s.created_at
FROM subscriptions s
WHERE s.user_id = '3c6fc545-6401-4778-8157-3a3419d98668';

-- 2. Check if plan exists and linked correctly
SELECT 
  p.id,
  p.name,
  p.name_he,
  p.monthly_price,
  p.retention_days,
  p.camera_limit,
  p.connection_type
FROM plans p
WHERE p.id = 'sim-cloud-plan';

-- 3. Full join - exactly what the code does
SELECT 
  s.id as subscription_id,
  s.user_id,
  s.plan_id,
  s.status,
  s.amount,
  s.billing_cycle,
  s.next_billing_date,
  p.name as plan_name,
  p.name_he as plan_name_hebrew,
  p.monthly_price,
  p.retention_days,
  p.camera_limit,
  p.connection_type
FROM subscriptions s
LEFT JOIN plans p ON s.plan_id = p.id
WHERE s.user_id = '3c6fc545-6401-4778-8157-3a3419d98668'
  AND s.status = 'active';

-- 4. Check invoices for this user
SELECT 
  i.id,
  i.invoice_number,
  i.status,
  i.total_amount,
  i.has_subscription,
  i.monthly_price,
  i.created_at,
  i.paid_at
FROM invoices i
WHERE i.user_id = '3c6fc545-6401-4778-8157-3a3419d98668'
ORDER BY i.created_at DESC;
