-- Add truck and bus as separate detection types
-- Truck detection needed for municipality client (Yehud-Monosson)
ALTER TABLE alert_rules DROP CONSTRAINT IF EXISTS alert_rules_detection_type_check;

ALTER TABLE alert_rules ADD CONSTRAINT alert_rules_detection_type_check
  CHECK (detection_type IN (
    'person', 'vehicle', 'truck', 'bus',
    'animal', 'dog', 'cat',
    'suspicious_object', 'weapon',
    'fire', 'smoke', 'fire_smoke',
    'motion', 'any',
    'face_unknown', 'loitering', 'line_cross'
  ));
