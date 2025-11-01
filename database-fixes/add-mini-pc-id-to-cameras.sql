-- ================================================================
-- CRITICAL FIX: Add mini_pc_id to cameras table
-- ================================================================
-- This fixes the sync issue where status-check.sh can't find cameras
-- Run this in Supabase SQL Editor
-- ================================================================

-- Step 1: Add the mini_pc_id column to cameras table
ALTER TABLE cameras 
ADD COLUMN IF NOT EXISTS mini_pc_id UUID REFERENCES mini_pcs(id) ON DELETE SET NULL;

-- Step 2: Create index for performance
CREATE INDEX IF NOT EXISTS idx_cameras_mini_pc_id ON cameras(mini_pc_id);

-- Step 3: Link existing cameras to their user's Mini PC
-- This assumes 1 user = 1 Mini PC (which is your current setup)
UPDATE cameras c
SET mini_pc_id = mp.id
FROM mini_pcs mp
WHERE c.user_id = mp.user_id
AND c.mini_pc_id IS NULL;

-- Step 4: Verify the changes
SELECT 
  c.id,
  c.name,
  c.user_id,
  c.mini_pc_id,
  mp.hostname as mini_pc_hostname,
  u.email as user_email
FROM cameras c
LEFT JOIN mini_pcs mp ON c.mini_pc_id = mp.id
LEFT JOIN users u ON c.user_id = u.id
ORDER BY u.email, c.name;

-- Expected result: All cameras should now have a mini_pc_id value
-- If any have NULL mini_pc_id, they need manual fixing
