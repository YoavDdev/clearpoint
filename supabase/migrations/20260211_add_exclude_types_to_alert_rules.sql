-- Add exclude_types column to alert_rules table
-- Used for "any" detection type rules to exclude specific detection types
-- e.g., exclude_types = ['cat'] means "alert on everything except cats"
ALTER TABLE alert_rules
ADD COLUMN IF NOT EXISTS exclude_types text[] DEFAULT '{}';
