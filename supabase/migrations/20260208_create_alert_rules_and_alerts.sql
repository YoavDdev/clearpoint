-- =============================================
-- Alert Rules: חוקי התראה שהלקוח מגדיר
-- =============================================
CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Owner
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  camera_id UUID REFERENCES cameras(id) ON DELETE CASCADE,  -- null = all cameras

  -- Rule definition
  name TEXT NOT NULL,                    -- "שומר לילה", "חדירה" etc.
  detection_type TEXT NOT NULL CHECK (detection_type IN (
    'person', 'vehicle', 'animal', 'motion', 'any',
    'fire', 'smoke', 'face_unknown', 'loitering', 'line_cross'
  )),

  -- Schedule (null = 24/7)
  schedule_start TIME,                   -- e.g. '22:00'
  schedule_end TIME,                     -- e.g. '06:00'
  days_of_week INT[] DEFAULT '{0,1,2,3,4,5,6}',  -- 0=Sunday .. 6=Saturday

  -- Notification preferences
  notify_email BOOLEAN DEFAULT true,
  notify_sms BOOLEAN DEFAULT false,
  notify_push BOOLEAN DEFAULT true,

  -- Behavior
  cooldown_minutes INT DEFAULT 5,        -- min time between alerts for same rule
  min_confidence REAL DEFAULT 0.5,       -- minimum AI confidence to trigger (0-1)
  is_active BOOLEAN DEFAULT true,
  is_preset BOOLEAN DEFAULT false,       -- true = system-created default rule
  preset_key TEXT                         -- 'night_guard', 'intrusion', 'vehicle' etc.
);

-- Indexes
CREATE INDEX idx_alert_rules_user_id ON alert_rules (user_id);
CREATE INDEX idx_alert_rules_camera_id ON alert_rules (camera_id);
CREATE INDEX idx_alert_rules_active ON alert_rules (is_active) WHERE is_active = true;

-- RLS
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own alert_rules"
  ON alert_rules FOR SELECT USING (
    auth.uid() = user_id OR
    current_setting('role', true) = 'service_role'
  );

CREATE POLICY "Users can insert own alert_rules"
  ON alert_rules FOR INSERT WITH CHECK (
    auth.uid() = user_id OR
    current_setting('role', true) = 'service_role'
  );

CREATE POLICY "Users can update own alert_rules"
  ON alert_rules FOR UPDATE USING (
    auth.uid() = user_id OR
    current_setting('role', true) = 'service_role'
  );

CREATE POLICY "Users can delete own alert_rules"
  ON alert_rules FOR DELETE USING (
    auth.uid() = user_id OR
    current_setting('role', true) = 'service_role'
  );

CREATE POLICY "Service role full access alert_rules"
  ON alert_rules FOR ALL TO service_role USING (true) WITH CHECK (true);


-- =============================================
-- Alerts: התראות שנוצרו מזיהוי
-- =============================================
CREATE TABLE IF NOT EXISTS alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Context
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  camera_id UUID NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES alert_rules(id) ON DELETE SET NULL,
  mini_pc_id UUID REFERENCES mini_pcs(id) ON DELETE SET NULL,

  -- Detection data
  detection_type TEXT NOT NULL,           -- 'person', 'vehicle', 'animal', 'motion' etc.
  confidence REAL,                        -- 0.0 - 1.0
  snapshot_url TEXT,                      -- B2 URL of the snapshot image
  thumbnail_url TEXT,                     -- smaller thumbnail for list views

  -- Metadata
  message TEXT,                           -- "זוהה אדם בחצר"
  metadata JSONB DEFAULT '{}'::jsonb,     -- bounding boxes, extra info
  
  -- User interaction
  acknowledged BOOLEAN DEFAULT false,     -- user has seen this alert
  acknowledged_at TIMESTAMPTZ,

  -- Notification tracking
  notified_email BOOLEAN DEFAULT false,
  notified_sms BOOLEAN DEFAULT false,
  notified_push BOOLEAN DEFAULT false
);

-- Indexes
CREATE INDEX idx_alerts_user_id ON alerts (user_id);
CREATE INDEX idx_alerts_camera_id ON alerts (camera_id);
CREATE INDEX idx_alerts_rule_id ON alerts (rule_id);
CREATE INDEX idx_alerts_created_at ON alerts (created_at DESC);
CREATE INDEX idx_alerts_unacknowledged ON alerts (user_id, acknowledged) WHERE acknowledged = false;
CREATE INDEX idx_alerts_detection_type ON alerts (detection_type);

-- RLS
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own alerts"
  ON alerts FOR SELECT USING (
    auth.uid() = user_id OR
    current_setting('role', true) = 'service_role'
  );

CREATE POLICY "Users can update own alerts"
  ON alerts FOR UPDATE USING (
    auth.uid() = user_id OR
    current_setting('role', true) = 'service_role'
  );

CREATE POLICY "Service role full access alerts"
  ON alerts FOR ALL TO service_role USING (true) WITH CHECK (true);
