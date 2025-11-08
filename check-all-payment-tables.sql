-- =====================================================
-- בדיקה מקיפה של כל הטבלאות הקשורות לתשלומים
-- =====================================================

-- בדוק את כל הטבלאות שקשורות לתשלומים
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (
    table_name LIKE '%payment%' 
    OR table_name LIKE '%subscription%'
)
ORDER BY table_name;

-- בדוק את כל העמודות בטבלת subscriptions אם היא קיימת
SELECT 
    column_name,
    data_type,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'subscriptions'
ORDER BY ordinal_position;
