-- בדיקת חיוב מהבוקר - 21/12/2025 04:11

-- 1. חפש את החיוב ב-subscription_charges
SELECT 
  'subscription_charges' as table_name,
  id,
  user_id,
  subscription_id,
  amount,
  status,
  charged_at,
  transaction_id,
  recurring_uid,
  created_at
FROM subscription_charges
WHERE charged_at::date = '2025-12-21'
   OR transaction_id = 'OEcUhW7oN4'
ORDER BY created_at DESC;

-- 2. חפש חשבוניות שנוצרו היום
SELECT 
  'invoices' as table_name,
  id,
  user_id,
  invoice_number,
  total_amount,
  status,
  created_at,
  sent_at,
  paid_at
FROM invoices
WHERE created_at::date = '2025-12-21'
ORDER BY created_at DESC;


-- 3. חפש תשלומים שנוצרו היום
SELECT 
  'payments' as table_name,
  id,
  user_id,
  payment_type,
  amount,
  status,
  payment_provider,
  provider_payment_id,
  provider_transaction_id,
  created_at,
  paid_at
FROM payments
WHERE created_at::date = '2025-12-21'
   OR provider_transaction_id = 'OEcUhW7oN4'
   OR provider_payment_id = 'OEcUhW7oN4'
ORDER BY created_at DESC;

-- 4. בדוק את המנוי של יואב
SELECT 
  'subscriptions' as table_name,
  id,
  user_id,
  status,
  amount,
  last_payment_date,
  next_payment_date,
  last_sync_with_payplus,
  created_at,
  updated_at
FROM subscriptions
WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE '%yoav%' OR full_name LIKE '%יואב%'
);

-- 5. היסטוריית sync אחרונה
SELECT 
  'subscription_sync_history' as table_name,
  id,
  subscription_id,
  user_id,
  sync_type,
  sync_source,
  status,
  charges_synced,
  started_at,
  completed_at,
  duration_ms
FROM subscription_sync_history
ORDER BY started_at DESC
LIMIT 5;
