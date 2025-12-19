-- Migration: Add recurring task support
-- This enables tasks to automatically appear every day as fresh instances

-- Add recurring field to tasks table
ALTER TABLE tasks 
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS recurrence_pattern TEXT DEFAULT 'daily' CHECK (recurrence_pattern IN ('daily', 'weekly', 'monthly')),
  ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE;

-- Create index for efficient querying of recurring tasks
CREATE INDEX IF NOT EXISTS idx_tasks_recurring ON tasks(user_id, is_recurring, recurrence_pattern) WHERE is_recurring = TRUE;
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN tasks.is_recurring IS 'Whether this task recurs (true for template tasks)';
COMMENT ON COLUMN tasks.recurrence_pattern IS 'How often the task recurs: daily, weekly, or monthly';
COMMENT ON COLUMN tasks.parent_task_id IS 'Reference to the parent recurring task (null for templates, set for instances)';

-- Note: Template tasks (is_recurring = true, parent_task_id = null) are the "master" recurring tasks
-- Instance tasks (is_recurring = false, parent_task_id = <id>) are the daily copies
