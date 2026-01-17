# Recurring Tasks Implementation Guide

## ✅ What Was Implemented

### 1. Database Schema
**File**: `migration_add_recurring_tasks.sql`

Added three new columns to the `tasks` table:
- `is_recurring` (BOOLEAN): Marks if this is a recurring task template
- `recurrence_pattern` (TEXT): How often it recurs ('daily', 'weekly', 'monthly')
- `parent_task_id` (UUID): Links instances to their parent template

**Run this SQL in Supabase**:
```bash
# Navigate to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql
# Copy and paste the contents of migration_add_recurring_tasks.sql
# Click "Run"
```

### 2. Template/Instance Pattern

**How It Works**:

#### Recurring Task Template
- `is_recurring = true`
- `parent_task_id = null`
- `assigned_date = null`
- `list_type = 'later'` (but filtered out from UI)
- This is the "master" task that generates instances

#### Daily Instance
- `is_recurring = false`
- `parent_task_id = <template_id>`
- `assigned_date = '2025-12-17'` (specific date)
- `list_type = 'active'`
- This is what you see and check off each day

### 3. New Functions

**File**: `database.ts`

#### `createRecurringTask(title, pattern, tag, tagColor, time)`
Creates a new recurring task template.

**Example**:
```typescript
await createRecurringTask('GYMMA', 'daily', 'fitness', '#FF5733', '06:00');
```

#### `generateRecurringInstances(date, timezone)`
Generates daily instances for all templates.
- Runs automatically on app load
- Checks if instance already exists for the date
- Creates new instance if needed
- Returns count of instances created

#### `loadTasksForDateWithRecurring(date, listType)`
Loads tasks for a specific date, excluding templates.
- Templates are filtered out (they're just blueprints)
- Only shows actual task instances

#### `getRecurringTemplates()`
Gets all recurring task templates for management UI.

#### `deleteRecurringTemplate(templateId, deleteInstances)`
Deletes a template and optionally all its instances.
- `deleteInstances = true`: Deletes all past/future instances
- `deleteInstances = false`: Unlinks instances (they become regular tasks)

### 4. App.tsx Integration

**Data Loading** (Line ~1191):
```typescript
// 1. Migrate overdue tasks
const migratedCount = await migrateOverdueTasks(settings.timezone);

// 2. Generate recurring instances for today
const generatedCount = await generateRecurringInstances(selectedDate, settings.timezone);

// 3. Load tasks (templates are excluded)
const [activeData, laterData, ...] = await Promise.all([
  loadTasksForDateWithRecurring(selectedDate, 'active'),
  loadTasks('later'),
  // ...
]);
```

## 🎯 How It Works

### Example: "GYMMA" Daily Task

#### Step 1: Create Template (One Time)
```typescript
await createRecurringTask('GYMMA', 'daily', 'fitness', '#FF5733');
```

**Database**:
```
id: 'abc-123'
title: 'GYMMA'
is_recurring: true
parent_task_id: null
assigned_date: null
list_type: 'later'
```

#### Step 2: App Loads on Dec 17
```typescript
generateRecurringInstances(new Date('2025-12-17'))
```

**Creates Instance**:
```
id: 'xyz-789'
title: 'GYMMA'
is_recurring: false
parent_task_id: 'abc-123'
assigned_date: '2025-12-17'
list_type: 'active'
completed: false
```

**UI Shows**: ☐ GYMMA (unchecked)

#### Step 3: Complete Task
User checks it off → `completed = true`, `completed_at = '2025-12-17T10:30:00Z'`

**UI Shows**: ✅ GYMMA (checked)

#### Step 4: Navigate to Dec 18
```typescript
loadTasksForDateWithRecurring(new Date('2025-12-18'), 'active')
```

**Loads**: Tasks with `assigned_date = '2025-12-18'`
**Result**: "GYMMA" from Dec 17 doesn't appear (different instance)

#### Step 5: App Loads on Dec 18
```typescript
generateRecurringInstances(new Date('2025-12-18'))
```

**Creates New Instance**:
```
id: 'def-456'
title: 'GYMMA'
is_recurring: false
parent_task_id: 'abc-123'
assigned_date: '2025-12-18'
list_type: 'active'
completed: false
```

**UI Shows**: ☐ GYMMA (fresh, unchecked)

#### Step 6: Navigate Back to Dec 17
**Loads**: Instance 'xyz-789' with `assigned_date = '2025-12-17'`
**UI Shows**: ✅ GYMMA (still checked from before)

## 🔧 How to Use

### Create a Recurring Task

**Option 1: Programmatically**
```typescript
import { createRecurringTask } from './database';

// Daily task
await createRecurringTask('Morning Workout', 'daily');

// With tag and time
await createRecurringTask('10K Steps', 'daily', 'health', '#4CAF50', '18:00');
```

**Option 2: Via UI (Future Enhancement)**
Add a "Make Recurring" checkbox to the task creation form:
```typescript
const [isRecurring, setIsRecurring] = useState(false);

// In form submit:
if (isRecurring) {
  await createRecurringTask(title, 'daily', tag, tagColor, time);
} else {
  await createTaskForDate(title, selectedDate, 'active');
}
```

### Manage Recurring Tasks

**List All Templates**:
```typescript
const templates = await getRecurringTemplates();
console.log('Recurring tasks:', templates);
```

**Delete a Template**:
```typescript
// Delete template and all instances
await deleteRecurringTemplate(templateId, true);

// Delete template but keep instances as regular tasks
await deleteRecurringTemplate(templateId, false);
```

## 📊 Database Structure

### Example Data

**Templates Table** (is_recurring = true):
```
| id      | title      | is_recurring | parent_task_id | assigned_date | list_type |
|---------|------------|--------------|----------------|---------------|-----------|
| abc-123 | GYMMA      | true         | null           | null          | later     |
| def-456 | 10K Steps  | true         | null           | null          | later     |
```

**Instances Table** (is_recurring = false):
```
| id      | title      | is_recurring | parent_task_id | assigned_date | completed |
|---------|------------|--------------|----------------|---------------|-----------|
| xyz-789 | GYMMA      | false        | abc-123        | 2025-12-17    | true      |
| ghi-012 | GYMMA      | false        | abc-123        | 2025-12-18    | false     |
| jkl-345 | 10K Steps  | false        | def-456        | 2025-12-17    | false     |
| mno-678 | 10K Steps  | false        | def-456        | 2025-12-18    | false     |
```

## 🎨 UI Enhancements (Future)

### 1. Recurring Task Indicator
Show a 🔄 icon next to recurring task instances:
```typescript
{task.parentTaskId && (
  <span className="text-xs text-purple-500" title="Recurring task">
    🔄
  </span>
)}
```

### 2. Recurring Task Management Panel
Add a settings section to manage templates:
```typescript
const RecurringTasksPanel = () => {
  const [templates, setTemplates] = useState<Task[]>([]);
  
  useEffect(() => {
    loadTemplates();
  }, []);
  
  const loadTemplates = async () => {
    const data = await getRecurringTemplates();
    setTemplates(data);
  };
  
  return (
    <div>
      <h3>Recurring Tasks</h3>
      {templates.map(template => (
        <div key={template.id}>
          <span>{template.title}</span>
          <span>{template.recurrencePattern}</span>
          <button onClick={() => deleteRecurringTemplate(template.id, true)}>
            Delete
          </button>
        </div>
      ))}
    </div>
  );
};
```

### 3. "Make Recurring" Toggle in Task Form
```typescript
<label>
  <input 
    type="checkbox" 
    checked={isRecurring}
    onChange={(e) => setIsRecurring(e.target.checked)}
  />
  Make this a recurring task
</label>

{isRecurring && (
  <select value={pattern} onChange={(e) => setPattern(e.target.value)}>
    <option value="daily">Daily</option>
    <option value="weekly">Weekly</option>
    <option value="monthly">Monthly</option>
  </select>
)}
```

## 🧪 Testing

### Test Scenario 1: Create and Complete
1. Run migration SQL
2. Create recurring task: `await createRecurringTask('Test Task', 'daily')`
3. Reload app → Should see "Test Task" in active list
4. Complete it → Should show as checked
5. Navigate to tomorrow → Should see fresh "Test Task" (unchecked)
6. Navigate back to today → Should see "Test Task" (checked)

### Test Scenario 2: Multiple Days
1. Create recurring task on Dec 17
2. Complete it on Dec 17
3. Load app on Dec 18 → New instance created automatically
4. Complete it on Dec 18
5. Load app on Dec 19 → New instance created automatically
6. Navigate back to Dec 17 → Still shows as completed
7. Navigate to Dec 18 → Still shows as completed

### Test Scenario 3: Delete Template
1. Create recurring task
2. Complete instances on 3 different days
3. Delete template with `deleteInstances = false`
4. Instances should remain as regular tasks
5. No new instances created tomorrow

## 🐛 Troubleshooting

### Instances Not Appearing
- Check console for: `"🎉 Generated X recurring task instance(s)"`
- Verify template exists: `await getRecurringTemplates()`
- Check `is_recurring = true` and `parent_task_id = null` in database

### Duplicate Instances
- `generateRecurringInstances` checks for existing instances
- If duplicates appear, check the query logic in the function

### Templates Showing in UI
- Ensure `loadTasksForDateWithRecurring` is being used
- Check the filter: `.or('is_recurring.eq.false,is_recurring.is.null')`

## 📚 Benefits

1. **Daily Fresh Start**: Tasks appear unchecked every day
2. **Completion History**: Each day's completion is tracked separately
3. **Flexible**: Can skip days without affecting future instances
4. **Scalable**: Ready for weekly/monthly patterns
5. **Clean**: Templates are hidden from UI, only instances show

## 🚀 Next Steps

1. **Run the migration**: `migration_add_recurring_tasks.sql`
2. **Test basic flow**: Create a recurring task and verify it appears daily
3. **Add UI controls**: Add "Make Recurring" checkbox to task form
4. **Add management panel**: Create UI to view/edit/delete templates
5. **Add weekly/monthly support**: Implement logic for non-daily patterns

---

**Your recurring tasks are now ready!** 🎉

Tasks like "GYMMA" and "10K Steps" will automatically appear fresh every day, ready to be checked off!
