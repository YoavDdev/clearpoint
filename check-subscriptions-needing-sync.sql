-- בדיקה אילו מנויים צריכים סנכרון
-- רוץ את זה כדי לראות את הפרטים

SELECT 
  s.id as subscription_id,
  s.user_id,
  u.email,
  u.full_name,
  s.status,
  s.amount,
  s.last_sync_with_payplus,
  s.last_payment_date,
  s.next_payment_date,
  s.payment_failures,
  s.recurring_uid,
  s.payplus_customer_uid,
  CASE
    WHEN s.last_sync_with_payplus IS NULL THEN 'never_synced'
    WHEN s.last_sync_with_payplus < NOW() - INTERVAL '7 days' THEN 'stale_sync'
    WHEN s.payment_failures > 0 THEN 'has_failures'
    WHEN s.status = 'payment_failed' THEN 'payment_failed'
    ELSE 'routine_check'
  END as sync_reason,
  CASE
    WHEN s.status = 'payment_failed' THEN 1
    WHEN s.payment_failures > 0 THEN 2
    WHEN s.last_sync_with_payplus IS NULL THEN 3
    ELSE 4
  END as priority
FROM subscriptions s
JOIN users u ON u.id = s.user_id
WHERE 
  s.status IN ('active', 'payment_failed', 'grace_period', 'pending_first_payment')
  AND (
    s.last_sync_with_payplus IS NULL OR
    s.last_sync_with_payplus < NOW() - INTERVAL '7 days' OR
    s.payment_failures > 0 OR
    s.status = 'payment_failed'
  )
ORDER BY priority ASC, s.last_sync_with_payplus ASC NULLS FIRST;
