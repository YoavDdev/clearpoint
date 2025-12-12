-- בדיקת מנוי עבור המשתמש
SELECT * FROM subscriptions 
WHERE user_id = '1a202c64-40db-4366-93b5-3f78048de558';

-- בדיקת כל המנויים בטבלה
SELECT id, user_id, status, amount, next_billing_date, created_at 
FROM subscriptions
ORDER BY created_at DESC
LIMIT 10;
