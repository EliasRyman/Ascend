# 🚀 Quick Start: Run Database Migrations

## Step-by-Step Guide

### 1. Open Supabase Dashboard
1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" in the left menu

### 2. Run Migration 1: Date Tracking
1. Click "New query"
2. Open `migration_add_date_tracking.sql` in your code editor
3. Copy ALL the content
4. Paste into Supabase SQL Editor
5. Click "Run" (or press Ctrl/Cmd + Enter)
6. Wait for "Success. No rows returned" ✅

### 3. Run Migration 2: Recurring Tasks
1. Click "New query"
2. Open `migration_add_recurring_tasks.sql` in your code editor
3. Copy ALL the content
4. Paste into Supabase SQL Editor
5. Click "Run"
6. Wait for "Success. No rows returned" ✅

### 4. Run Migration 3: Convert Habits
1. Click "New query"
2. Open `migration_convert_habits_to_recurring.sql` in your code editor
3. Copy ALL the content
4. Paste into Supabase SQL Editor
5. Click "Run"
6. Wait for "Success" (may show "X rows affected") ✅

### 5. Verify Migrations
1. In Supabase, go to "Table Editor"
2. Select "tasks" table
3. Check that these columns exist:
   - ✅ `completed_at` (timestamptz)
   - ✅ `assigned_date` (date)
   - ✅ `is_recurring` (boolean)
   - ✅ `recurrence_pattern` (text)
   - ✅ `parent_task_id` (uuid)

### 6. Refresh Your App
1. Go back to your app (localhost:3000)
2. Press F5 to refresh
3. Check console - should see:
   ```
   🔄 Migrating overdue tasks (before today: 2025-12-17)
   ✅ No overdue tasks to migrate
   🔄 Generating recurring task instances for: 2025-12-17
   📋 Found X recurring task template(s)
   ✅ Created instance for "HABIT_NAME" on 2025-12-17
   ```

## What Each Migration Does

### Migration 1: Date Tracking
- Adds `completed_at` column - tracks WHEN task was completed
- Adds `assigned_date` column - tracks WHICH DATE task belongs to
- Sets existing active tasks to today's date

### Migration 2: Recurring Tasks
- Adds `is_recurring` column - marks recurring task templates
- Adds `recurrence_pattern` column - daily/weekly/monthly
- Adds `parent_task_id` column - links instances to templates

### Migration 3: Convert Habits
- Converts existing habits → recurring task templates
- Each habit becomes a template that generates daily instances
- Preserves habit completion history

## Troubleshooting

### Error: "column already exists"
✅ This is OK! It means the migration was already run. Skip to next migration.

### Error: "relation does not exist"
❌ You need to run migrations in order (1 → 2 → 3)

### Error: "permission denied"
❌ Make sure you're logged into the correct Supabase project

### No errors but app still shows errors
1. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. Clear browser cache
3. Check console for specific error messages

## After Migrations

Your app will now support:
- ✅ Habits appearing on every day (separate instances)
- ✅ Tasks only appearing on their creation date
- ✅ Overdue tasks moving to "Later" at midnight
- ✅ Completion syncing between list and timeline
- ✅ Date-specific habit completion

## Need Help?

If you see errors after running migrations, copy the error message and let me know!
