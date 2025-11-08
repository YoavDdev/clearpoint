-- בדיקת טבלאות subscription
-- הרץ את זה ב-Supabase SQL Editor

-- 1. בדיקה אם טבלת subscriptions קיימת
SELECT 
  'subscriptions table exists:' as info,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'subscriptions'
  ) as exists;

-- 2. בדיקה אם טבלת subscription_history קיימת
SELECT 
  'subscription_history table exists:' as info,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'subscription_history'
  ) as exists;

-- 3. מבנה טבלת subscriptions (אם קיימת)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'subscriptions'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. מבנה טבלת subscription_history (אם קיימת)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'subscription_history'
  AND table_schema = 'public'
ORDER BY ordinal_position;
