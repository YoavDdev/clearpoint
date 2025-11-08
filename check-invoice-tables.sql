-- בדיקה שהטבלאות נוצרו בהצלחה
-- העתק והרץ את זה ב-Supabase SQL Editor

-- 1. בדיקת טבלת חשבוניות
SELECT COUNT(*) as invoice_count FROM invoices;

-- 2. בדיקת טבלת פריטים
SELECT COUNT(*) as items_count FROM invoice_items;

-- 3. בדיקת תבניות - צריך להיות 10
SELECT COUNT(*) as templates_count FROM item_templates;

-- 4. הצגת כל התבניות
SELECT 
  item_type,
  item_name,
  default_price,
  camera_type
FROM item_templates
ORDER BY item_type, default_price;

-- 5. בדיקת פונקציה ליצירת מספר חשבונית
SELECT generate_invoice_number() as test_invoice_number;
