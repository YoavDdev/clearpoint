-- בדיקת customer_uid של הלקוח yoavdrasteam
SELECT 
  id,
  email,
  full_name,
  customer_uid,
  created_at
FROM users 
WHERE email = 'yoavdrasteam@gmail.com';

-- אם אין תוצאה, נחפש לפי שם
SELECT 
  id,
  email,
  full_name,
  customer_uid,
  created_at
FROM users 
WHERE full_name ILIKE '%yoav%'
   OR email ILIKE '%yoav%';
