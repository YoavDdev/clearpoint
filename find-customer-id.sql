-- מצא ID של לקוח לפי אימייל
-- שנה את האימייל למה שאתה צריך

SELECT 
  id,
  full_name,
  email,
  plan_id
FROM users
WHERE email = 'test@example.com'  -- <-- שנה את זה
LIMIT 1;

-- או חפש לפי שם:
SELECT 
  id,
  full_name,
  email,
  plan_id
FROM users
WHERE full_name ILIKE '%יוסי%'  -- <-- שנה את זה
LIMIT 5;
