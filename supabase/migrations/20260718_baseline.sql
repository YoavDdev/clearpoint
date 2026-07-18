-- Baseline migration: documents schema changes made on 2026-07-18
-- These were applied manually via Supabase Dashboard.
-- This file exists for documentation and future reference only.

-- 1. Soft delete support
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- 2. Audit log table
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_email text NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  details jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- 3. Performance indexes
CREATE INDEX IF NOT EXISTS idx_alerts_user_ack_created 
  ON alerts(user_id, acknowledged, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vod_files_user_camera_time 
  ON vod_files(user_id, camera_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_system_logs_minipc_created 
  ON system_logs(mini_pc_id, created_at DESC);

-- 4. Dropped dead tables
-- DROP TABLE IF EXISTS device_health;
-- DROP TABLE IF EXISTS invoice_number_counters;

-- 5. Dropped dead functions
-- DROP FUNCTION IF EXISTS find_expiring_trials();
-- DROP FUNCTION IF EXISTS get_subscription_status(uuid);
-- DROP FUNCTION IF EXISTS find_subscriptions_to_cancel();
-- DROP FUNCTION IF EXISTS find_paused_to_resume();
