-- Add task_id and habit_id columns to schedule_blocks table
-- Run this in your Supabase SQL Editor

ALTER TABLE schedule_blocks 
ADD COLUMN IF NOT EXISTS task_id UUID,
ADD COLUMN IF NOT EXISTS habit_id TEXT;

-- Create an index for faster lookups (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_schedule_blocks_task_id ON schedule_blocks(task_id);
