-- מציאת User ID לפי email
SELECT 
  id,
  full_name,
  email,
  phone,
  created_at
FROM users
WHERE email = 'yoavdrasteam@gmail.com';
