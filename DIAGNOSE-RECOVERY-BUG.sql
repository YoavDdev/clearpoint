-- ================================================================
-- DIAGNOSE FALSE RECOVERY EMAIL BUG
-- ================================================================
-- Run these queries to understand what happened
-- ================================================================

-- 1. Check all alerts for מרפסת camera
SELECT 
  sa.id,
  sa.type,
  sa.severity,
  sa.message,
  sa.resolved,
  sa.created_at,
  sa.resolved_at,
  c.name as camera_name
FROM system_alerts sa
JOIN cameras c ON c.id = sa.camera_id
WHERE c.name = 'מרפסת'
ORDER BY sa.created_at DESC
LIMIT 20;

-- 2. Check if there's ANY health data for מרפסת (in case name is different)
SELECT 
  c.id,
  c.name,
  COUNT(ch.id) as health_record_count,
  MAX(ch.created_at) as last_health_record,
  MAX(ch.last_checked) as last_reported_health
FROM cameras c
LEFT JOIN camera_health ch ON ch.camera_id = c.id
WHERE c.user_id = (SELECT user_id FROM cameras WHERE name = 'מרפסת' LIMIT 1)
GROUP BY c.id, c.name
ORDER BY c.name;

-- 3. Check camera details
SELECT 
  id,
  name,
  serial_number,
  is_stream_active,
  last_seen_at,
  mini_pc_id
FROM cameras
WHERE name = 'מרפסת';

-- 4. Check email log for recovery emails
SELECT 
  id,
  email_type,
  recipient_email,
  subject,
  sent_at,
  success
FROM email_logs
WHERE subject LIKE '%מרפסת%'
  OR subject LIKE '%חזרה לפעול%'
ORDER BY sent_at DESC
LIMIT 10;

-- 5. Look for camera_online type alerts (recovery alerts)
SELECT 
  sa.id,
  sa.type,
  sa.message,
  sa.created_at,
  c.name
FROM system_alerts sa
LEFT JOIN cameras c ON c.id = sa.camera_id
WHERE sa.type = 'camera_online'
ORDER BY sa.created_at DESC
LIMIT 10;
