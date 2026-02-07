-- System logs table for centralized event tracking
CREATE TABLE IF NOT EXISTS system_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  -- Context
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  mini_pc_id UUID REFERENCES mini_pcs(id) ON DELETE SET NULL,
  camera_id UUID REFERENCES cameras(id) ON DELETE SET NULL,
  
  -- Event data
  category TEXT NOT NULL CHECK (category IN ('camera', 'vod', 'minipc', 'alert', 'system')),
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  event TEXT NOT NULL,          -- short event key: 'upload_success', 'stream_down', etc.
  message TEXT NOT NULL,        -- human-readable Hebrew message
  metadata JSONB DEFAULT '{}'::jsonb  -- extra data (file count, duration, etc.)
);

-- Indexes for fast queries
CREATE INDEX idx_system_logs_created_at ON system_logs (created_at DESC);
CREATE INDEX idx_system_logs_user_id ON system_logs (user_id);
CREATE INDEX idx_system_logs_category ON system_logs (category);
CREATE INDEX idx_system_logs_severity ON system_logs (severity);
CREATE INDEX idx_system_logs_mini_pc_id ON system_logs (mini_pc_id);

-- RLS
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert system_logs"
  ON system_logs FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Service role can read system_logs"
  ON system_logs FOR SELECT TO service_role USING (true);

CREATE POLICY "Service role can delete system_logs"
  ON system_logs FOR DELETE TO service_role USING (true);

-- Auto-cleanup: delete logs older than 90 days (optional cron)
-- DELETE FROM system_logs WHERE created_at < now() - interval '90 days';
