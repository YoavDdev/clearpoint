-- Add fire_smoke composite detection type
ALTER TABLE alert_rules DROP CONSTRAINT IF EXISTS alert_rules_detection_type_check;

ALTER TABLE alert_rules ADD CONSTRAINT alert_rules_detection_type_check
  CHECK (detection_type IN (
    'person', 'vehicle', 'animal', 'dog', 'cat',
    'suspicious_object', 'weapon',
    'fire', 'smoke', 'fire_smoke',
    'motion', 'any',
    'face_unknown', 'loitering', 'line_cross'
  ));

-- Clean up old separate fire/smoke presets (replaced by combined fire_smoke)
DELETE FROM alert_rules
WHERE is_preset = true
  AND preset_key = 'fire_smoke'
  AND detection_type IN ('fire', 'smoke');
