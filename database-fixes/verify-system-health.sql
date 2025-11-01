-- ================================================================
-- SYSTEM HEALTH VERIFICATION QUERIES
-- ================================================================
-- Run these to verify everything is working correctly
-- ================================================================

-- === 1. CHECK MINI PC HEALTH DATA ===
SELECT 
  mp.hostname,
  mph.cpu_temp_celsius,
  mph.ram_usage_pct,
  mph.disk_root_pct,
  mph.internet_connected,
  mph.overall_status,
  mph.last_checked,
  EXTRACT(EPOCH FROM (NOW() - mph.last_checked)) / 60 as minutes_since_check,
  u.email
FROM mini_pc_health mph
LEFT JOIN mini_pcs mp ON mph.mini_pc_id = mp.id
LEFT JOIN users u ON mp.user_id = u.id
WHERE u.email = 'yoavdra@gmail.com'
ORDER BY mph.created_at DESC
LIMIT 5;

-- Expected: Should see recent health data (< 10 minutes ago)
-- Status should be: healthy, warning, or critical
-- All system metrics should have values

-- === 2. CHECK CAMERA HEALTH DATA ===
SELECT 
  c.name as camera_name,
  ch.stream_status,
  ch.log_message,
  ch.last_checked,
  EXTRACT(EPOCH FROM (NOW() - ch.last_checked)) / 60 as minutes_since_check,
  u.email
FROM camera_health ch
LEFT JOIN cameras c ON ch.camera_id = c.id
LEFT JOIN users u ON c.user_id = u.id
WHERE u.email = 'yoavdra@gmail.com'
ORDER BY c.name, ch.created_at DESC;

-- Expected:
-- Camera "מרפסת": stream_status = "missing", log = "No m3u8 file"
-- Other cameras: stream_status = "ok", log = "Healthy"
-- All checks should be < 10 minutes ago

-- === 3. CHECK MINI_PC_ID IN CAMERAS TABLE ===
SELECT 
  c.id,
  c.name,
  c.mini_pc_id,
  mp.hostname,
  u.email
FROM cameras c
LEFT JOIN mini_pcs mp ON c.mini_pc_id = mp.id
LEFT JOIN users u ON c.user_id = u.id
WHERE u.email = 'yoavdra@gmail.com'
ORDER BY c.name;

-- Expected: ALL cameras should have mini_pc_id populated
-- If any camera has NULL mini_pc_id → PROBLEM!

-- === 4. CHECK FOR ORPHANED CAMERAS ===
SELECT 
  c.id,
  c.name,
  c.user_id,
  u.email
FROM cameras c
LEFT JOIN users u ON c.user_id = u.id
WHERE c.mini_pc_id IS NULL;

-- Expected: Should return 0 rows
-- If any rows returned → These cameras won't be monitored!

-- === 5. CHECK DATA FRESHNESS ===
SELECT 
  'Mini PC Health' as data_type,
  COUNT(*) as total_records,
  COUNT(CASE WHEN last_checked > NOW() - INTERVAL '10 minutes' THEN 1 END) as fresh_records,
  COUNT(CASE WHEN last_checked < NOW() - INTERVAL '10 minutes' THEN 1 END) as stale_records
FROM mini_pc_health mph
LEFT JOIN mini_pcs mp ON mph.mini_pc_id = mp.id
LEFT JOIN users u ON mp.user_id = u.id
WHERE u.email = 'yoavdra@gmail.com'

UNION ALL

SELECT 
  'Camera Health' as data_type,
  COUNT(*) as total_records,
  COUNT(CASE WHEN last_checked > NOW() - INTERVAL '10 minutes' THEN 1 END) as fresh_records,
  COUNT(CASE WHEN last_checked < NOW() - INTERVAL '10 minutes' THEN 1 END) as stale_records
FROM camera_health ch
LEFT JOIN cameras c ON ch.camera_id = c.id
LEFT JOIN users u ON c.user_id = u.id
WHERE u.email = 'yoavdra@gmail.com';

-- Expected:
-- All records should be fresh (< 10 minutes old)
-- If stale_records > 0 → Mini PC not reporting!

-- === 6. CHECK STREAM STATUS DISTRIBUTION ===
SELECT 
  ch.stream_status,
  COUNT(*) as camera_count,
  STRING_AGG(c.name, ', ') as camera_names
FROM camera_health ch
LEFT JOIN cameras c ON ch.camera_id = c.id
LEFT JOIN users u ON c.user_id = u.id
WHERE u.email = 'yoavdra@gmail.com'
GROUP BY ch.stream_status
ORDER BY ch.stream_status;

-- Expected for yoavdra@gmail.com:
-- "ok": 3 cameras (חניה, חצר, כניסה)
-- "missing": 1 camera (מרפסת)

-- === 7. CHECK ADMIN DIAGNOSTICS WOULD SHOW ===
-- This simulates what the admin panel calculates
SELECT 
  c.name as camera_name,
  ch.stream_status,
  ch.last_checked,
  CASE 
    WHEN ch.camera_id IS NULL THEN 'offline'
    WHEN EXTRACT(EPOCH FROM (NOW() - ch.last_checked)) / 60 > 60 THEN 'offline'
    WHEN EXTRACT(EPOCH FROM (NOW() - ch.last_checked)) / 60 > 15 THEN 'warning'
    WHEN LOWER(ch.stream_status) IN ('missing', 'stale', 'error') THEN 'error'
    WHEN LOWER(ch.stream_status) = 'warning' THEN 'warning'
    ELSE 'healthy'
  END as calculated_status
FROM cameras c
LEFT JOIN camera_health ch ON c.id = ch.camera_id
LEFT JOIN users u ON c.user_id = u.id
WHERE u.email = 'yoavdra@gmail.com'
ORDER BY c.name;

-- Expected:
-- מרפסת: calculated_status = "error" (because stream_status = "missing")
-- חניה: calculated_status = "healthy"
-- חצר: calculated_status = "healthy"
-- כניסה: calculated_status = "healthy"

-- === 8. CHECK SYSTEM ALERTS ===
SELECT 
  sa.type,
  sa.camera_name,
  sa.message,
  sa.severity,
  sa.resolved,
  sa.created_at,
  EXTRACT(EPOCH FROM (NOW() - sa.created_at)) / 60 as minutes_ago
FROM system_alerts sa
WHERE sa.camera_name IN ('מרפסת', 'חניה', 'חצר', 'כניסה')
ORDER BY sa.created_at DESC
LIMIT 10;

-- Expected: May see alerts for camera "מרפסת" with type "stream_error"

-- ================================================================
-- RESULTS INTERPRETATION:
-- ================================================================
-- ✅ HEALTHY SYSTEM:
--    - All cameras have mini_pc_id
--    - Health data < 10 minutes old
--    - Working cameras: stream_status = "ok"
--    - Broken cameras: stream_status = "missing/stale/error"
--    - Admin calculates correct status
--
-- ❌ PROBLEMS TO FIX:
--    - Cameras with NULL mini_pc_id → Run add-mini-pc-id-to-cameras.sql
--    - Health data > 10 minutes old → Mini PC not running status-check.sh
--    - All cameras show "missing" → FFmpeg processes not running
-- ================================================================
