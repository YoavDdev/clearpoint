-- Cleanup duplicate alerts from spam issue
-- This script removes duplicate alerts while keeping the most recent one

-- First, let's see what we have
SELECT 
  type,
  camera_id,
  camera_name,
  COUNT(*) as count,
  MIN(created_at) as first_alert,
  MAX(created_at) as last_alert
FROM system_alerts
WHERE resolved = false
GROUP BY type, camera_id, camera_name
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- Delete old duplicate camera_offline alerts (keep most recent for each camera)
WITH duplicates AS (
  SELECT 
    id,
    camera_id,
    ROW_NUMBER() OVER (PARTITION BY camera_id, type ORDER BY created_at DESC) as rn
  FROM system_alerts
  WHERE type = 'camera_offline' AND resolved = false
)
DELETE FROM system_alerts
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Delete old duplicate stream_error alerts (keep most recent for each camera)
WITH duplicates AS (
  SELECT 
    id,
    camera_id,
    ROW_NUMBER() OVER (PARTITION BY camera_id, type ORDER BY created_at DESC) as rn
  FROM system_alerts
  WHERE type = 'stream_error' AND resolved = false
)
DELETE FROM system_alerts
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Verify cleanup
SELECT 
  type,
  COUNT(*) as total_alerts,
  COUNT(DISTINCT camera_id) as unique_cameras
FROM system_alerts
WHERE resolved = false
GROUP BY type
ORDER BY type;
