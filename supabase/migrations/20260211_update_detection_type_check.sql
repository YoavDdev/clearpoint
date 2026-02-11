-- Update detection_type CHECK constraint to include new categories
-- New types: dog, cat, suspicious_object, weapon
ALTER TABLE alert_rules DROP CONSTRAINT IF EXISTS alert_rules_detection_type_check;

ALTER TABLE alert_rules ADD CONSTRAINT alert_rules_detection_type_check
  CHECK (detection_type IN (
    'person', 'vehicle', 'animal', 'dog', 'cat',
    'suspicious_object', 'weapon',
    'motion', 'any', 'fire', 'smoke',
    'face_unknown', 'loitering', 'line_cross'
  ));
