-- =====================================================
-- בדיקה: האם הטבלאות קיימות?
-- =====================================================

SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('payments', 'subscriptions', 'subscription_history')
ORDER BY table_name;

-- אם הטבלה ריקה = הטבלאות נמחקו ✅
-- אם יש שורות = הטבלאות עדיין קיימות ⚠️
