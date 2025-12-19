-- Debug script for customer: yoavdrasteam@gmail.com
-- Run this in your Supabase SQL Editor

-- 1. Check user exists and basic info
SELECT 
  id,
  email,
  full_name,
  plan_id,
  custom_price,
  created_at,
  role
FROM users 
WHERE email = 'yoavdrasteam@gmail.com';

-- 2. Check subscriptions
SELECT 
  s.id,
  s.user_id,
  s.plan_id,
  s.status,
  s.amount,
  s.billing_cycle,
  s.next_billing_date,
  s.created_at,
  p.name as plan_name,
  p.name_he as plan_name_hebrew,
  p.monthly_price,
  p.retention_days,
  p.camera_limit,
  p.connection_type
FROM subscriptions s
LEFT JOIN plans p ON s.plan_id = p.id
WHERE s.user_id IN (
  SELECT id FROM users WHERE email = 'yoavdrasteam@gmail.com'
);

-- 3. Check invoices
SELECT 
  i.id,
  i.invoice_number,
  i.status,
  i.total_amount,
  i.currency,
  i.has_subscription,
  i.monthly_price,
  i.created_at,
  i.paid_at
FROM invoices i
WHERE i.user_id IN (
  SELECT id FROM users WHERE email = 'yoavdrasteam@gmail.com'
)
ORDER BY i.created_at DESC;

-- 4. Check payments
SELECT 
  p.id,
  p.amount,
  p.status,
  p.payment_type,
  p.provider,
  p.created_at,
  p.paid_at,
  p.provider_transaction_id
FROM payments p
WHERE p.user_id IN (
  SELECT id FROM users WHERE email = 'yoavdrasteam@gmail.com'
)
ORDER BY p.created_at DESC;

-- 5. Check cameras
SELECT 
  c.id,
  c.name,
  c.mini_pc_id,
  c.created_at
FROM cameras c
WHERE c.user_id IN (
  SELECT id FROM users WHERE email = 'yoavdrasteam@gmail.com'
);

-- 6. Full join to see relationships
SELECT 
  u.email,
  u.plan_id as user_plan_id,
  s.id as subscription_id,
  s.status as subscription_status,
  s.plan_id as subscription_plan_id,
  i.id as invoice_id,
  i.invoice_number,
  i.status as invoice_status,
  p.id as payment_id,
  p.status as payment_status
FROM users u
LEFT JOIN subscriptions s ON u.id = s.user_id
LEFT JOIN invoices i ON u.id = i.user_id
LEFT JOIN payments p ON u.id = p.user_id
WHERE u.email = 'yoavdrasteam@gmail.com';
