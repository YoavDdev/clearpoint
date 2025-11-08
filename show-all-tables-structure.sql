-- =====================================================
-- הצג את כל מבנה הטבלאות במסד הנתונים
-- =====================================================

-- כל הטבלאות בסכמה public
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- כל העמודות של כל הטבלאות
SELECT 
    table_name,
    column_name,
    data_type,
    column_default,
    is_nullable,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- ספציפית - אם subscriptions קיימת, מה יש בה?
SELECT 
    column_name,
    data_type,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'subscriptions'
ORDER BY ordinal_position;
