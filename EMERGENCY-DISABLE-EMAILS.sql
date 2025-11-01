-- 🚨 EMERGENCY: DISABLE EMAIL NOTIFICATIONS IMMEDIATELY
-- Run this in Supabase SQL Editor NOW to stop email spam!

UPDATE system_settings 
SET setting_value = 'false' 
WHERE setting_key = 'email_notifications_enabled';

-- Verify it worked:
SELECT setting_key, setting_value 
FROM system_settings 
WHERE setting_key = 'email_notifications_enabled';

-- Expected result: setting_value should be 'false'
