-- =====================================================
-- בדיקת סטטוס נוכחי
-- =====================================================

-- בדוק אם subscriptions קיימת ומה יש בה
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'subscriptions'
ORDER BY ordinal_position;

-- ספור כמה עמודות יש
SELECT COUNT(*) as total_columns
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'subscriptions';
