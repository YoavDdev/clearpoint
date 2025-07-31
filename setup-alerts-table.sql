-- Create system_alerts table for the diagnostics system
CREATE TABLE IF NOT EXISTS system_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('camera_offline', 'disk_full', 'stream_error', 'device_error')),
  camera_id UUID REFERENCES cameras(id) ON DELETE CASCADE,
  camera_name TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE,
  notification_sent BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_system_alerts_camera_id ON system_alerts(camera_id);
CREATE INDEX IF NOT EXISTS idx_system_alerts_resolved ON system_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON system_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_system_alerts_created_at ON system_alerts(created_at);

-- Enable RLS
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access
DROP POLICY IF EXISTS "Admin can manage all alerts" ON system_alerts;
CREATE POLICY "Admin can manage all alerts" ON system_alerts FOR ALL USING (true);

-- Insert some sample alerts for testing
INSERT INTO system_alerts (type, camera_id, camera_name, customer_name, message, severity) 
SELECT 
  'camera_offline',
  c.id,
  c.name,
  COALESCE(u.full_name, 'לא ידוע'),
  'מצלמה ' || c.name || ' לא מגיבה',
  'high'
FROM cameras c
LEFT JOIN users u ON c.user_id = u.id
WHERE c.is_stream_active = false
LIMIT 2;
