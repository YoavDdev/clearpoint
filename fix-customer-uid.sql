-- תיקון customer_uid ללקוח yoavdrasteam
-- עדכון ל-UID הנכון מ-PayPlus

UPDATE users 
SET customer_uid = 'b84b2c09-d433-47af-a1f9-7eed33c5307e'
WHERE email = 'yoavdrasteam@gmail.com';

-- אימות שהעדכון עבד
SELECT 
  id,
  email,
  full_name,
  customer_uid
FROM users 
WHERE email = 'yoavdrasteam@gmail.com';
