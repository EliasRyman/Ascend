-- Remove duplicate schedule_blocks, keeping only the newest one for each (start, title, date) combination
DELETE FROM schedule_blocks
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY start_hour, title, date, user_id 
             ORDER BY created_at DESC NULLS LAST, id DESC
           ) as rn
    FROM schedule_blocks
  ) t
  WHERE rn > 1
);
