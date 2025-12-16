-- Change task_id to TEXT to support all ID formats
-- Run this in your Supabase SQL Editor

ALTER TABLE schedule_blocks 
ALTER COLUMN task_id TYPE TEXT;
