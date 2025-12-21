-- בדיקת ה-role שלך ב-DB

SELECT 
  id,
  email,
  full_name,
  role,
  created_at
FROM users
WHERE email LIKE '%yoav%'
   OR full_name LIKE '%יואב%';
