-- MINIMAL Migration: Add ONLY assigned_date column
-- This is the absolute minimum needed for date scoping to work

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_date DATE;

-- Set existing active tasks to today
UPDATE tasks 
SET assigned_date = CURRENT_DATE 
WHERE list_type = 'active' AND assigned_date IS NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_date ON tasks(user_id, assigned_date);
