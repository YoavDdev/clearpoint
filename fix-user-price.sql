-- תיקון מחיר משתמש
-- הרץ את זה ב-Supabase SQL Editor

-- 1. בדיקת המחיר הנוכחי
SELECT 
  id,
  email,
  full_name,
  plan_id,
  custom_price,
  CASE 
    WHEN custom_price < 50 THEN '❌ מחיר נראה שגוי!'
    WHEN custom_price >= 50 THEN '✅ מחיר תקין'
    ELSE '⚠️ אין מחיר'
  END as price_status
FROM users
WHERE id = 'a6d9650e-4a29-44e2-ba0a-8f1ebf57b839';

-- 2. תיקון המחיר (אם צריך)
-- UPDATE users
-- SET custom_price = 149  -- או 99, תלוי בתוכנית
-- WHERE id = 'a6d9650e-4a29-44e2-ba0a-8f1ebf57b839';

-- 3. בדיקה כללית - כל המחירים המוזרים
SELECT 
  id,
  email,
  full_name,
  custom_price,
  plan_id
FROM users
WHERE custom_price < 50 OR custom_price IS NULL
ORDER BY created_at DESC
LIMIT 10;
