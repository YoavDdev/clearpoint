-- Check what alerts were just created
SELECT 
  id,
  type,
  severity,
  message,
  created_at,
  camera_name
FROM system_alerts
WHERE created_at > NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC;
