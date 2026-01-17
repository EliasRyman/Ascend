-- Migration: Add date tracking fields to tasks table
-- This enables daily reset and overdue task migration

-- Add new columns to tasks table
ALTER TABLE tasks 
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assigned_date DATE;

-- Set assigned_date to today for existing active tasks
UPDATE tasks 
SET assigned_date = CURRENT_DATE 
WHERE list_type = 'active' AND assigned_date IS NULL;

-- Create index for efficient querying of overdue tasks
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_date ON tasks(user_id, assigned_date, list_type);
CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON tasks(user_id, completed_at);

-- Add comment for documentation
COMMENT ON COLUMN tasks.completed_at IS 'Timestamp when task was marked as completed (null if not completed)';
COMMENT ON COLUMN tasks.assigned_date IS 'Date this task is assigned to (null for later/backlog tasks)';
