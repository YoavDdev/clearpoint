-- בדיקה מהירה של לקוח yoavdra@gmail.com

-- סטטוס כללי
SELECT 
  u.full_name AS "שם",
  u.email AS "אימייל",
  u.customer_uid AS "Customer UID ב-PayPlus",
  u.created_at AS "נוצר בתאריך",
  COALESCE(
    (SELECT COUNT(*) FROM payments p WHERE p.user_id = u.id AND p.status = 'completed'),
    0
  ) AS "תשלומים שהושלמו",
  COALESCE(
    (SELECT COUNT(*) FROM invoices i WHERE i.user_id = u.id AND i.status = 'paid'),
    0
  ) AS "חשבוניות ששולמו",
  COALESCE(
    (SELECT SUM(p.amount) FROM payments p WHERE p.user_id = u.id AND p.status = 'completed'),
    0
  ) AS "סה״כ שילם (₪)"
FROM users u
WHERE u.email = 'yoavdra@gmail.com';

-- תשלומים אחרונים
SELECT 
  amount AS "סכום",
  currency AS "מטבע",
  status AS "סטטוס",
  created_at AS "תאריך",
  id AS "מזהה תשלום"
FROM payments
WHERE user_id = (SELECT id FROM users WHERE email = 'yoavdra@gmail.com')
ORDER BY created_at DESC
LIMIT 5;

-- חשבוניות אחרונות
SELECT 
  total_amount AS "סכום",
  status AS "סטטוס",
  created_at AS "נוצר",
  updated_at AS "עודכן"
FROM invoices
WHERE user_id = (SELECT id FROM users WHERE email = 'yoavdra@gmail.com')
ORDER BY created_at DESC
LIMIT 5;
