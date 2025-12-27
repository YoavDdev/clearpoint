-- בדיקה אם יש subscription קיים למשתמש יואב
SELECT 
  s.*,
  u.full_name,
  u.email,
  p.name as plan_name
FROM subscriptions s
JOIN users u ON u.id = s.user_id
LEFT JOIN plans p ON p.id = s.plan_id
WHERE u.email = 'yoavdrasteam@gmail.com'
ORDER BY s.created_at DESC;
