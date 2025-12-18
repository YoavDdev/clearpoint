-- בדיקת משתמש הטסט לפני חיוב מחר
SELECT 
  id,
  email,
  full_name,
  subscription_active,
  plan_id,
  custom_price,
  created_at
FROM users 
WHERE email = 'yoavdrasteam@gmail.com';

-- בדיקת מנויים קיימים
SELECT 
  s.id,
  s.user_id,
  s.status,
  s.amount,
  s.next_billing_date,
  s.started_at
FROM subscriptions s
JOIN users u ON u.id = s.user_id
WHERE u.email = 'yoavdrasteam@gmail.com'
ORDER BY s.created_at DESC;
