-- ================================================================
-- DIAGNOSTIC QUERIES - Check Camera Health Sync Issues
-- ================================================================
-- Run these queries to diagnose problems with camera monitoring
-- ================================================================

-- 1. CHECK: Does mini_pc_id column exist in cameras table?
-- If this query fails, the column doesn't exist yet
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'cameras' AND column_name = 'mini_pc_id';

-- 2. CHECK: Customer yoavdra@gmail.com cameras and their status
SELECT 
  c.id,
  c.name,
  c.serial_number,
  c.mini_pc_id,
  c.is_stream_active,
  c.last_seen_at,
  u.email,
  u.full_name,
  mp.hostname as mini_pc_hostname
FROM cameras c
LEFT JOIN users u ON c.user_id = u.id
LEFT JOIN mini_pcs mp ON c.mini_pc_id = mp.id
WHERE u.email = 'yoavdra@gmail.com'
ORDER BY c.name;

-- 3. CHECK: Cameras WITHOUT mini_pc_id (these won't be monitored!)
SELECT 
  c.id,
  c.name,
  c.user_id,
  u.email,
  u.full_name
FROM cameras c
LEFT JOIN users u ON c.user_id = u.id
WHERE c.mini_pc_id IS NULL
ORDER BY u.email;

-- 4. CHECK: Camera health data for yoavdra@gmail.com
SELECT 
  ch.camera_id,
  c.name as camera_name,
  ch.stream_status,
  ch.last_checked,
  ch.log_message,
  EXTRACT(EPOCH FROM (NOW() - ch.last_checked)) / 60 as minutes_since_check
FROM camera_health ch
LEFT JOIN cameras c ON ch.camera_id = c.id
LEFT JOIN users u ON c.user_id = u.id
WHERE u.email = 'yoavdra@gmail.com'
ORDER BY ch.created_at DESC
LIMIT 20;

-- 5. CHECK: Mini PC for yoavdra@gmail.com
SELECT 
  mp.id,
  mp.hostname,
  mp.device_name,
  mp.is_active,
  u.email,
  COUNT(c.id) as camera_count
FROM mini_pcs mp
LEFT JOIN users u ON mp.user_id = u.id
LEFT JOIN cameras c ON c.mini_pc_id = mp.id
WHERE u.email = 'yoavdra@gmail.com'
GROUP BY mp.id, mp.hostname, mp.device_name, mp.is_active, u.email;

-- 6. CHECK: All cameras and their monitoring status
SELECT 
  u.email,
  u.full_name,
  COUNT(c.id) as total_cameras,
  COUNT(c.mini_pc_id) as cameras_with_minipc,
  COUNT(c.id) - COUNT(c.mini_pc_id) as orphaned_cameras,
  SUM(CASE WHEN c.is_stream_active THEN 1 ELSE 0 END) as active_cameras
FROM users u
LEFT JOIN cameras c ON c.user_id = u.id
GROUP BY u.email, u.full_name
HAVING COUNT(c.id) > 0
ORDER BY u.email;

-- 7. CHECK: Cameras that should have health data but don't
SELECT 
  c.id,
  c.name,
  c.mini_pc_id,
  u.email,
  mp.hostname,
  c.last_seen_at,
  CASE 
    WHEN ch.camera_id IS NULL THEN 'NO HEALTH DATA'
    ELSE 'HAS HEALTH DATA'
  END as health_status
FROM cameras c
LEFT JOIN users u ON c.user_id = u.id
LEFT JOIN mini_pcs mp ON c.mini_pc_id = mp.id
LEFT JOIN (
  SELECT DISTINCT camera_id 
  FROM camera_health 
  WHERE last_checked > NOW() - INTERVAL '1 hour'
) ch ON c.id = ch.camera_id
WHERE c.mini_pc_id IS NOT NULL
ORDER BY u.email, c.name;
