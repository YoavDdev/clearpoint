-- Create system_settings table to store configuration
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  setting_type VARCHAR(50) NOT NULL, -- 'string', 'number', 'boolean', 'json'
  category VARCHAR(50) NOT NULL, -- 'email', 'monitoring', 'alerts', 'system'
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by VARCHAR(255)
);

-- Create index on setting_key for fast lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON public.system_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON public.system_settings(category);

-- Insert default settings (LOW RESOURCE MODE)
INSERT INTO public.system_settings (setting_key, setting_value, setting_type, category, description) VALUES
  -- Email Settings
  ('email_notifications_enabled', 'true', 'boolean', 'email', 'Enable/disable email notifications'),
  ('alert_email_address', 'yoavddev@gmail.com', 'string', 'email', 'Email address to receive system alerts'),
  ('email_delay_minutes', '5', 'number', 'email', 'Delay before sending alert emails (minutes)'),
  
  -- Monitoring Settings (LOW RESOURCE)
  ('monitoring_interval_minutes', '10', 'number', 'monitoring', 'How often to check system health (minutes)'),
  ('health_check_timeout_seconds', '180', 'number', 'monitoring', 'Max time without health check before marking as issue (seconds)'),
  ('stream_check_timeout_seconds', '240', 'number', 'monitoring', 'Max time for stale stream before alert (seconds)'),
  
  -- Alert Settings (LOW RESOURCE)
  ('critical_alert_threshold_minutes', '10', 'number', 'alerts', 'Time before marking alert as critical (minutes)'),
  ('auto_resolve_alerts', 'true', 'boolean', 'alerts', 'Automatically resolve alerts when issue is fixed'),
  ('alert_retention_days', '14', 'number', 'alerts', 'How long to keep resolved alerts (days)'),
  
  -- System Settings (LOW RESOURCE)
  ('log_level', 'warn', 'string', 'system', 'System log level (debug, info, warn, error)'),
  ('data_retention_days', '30', 'number', 'system', 'How long to keep system data (days)'),
  ('backup_enabled', 'true', 'boolean', 'system', 'Enable automatic daily backups')
ON CONFLICT (setting_key) DO NOTHING;

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access (admin only)
CREATE POLICY "Service role can manage settings" ON public.system_settings
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE public.system_settings IS 'System-wide configuration settings';
