-- Migration: Convert Habits to Recurring Tasks
-- This migration converts existing habits to recurring task templates
-- Each habit becomes a recurring task that generates daily instances

-- Step 1: Convert existing habits to recurring task templates
INSERT INTO tasks (
  user_id,
  title,
  tag,
  tag_color,
  is_recurring,
  recurrence_pattern,
  parent_task_id,
  list_type,
  completed,
  assigned_date,
  time,
  created_at,
  updated_at
)
SELECT 
  user_id,
  name as title,
  tag,
  tag_color,
  TRUE as is_recurring,
  'daily' as recurrence_pattern,
  NULL as parent_task_id,
  'later' as list_type, -- Templates live in "later" but are filtered out from UI
  FALSE as completed,
  NULL as assigned_date, -- Templates have no assigned date
  NULL as time,
  created_at,
  NOW() as updated_at
FROM habits
WHERE NOT EXISTS (
  SELECT 1 FROM tasks 
  WHERE tasks.title = habits.name 
  AND tasks.user_id = habits.user_id 
  AND tasks.is_recurring = TRUE
  AND tasks.parent_task_id IS NULL
);

-- Step 2: Create index for efficient habit completion tracking
CREATE INDEX IF NOT EXISTS idx_habit_completions_date 
  ON habit_completions(habit_id, completion_date);

-- Step 3: Add comment for documentation
COMMENT ON INDEX idx_habit_completions_date IS 'Index for efficient lookup of habit completions by date';

-- Note: We keep the habits table and habit_completions table for now
-- The habits table serves as the source of truth for habit metadata
-- The habit_completions table tracks which days a habit was completed
-- Daily task instances are generated from the recurring task templates
