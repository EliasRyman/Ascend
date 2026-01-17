-- Add completed column to schedule_blocks table
ALTER TABLE schedule_blocks 
ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT false;

-- Update existing rows to have default value
UPDATE schedule_blocks 
SET completed = false 
WHERE completed IS NULL;
