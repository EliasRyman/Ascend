import { supabase } from './supabase';

/**
 * Auto-run minimal database migration
 * Adds assigned_date column if it doesn't exist
 */
export async function runMinimalMigration(): Promise<boolean> {
    try {
        console.log('🔧 Checking if migration is needed...');

        // Try to add the column - if it exists, this will be a no-op
        const { error: alterError } = await supabase.rpc('exec_sql', {
            sql: `
        DO $$ 
        BEGIN
          -- Add assigned_date column if it doesn't exist
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'tasks' AND column_name = 'assigned_date'
          ) THEN
            ALTER TABLE tasks ADD COLUMN assigned_date DATE;
            
            -- Set existing active tasks to today
            UPDATE tasks 
            SET assigned_date = CURRENT_DATE 
            WHERE list_type = 'active' AND assigned_date IS NULL;
            
            -- Create index
            CREATE INDEX IF NOT EXISTS idx_tasks_assigned_date ON tasks(user_id, assigned_date);
            
            RAISE NOTICE 'Migration completed successfully';
          ELSE
            RAISE NOTICE 'Column already exists, skipping migration';
          END IF;
        END $$;
      `
        });

        if (alterError) {
            console.warn('⚠️ Could not run auto-migration:', alterError.message);
            console.log('📝 Please run MINIMAL_MIGRATION.sql manually in Supabase');
            return false;
        }

        console.log('✅ Migration check complete');
        return true;
    } catch (error) {
        console.error('❌ Migration error:', error);
        return false;
    }
}
