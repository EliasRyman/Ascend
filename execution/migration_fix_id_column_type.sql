-- Change id column type from UUID to TEXT to support all ID formats
ALTER TABLE schedule_blocks 
ALTER COLUMN id TYPE TEXT;
