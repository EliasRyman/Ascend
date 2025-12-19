# Daily Reset & Overdue Task Migration - Implementation Guide

## Overview
This implementation fixes the task state logic to properly handle:
1. **Daily Reset**: Tasks show as unchecked when viewing different dates (visual reset)
2. **Midnight Rollover**: Incomplete tasks from past dates automatically move to "To-do Later"

## Database Changes

### Migration File: `migration_add_date_tracking.sql`
Adds two new columns to the `tasks` table:
- `completed_at` (TIMESTAMPTZ): Timestamp when task was marked complete
- `assigned_date` (DATE): The date this task is assigned to

**Run this SQL in your Supabase dashboard:**
```sql
-- See migration_add_date_tracking.sql
```

## Code Changes

### 1. Updated Interfaces

**supabase.ts** - Added fields to `DbTask`:
```typescript
completed_at: string | null;
assigned_date: string | null;
```

**database.ts** - Added fields to `Task`:
```typescript
completedAt: string | null;
assignedDate: string | null;
```

### 2. New Functions in database.ts

#### `migrateOverdueTasks(timezone)`
- Runs on app load
- Finds all active tasks with `assigned_date < today` and `completed = false`
- Moves them to "To-do Later" list
- Clears their `assigned_date` and `time`

#### `loadTasksForDate(date, listType)`
- Replaces `loadTasks()` for active tasks
- Filters tasks by `assigned_date = selectedDate`
- Ensures only tasks for that specific date are shown

#### `toggleTaskCompletion(taskId, currentlyCompleted)`
- Sets `completed_at` timestamp when marking complete
- Clears `completed_at` when uncompleting
- Used instead of generic `updateTask()` for completion

#### `createTaskForDate(title, date, listType)`
- Creates task with proper `assigned_date`
- Active tasks get the selected date
- Later tasks get `null` date

#### `moveTaskToList(taskId, newListType, targetDate)`
- Moves task between lists
- Updates `assigned_date` appropriately
- Clears time when moving to Later

## Integration Steps for App.tsx

### Step 1: Import New Functions
```typescript
import {
  // ... existing imports
  migrateOverdueTasks,
  loadTasksForDate,
  toggleTaskCompletion,
  createTaskForDate,
  moveTaskToList,
} from './database';
```

### Step 2: Run Migration on App Load
In the main `useEffect` that loads data:
```typescript
useEffect(() => {
  const loadData = async () => {
    if (!user) return;
    
    // Run overdue task migration first
    const migratedCount = await migrateOverdueTasks(settings.timezone);
    if (migratedCount > 0) {
      console.log(`✅ Migrated ${migratedCount} overdue tasks to backlog`);
    }
    
    // Then load tasks for the selected date
    const [activeData, laterData, ...] = await Promise.all([
      loadTasksForDate(selectedDate, 'active'), // Changed!
      loadTasks('later'), // Later tasks don't filter by date
      // ... rest
    ]);
    
    // ... rest of loading logic
  };
  
  loadData();
}, [user, selectedDate]); // Add selectedDate to dependencies
```

### Step 3: Update Task Completion Handler
```typescript
const handleToggleComplete = async (taskId: number | string, listType: 'active' | 'later') => {
  const currentTask = listType === 'active' 
    ? activeTasks.find(t => String(t.id) === String(taskId)) 
    : laterTasks.find(t => String(t.id) === String(taskId));
  
  if (!currentTask) return;
  
  const newCompleted = !currentTask.completed;
  
  // Update local state
  if (listType === 'active') {
    setActiveTasks(prev => prev.map(t => 
      String(t.id) === String(taskId) 
        ? { ...t, completed: newCompleted, completedAt: newCompleted ? new Date().toISOString() : null } 
        : t
    ));
  } else {
    setLaterTasks(prev => prev.map(t => 
      String(t.id) === String(taskId) 
        ? { ...t, completed: newCompleted, completedAt: newCompleted ? new Date().toISOString() : null } 
        : t
    ));
  }
  
  // Update schedule blocks
  setSchedule(prev => prev.map(block => 
    String(block.taskId) === String(taskId) 
      ? { ...block, completed: newCompleted } 
      : block
  ));
  
  // Save to database with timestamp
  await toggleTaskCompletion(String(taskId), currentTask.completed);
  
  // Update associated schedule blocks
  const associatedBlocks = schedule.filter(b => String(b.taskId) === String(taskId));
  for (const block of associatedBlocks) {
    await updateScheduleBlock(String(block.id), { completed: newCompleted });
  }
};
```

### Step 4: Update Task Creation
```typescript
const handleAddTask = async (title: string) => {
  if (!title.trim()) return;
  
  const newTask = await createTaskForDate(
    title.trim(), 
    selectedDate, // Use currently selected date
    'active'
  );
  
  if (newTask) {
    setActiveTasks(prev => [...prev, newTask]);
  }
};
```

### Step 5: Update Task Moving Between Lists
```typescript
const handleMoveTaskToList = async (taskId: number | string, targetList: 'active' | 'later') => {
  // ... existing local state updates
  
  // Use new function with date awareness
  await moveTaskToList(
    String(taskId), 
    targetList,
    targetList === 'active' ? selectedDate : undefined
  );
};
```

### Step 6: Update Task State Interface
Update the Task interface in App.tsx to include the new fields:
```typescript
interface Task {
  id: number | string;
  title: string;
  tag: string | null;
  tagColor: string | null;
  time: string | null;
  completed: boolean;
  completedAt?: string | null; // Add this
  assignedDate?: string | null; // Add this
}
```

## Visual Reset Logic

The key insight: Tasks are now **date-scoped**. When you navigate to a different date:
1. `loadTasksForDate(newDate, 'active')` only loads tasks assigned to that date
2. Each task's completion is tied to when it was completed (`completed_at`)
3. If you complete a task on Dec 17, it won't show as complete on Dec 18 because Dec 18 will load a different set of tasks (or the same task but uncompleted if it's recurring)

## Recurring Tasks (Future Enhancement)

For daily recurring tasks like "GYMMA" or "10K Steps":
1. Create a `recurring` boolean field on tasks
2. On app load, check if today's instance exists
3. If not, create a new instance with `assigned_date = today`
4. Each day gets its own instance, so completion is per-day

## Testing Checklist

- [ ] Run migration SQL in Supabase
- [ ] Verify new columns exist in tasks table
- [ ] Create a task for today - should appear in active list
- [ ] Complete the task - should show as checked
- [ ] Navigate to tomorrow - task should NOT appear (or appear unchecked if recurring)
- [ ] Navigate back to today - task should still be checked
- [ ] Create a task for yesterday, don't complete it
- [ ] Reload app - task should move to "To-do Later"
- [ ] Drag task from Later to Active - should assign to current date

## Rollback Plan

If issues occur:
1. The migration is non-destructive (only adds columns)
2. Old code will ignore new fields
3. To rollback: `ALTER TABLE tasks DROP COLUMN completed_at, DROP COLUMN assigned_date;`
