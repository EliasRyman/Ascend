import { supabase, DbTask, DbScheduleBlock, DbUserSettings } from './supabase';

// Task types matching the app
export interface Task {
  id: string;
  title: string;
  tag: string | null;
  tagColor: string | null;
  time: string | null;
  completed: boolean;
  completedAt: string | null; // ISO timestamp when completed
  assignedDate: string | null; // YYYY-MM-DD format
  isRecurring?: boolean; // Whether this is a recurring task template
  recurrencePattern?: 'daily' | 'weekly' | 'monthly'; // How often it recurs
  parentTaskId?: string | null; // Reference to parent recurring task
  listType?: 'active' | 'later';
}

export interface ScheduleBlock {
  id: string;
  title: string;
  tag: string | null;
  start: number;
  duration: number;
  color: string;
  textColor: string;
  isGoogle?: boolean;
  googleEventId?: string;
  completed?: boolean;
  taskId?: string;
  habitId?: string;
}

export interface UserSettings {
  timeFormat: '12h' | '24h';
  timezone: string;
  googleConnected: boolean;
}

// Convert database task to app task
function dbTaskToTask(dbTask: DbTask): Task {
  return {
    id: dbTask.id,
    title: dbTask.title,
    tag: dbTask.tag,
    tagColor: dbTask.tag_color,
    time: dbTask.time,
    completed: dbTask.completed,
    completedAt: dbTask.completed_at,
    assignedDate: dbTask.assigned_date,
    isRecurring: dbTask.is_recurring,
    recurrencePattern: dbTask.recurrence_pattern,
    parentTaskId: dbTask.parent_task_id,
    listType: dbTask.list_type as 'active' | 'later',
  };
}

// Convert database schedule block to app schedule block
function dbBlockToBlock(dbBlock: DbScheduleBlock): ScheduleBlock {
  return {
    id: dbBlock.id,
    title: dbBlock.title,
    tag: dbBlock.tag || null,
    start: dbBlock.start_hour,
    duration: dbBlock.duration,
    color: dbBlock.color || '#4285f4',
    textColor: dbBlock.text_color || 'text-white',
    isGoogle: dbBlock.is_google,
    googleEventId: dbBlock.google_event_id || undefined,
    taskId: dbBlock.task_id || undefined,
    habitId: dbBlock.habit_id || undefined,
    completed: dbBlock.completed || false, // CRITICAL: This was missing!
  };
}

// ============ TASKS ============

export async function loadTasks(listType: 'active' | 'later'): Promise<Task[]> {
  const { data: { user } } = await supabase.auth.getUser();
  // Define dateStr for logging, assuming current date if not passed
  const targetDate = new Date();
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const dateStr = formatter.format(targetDate);

  console.log('📋 Loading tasks for date:', dateStr, 'listType:', listType);
  console.log('🔍 DEBUG: Exact dateStr being queried:', JSON.stringify(dateStr));

  let query = supabase
    .from('tasks')
    .select('*')
    .eq('list_type', listType)
    .order('position', { ascending: true });

  // Always exclude recurring templates from the list (they're just templates)
  query = query.or('is_recurring.eq.false,is_recurring.is.null');

  const { data, error } = await query;

  if (error) {
    console.error('❌ Error loading tasks:', error);
    return [];
  }

  console.log(`✅ Loaded ${data?.length || 0} tasks for ${dateStr}`);
  console.log('🔍 DEBUG: Task dates in results:', data?.map(t => ({ id: t.id, title: t.title, assigned_date: t.assigned_date })));

  return (data || []).map(dbTaskToTask);
}

export async function saveTask(task: Task, listType: 'active' | 'later'): Promise<Task | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('tasks')
    .upsert({
      id: task.id,
      user_id: user.id,
      title: task.title,
      tag: task.tag,
      tag_color: task.tagColor,
      time: task.time,
      completed: task.completed,
      completed_at: task.completedAt,
      assigned_date: task.assignedDate,
      list_type: listType,
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving task:', error);
    return null;
  }

  return dbTaskToTask(data);
}

export async function createTask(title: string, listType: 'active' | 'later'): Promise<Task | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: user.id,
      title,
      list_type: listType,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating task:', error);
    return null;
  }

  return dbTaskToTask(data);
}

export async function updateTask(taskId: string, updates: Partial<Task>): Promise<boolean> {
  const updateData: any = {};
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.tag !== undefined) updateData.tag = updates.tag;
  if (updates.tagColor !== undefined) updateData.tag_color = updates.tagColor;
  if (updates.time !== undefined) updateData.time = updates.time;
  if (updates.completed !== undefined) updateData.completed = updates.completed;
  if (updates.assignedDate !== undefined) updateData.assigned_date = updates.assignedDate;

  // Try to update completed_at if column exists (after migration)
  if (updates.completedAt !== undefined) {
    updateData.completed_at = updates.completedAt;
  }

  const { error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', taskId);

  if (error) {
    // If error is about missing column, try again without that column
    if (error.code === '42703' && updateData.completed_at !== undefined) {
      delete updateData.completed_at;
      const { error: retryError } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId);

      if (retryError) {
        console.error('Error updating task:', retryError);
        return false;
      }
      return true;
    }
    console.error('Error updating task:', error);
    return false;
  }

  return true;
}

export async function deleteTask(taskId: string): Promise<boolean> {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);

  if (error) {
    console.error('Error deleting task:', error);
    return false;
  }

  return true;
}

export async function moveTask(taskId: string, newListType: 'active' | 'later'): Promise<boolean> {
  const { error } = await supabase
    .from('tasks')
    .update({ list_type: newListType, time: newListType === 'later' ? null : undefined })
    .eq('id', taskId);

  if (error) {
    console.error('Error moving task:', error);
    return false;
  }

  return true;
}

// ============ SCHEDULE BLOCKS ============

export async function loadScheduleBlocks(date?: Date): Promise<ScheduleBlock[]> {
  const targetDate = date || new Date();
  const y = targetDate.getFullYear();
  const m = String(targetDate.getMonth() + 1).padStart(2, '0');
  const d = String(targetDate.getDate()).padStart(2, '0');
  const dateStr = `${y}-${m}-${d}`;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  console.log('📅 Loading schedule blocks for user:', user.id, 'date:', dateStr);

  const { data: rawData, error } = await supabase
    .from('schedule_blocks')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', dateStr)
    .order('start_hour', { ascending: true });

  if (error) {
    console.error('❌ Error loading schedule blocks:', error);
    return [];
  }

  return (rawData || []).map(dbBlockToBlock);
}

export async function createScheduleBlock(block: Omit<ScheduleBlock, 'id'>, date?: Date): Promise<ScheduleBlock | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Revert to ISO string to match existing DB format and ensure consistency
  const targetDate = date || new Date();
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const dateStr = formatter.format(targetDate);

  const insertData = {
    user_id: user.id,
    title: block.title,
    tag: block.tag,
    start_hour: block.start,
    duration: block.duration,
    color: block.color,
    text_color: block.textColor,
    is_google: block.isGoogle || false,
    completed: block.completed || false,
    google_event_id: block.googleEventId || null,
    // Robustly convert to string, handling 0, numbers, and strings
    task_id: (block.taskId !== undefined && block.taskId !== null) ? String(block.taskId) : null,
    habit_id: (block.habitId !== undefined && block.habitId !== null) ? String(block.habitId) : null,
    date: dateStr,
  };

  console.log('📝 Creating Schedule Block (Payload):', insertData);

  const { data, error } = await supabase
    .from('schedule_blocks')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('❌ Error creating schedule block:', error);
    return null;
  }

  console.log('✅ Created schedule block successfully:', data);
  return dbBlockToBlock(data);
}

export async function updateScheduleBlock(blockId: string, updates: Partial<ScheduleBlock>): Promise<boolean> {
  const updateData: any = {};
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.tag !== undefined) updateData.tag = updates.tag;
  if (updates.start !== undefined) updateData.start_hour = updates.start;
  if (updates.duration !== undefined) updateData.duration = updates.duration;
  if (updates.color !== undefined) updateData.color = updates.color;
  if (updates.textColor !== undefined) updateData.text_color = updates.textColor;
  if (updates.completed !== undefined) updateData.completed = updates.completed;
  if (updates.isGoogle !== undefined) updateData.is_google = updates.isGoogle;
  if (updates.googleEventId !== undefined) updateData.google_event_id = updates.googleEventId;
  if (updates.taskId !== undefined) updateData.task_id = updates.taskId;
  if (updates.habitId !== undefined) updateData.habit_id = updates.habitId;

  const { error } = await supabase
    .from('schedule_blocks')
    .update(updateData)
    .eq('id', blockId);

  if (error) {
    console.error('Error updating schedule block:', error);
    return false;
  }

  return true;
}

export async function deleteScheduleBlock(blockId: string): Promise<boolean> {
  const { error } = await supabase
    .from('schedule_blocks')
    .delete()
    .eq('id', blockId);

  if (error) {
    console.error('Error deleting schedule block:', error);
    return false;
  }

  return true;
}

// ============ USER SETTINGS ============

export async function loadUserSettings(): Promise<UserSettings | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error) {
    // Settings might not exist yet, create them
    if (error.code === 'PGRST116') {
      const { data: newData, error: insertError } = await supabase
        .from('user_settings')
        .insert({ user_id: user.id })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating user settings:', insertError);
        return null;
      }

      return {
        timeFormat: newData.time_format,
        timezone: newData.timezone,
        googleConnected: newData.google_connected,
      };
    }

    console.error('Error loading user settings:', error);
    return null;
  }

  return {
    timeFormat: data.time_format,
    timezone: data.timezone,
    googleConnected: data.google_connected,
  };
}

export async function saveUserSettings(settings: Partial<UserSettings>): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const updateData: any = {};
  if (settings.timeFormat !== undefined) updateData.time_format = settings.timeFormat;
  if (settings.timezone !== undefined) updateData.timezone = settings.timezone;
  if (settings.googleConnected !== undefined) updateData.google_connected = settings.googleConnected;

  const { error } = await supabase
    .from('user_settings')
    .update(updateData)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error saving user settings:', error);
    return false;
  }

  return true;
}

// ============ NOTES ============

export async function loadNote(date: Date): Promise<string> {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const dateStr = `${y}-${m}-${d}`;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return '';

  try {
    // Use maybeSingle() instead of single() to avoid 406 errors when no row exists
    const { data, error } = await supabase
      .from('notes')
      .select('content')
      .eq('user_id', user.id)
      .eq('date', dateStr)
      .maybeSingle();

    if (error) {
      // Table doesn't exist (404) - silently return empty
      if (error.code === '42P01' || error.message?.includes('404') || error.message?.includes('406')) {
        console.warn('Notes table issue. Please ensure the table exists.');
        return '';
      }
      console.error('Error loading note:', error);
      return '';
    }

    return data?.content || '';
  } catch (err) {
    // Handle network errors or table not existing
    console.warn('Could not load note:', err);
    return '';
  }
}

export async function saveNote(date: Date, content: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const formatter = new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const dateStr = formatter.format(date);

  try {
    const { error } = await supabase
      .from('notes')
      .upsert(
        {
          user_id: user.id,
          date: dateStr,
          content: content,
        },
        { onConflict: 'user_id,date' }
      );

    if (error) {
      // Table doesn't exist - silently fail
      if (error.code === '42P01' || error.message?.includes('404')) {
        console.warn('Notes table not found. Please run the SQL migration.');
        return false;
      }
      console.error('Error saving note:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('Could not save note:', err);
    return false;
  }
}

// ============ DAILY RESET & OVERDUE TASK MIGRATION ============

/**
 * Get today's date in YYYY-MM-DD format using user's timezone
 */
export function getTodayDateString(timezone: string = 'Local'): string {
  const now = new Date();

  // Use Sweden/Local locale to get correct YYYY-MM-DD for the user's day
  // This prevents 00:00-01:00 AM tasks from being treated as "yesterday" due to UTC lag
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: timezone === 'Local' ? undefined : timezone
  });

  return formatter.format(now);
}

/**
 * Migrate overdue tasks to "To-do Later" list
 * Runs on app load to clean up tasks from previous days
 * BACKWARD COMPATIBLE: Works even if assigned_date column doesn't exist yet
 */
export async function migrateOverdueTasks(timezone: string = 'Local'): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const today = getTodayDateString(timezone);

  console.log('🔄 Migrating overdue tasks (before today:', today, ')');

  // Try to find overdue tasks - if column doesn't exist, just return 0
  try {
    const { data: overdueTasks, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('list_type', 'active')
      .eq('completed', false)
      .lt('assigned_date', today)
      .not('assigned_date', 'is', null)
      .is('parent_task_id', null); // Don't migrate recurring instances - they're date-specific

    if (fetchError) {
      // If column doesn't exist, just skip migration
      if (fetchError.code === '42703') {
        console.log('⏭️  Skipping overdue task migration (database not migrated yet)');
        return 0;
      }
      console.error('❌ Error fetching overdue tasks:', fetchError);
      return 0;
    }

    if (!overdueTasks || overdueTasks.length === 0) {
      console.log('✅ No overdue tasks to migrate');
      return 0;
    }

    console.log(`📦 Found ${overdueTasks.length} overdue task(s) to migrate`);

    // Move each overdue task to "later" list
    for (const task of overdueTasks) {
      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          list_type: 'later',
          assigned_date: null,
          time: null,
        })
        .eq('id', task.id);

      if (updateError) {
        console.error(`❌ Error migrating task "${task.title}":`, updateError);
      } else {
        console.log(`✅ Migrated "${task.title}" to "To-do Later"`);
      }
    }

    return overdueTasks.length;
  } catch (error) {
    console.error('❌ Error in migrateOverdueTasks:', error);
    return 0;
  }
}

/**
 * Load tasks for a specific date
 * This ensures tasks are only shown as completed if they were completed on that specific date
 */
export async function loadTasksForDate(date: Date, listType: 'active' | 'later'): Promise<Task[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const formatter = new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const dateStr = formatter.format(date);
  console.log('📋 Loading tasks for date:', dateStr, 'listType:', listType);

  let query = supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .eq('list_type', listType)
    .order('position', { ascending: true });

  // For ALL tasks, filter by assigned date
  query = query.eq('assigned_date', dateStr);

  const { data, error } = await query;

  if (error) {
    console.error('❌ Error loading tasks for date:', error);
    return [];
  }

  console.log('✅ Loaded tasks:', data?.length || 0, 'items');
  return (data || []).map(dbTaskToTask);
}

/**
 * Set task completion status with proper date tracking
 */
export async function setTaskCompletion(taskId: string, completed: boolean): Promise<boolean> {
  console.log(`🔄 setTaskCompletion: taskId=${taskId}, completed=${completed}`);

  const { error } = await supabase
    .from('tasks')
    .update({
      completed: completed,
      completed_at: completed ? new Date().toISOString() : null
    })
    .eq('id', taskId);

  if (error) {
    console.error('❌ Error setting task completion:', error);
    return false;
  }

  console.log('✅ Task completion updated successfully');
  return true;
}

/**
 * Toggle task completion (Legacy wrapper)
 */
export async function toggleTaskCompletion(taskId: string, currentlyCompleted: boolean): Promise<boolean> {
  return setTaskCompletion(taskId, !currentlyCompleted);
}

/**
 * Create a new task with proper date assignment
 */
export async function createTaskForDate(
  title: string,
  date: Date | null,
  listType: 'active' | 'later'
): Promise<Task | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  /* Use Sweden/Local locale to get correct YYYY-MM-DD
   * This ensures tasks created at 00:30 AM local time are assigned to the correct day, not "yesterday" (UTC)
   */
  let dateStr: string | null = null;
  if (date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    dateStr = `${y}-${m}-${d}`;
  }

  console.log('📝 Creating task:', {
    title,
    listType,
    date: date?.toISOString(),
    assigned_date: dateStr
  });
  console.log('🔍 DEBUG: Exact dateStr being saved:', JSON.stringify(dateStr));

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: user.id,
      title,
      list_type: listType,
      assigned_date: dateStr, // Assign date for BOTH active and later (date-bound logic)
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating task:', error);
    return null;
  }

  console.log('✅ Task created with assigned_date:', data.assigned_date);
  console.log('🔍 DEBUG: Full task data returned from DB:', {
    id: data.id,
    title: data.title,
    assigned_date: data.assigned_date,
    list_type: data.list_type
  });

  return dbTaskToTask(data);
}

/**
 * Move task to a different list and update date assignment
 */
export async function moveTaskToList(
  taskId: string,
  newListType: 'active' | 'later',
  targetDate?: Date
): Promise<boolean> {
  let dateStr: string | null = null;
  if (targetDate) {
    const y = targetDate.getFullYear();
    const m = String(targetDate.getMonth() + 1).padStart(2, '0');
    const d = String(targetDate.getDate()).padStart(2, '0');
    dateStr = `${y}-${m}-${d}`;
  }

  const { error } = await supabase
    .from('tasks')
    .update({
      list_type: newListType,
      assigned_date: dateStr, // Date-bind the task to the target date
      time: newListType === 'later' ? null : undefined
    })
    .eq('id', taskId);

  if (error) {
    console.error('Error moving task:', error);
    return false;
  }

  return true;
}

// ============ RECURRING TASKS ============

/**
 * Create a recurring task template
 * This is the "master" task that will generate daily instances
 */
export async function createRecurringTask(
  title: string,
  recurrencePattern: 'daily' | 'weekly' | 'monthly' = 'daily',
  tag?: string | null,
  tagColor?: string | null,
  time?: string | null
): Promise<Task | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: user.id,
      title,
      tag: tag || null,
      tag_color: tagColor || null,
      time: time || null,
      is_recurring: true,
      recurrence_pattern: recurrencePattern,
      list_type: 'later', // Templates live in "later" but don't show up (filtered out)
      assigned_date: null, // Templates have no assigned date
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating recurring task:', error);
    return null;
  }

  console.log('✅ Created recurring task template:', data.title);
  return dbTaskToTask(data);
}

/**
 * Generate daily instances for all recurring tasks
 * This runs on app load to ensure today's instances exist
 * BACKWARD COMPATIBLE: Works even if is_recurring column doesn't exist yet
 */
export async function generateRecurringInstances(date: Date, timezone: string = 'Local'): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  /* Use Sweden/Local locale to get correct YYYY-MM-DD
   * This is critical for ensuring recurring tasks are generated for the correct local date
   */
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const dateStr = `${y}-${m}-${d}`;
  console.log('🔄 Generating recurring task instances for:', dateStr);

  // Try to get recurring templates - if column doesn't exist, just return 0
  try {
    const { data: templates, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_recurring', true)
      .is('parent_task_id', null);

    if (fetchError) {
      if (fetchError.code === '42703') return 0;
      console.error('❌ Error fetching recurring templates:', fetchError);
      return 0;
    }

    if (!templates || templates.length === 0) return 0;

    // 1. Fetch ALL instances for this date in ONE query
    const { data: existingInstances, error: existError } = await supabase
      .from('tasks')
      .select('parent_task_id, title')
      .eq('user_id', user.id)
      .eq('assigned_date', dateStr)
      .not('assigned_date', 'is', null);

    if (existError) {
      console.error('Error fetching existing instances:', existError);
      return 0;
    }

    // 2. Identify which templates need a new instance
    const existingTitles = new Set(existingInstances?.map(i => i.title));
    const existingParentIds = new Set(existingInstances?.map(i => i.parent_task_id));

    const templatesToCreate = templates.filter(t =>
      !existingTitles.has(t.title) && !existingParentIds.has(t.id)
    );

    if (templatesToCreate.length === 0) return 0;

    // 3. Bulk insert all new instances
    const newInstances = templatesToCreate.map(t => ({
      user_id: user.id,
      title: t.title,
      tag: t.tag,
      tag_color: t.tag_color,
      time: t.time,
      completed: false,
      completed_at: null,
      assigned_date: dateStr,
      is_recurring: false,
      recurrence_pattern: t.recurrence_pattern,
      parent_task_id: t.id,
      list_type: t.list_type || 'active',
    }));

    const { error: insertError } = await supabase.from('tasks').insert(newInstances);

    if (insertError) {
      console.error('❌ Error bulk creating instances:', insertError);
      return 0;
    }

    console.log(`🎉 Generated ${templatesToCreate.length} recurring task instances for ${dateStr}`);
    return templatesToCreate.length;
  } catch (error) {
    console.error('❌ Error in generateRecurringInstances:', error);
    return 0;
  }
}

/**
 * Load ALL tasks for a specific date (both active and later)
 * Optimized to use a single database query instead of multiple
 */
export async function loadAllTasksForDate(date: Date): Promise<{ active: Task[], later: Task[] }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { active: [], later: [] };

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const dateStr = `${y}-${m}-${d}`;

  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('assigned_date', dateStr)
      .or('is_recurring.eq.false,is_recurring.is.null');

    if (error) {
      console.error('Error in loadAllTasksForDate:', error);
      return { active: [], later: [] };
    }

    const allTasks = (data || []).map(dbTaskToTask);
    return {
      active: allTasks.filter(t => t.listType === 'active' || !t.listType),
      later: allTasks.filter(t => t.listType === 'later')
    };
  } catch (error) {
    console.error('Error in loadAllTasksForDate:', error);
    return { active: [], later: [] };
  }
}

/**
 * Get all recurring task templates for management UI
 */
export async function getRecurringTemplates(): Promise<Task[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_recurring', true)
    .is('parent_task_id', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading recurring templates:', error);
    return [];
  }

  return (data || []).map(dbTaskToTask);
}

/**
 * Delete a recurring task template and optionally its instances
 */
export async function deleteRecurringTemplate(templateId: string, deleteInstances: boolean = false): Promise<boolean> {
  if (deleteInstances) {
    // Delete all instances first
    const { error: instanceError } = await supabase
      .from('tasks')
      .delete()
      .eq('parent_task_id', templateId);

    if (instanceError) {
      console.error('Error deleting recurring instances:', instanceError);
      return false;
    }
  } else {
    // Just unlink instances (they become regular tasks)
    const { error: unlinkError } = await supabase
      .from('tasks')
      .update({ parent_task_id: null })
      .eq('parent_task_id', templateId);

    if (unlinkError) {
      console.error('Error unlinking recurring instances:', unlinkError);
      return false;
    }
  }

  // Delete the template
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', templateId);

  if (error) {
    console.error('Error deleting recurring template:', error);
    return false;
  }

  return true;
}

// ============ HABIT SYNC ============

/**
 * Get a task instance for a habit on a specific date
 * Links local habits to database tasks by title and date
 */
export async function getHabitTaskInstance(habitName: string, date: Date): Promise<Task | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const formatter = new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const dateStr = formatter.format(date);

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .eq('title', habitName)
    .eq('assigned_date', dateStr)
    .maybeSingle();

  if (error) {
    console.error('Error finding habit task instance:', error);
    return null;
  }

  return data ? dbTaskToTask(data) : null;
}

/**
 * Sync a local habit completion to the database tasks
 * Ensures that when a habit is completed locally, a corresponding task exists and is completed
 */
export async function syncHabitCompletion(
  habitName: string,
  date: Date,
  isCompleted: boolean,
  tag?: string | null,
  tagColor?: string | null
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const formatter = new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const dateStr = formatter.format(date);
  console.log(`🔄 Syncing habit "${habitName}" for ${dateStr}: completed=${isCompleted}`);

  // 1. Check if a task already exists for this habit on this date
  const existingTask = await getHabitTaskInstance(habitName, date);

  if (existingTask) {
    // Task exists - just update its completion status
    if (existingTask.completed !== isCompleted) {
      console.log(`📝 Updating existing habit task "${habitName}" to ${isCompleted}`);
      return await updateTask(String(existingTask.id), { completed: isCompleted });
    }
    return true; // Already in correct state
  }

  // 2. If task doesn't exist and we're marking it complete (or just ensure it exists)
  if (isCompleted) {
    console.log(`➕ Creating new task for habit "${habitName}" on ${dateStr}`);
    // Create the task
    const newTask = await createTaskForDate(habitName, date, 'active');
    if (!newTask) return false;

    // Apply tag and completion
    const updates: Partial<Task> = { completed: true };
    if (tag) updates.tag = tag;
    if (tagColor) updates.tagColor = tagColor;

    return await updateTask(String(newTask.id), updates);
  }

  return true;
}

/**
 * Clean up duplicate tasks that have the same title and assigned_date
 * This can happen when habits are synced multiple times
 */
export async function cleanupDuplicateTasks(date: Date): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const dateStr = `${y}-${m}-${d}`;

  console.log('🧹 Cleaning up duplicate tasks for date:', dateStr);

  try {
    // Find all tasks for this date grouped by title
    const { data: tasks, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('assigned_date', dateStr)
      .order('created_at', { ascending: true });

    if (fetchError || !tasks) {
      console.error('Error fetching tasks for cleanup:', fetchError);
      return 0;
    }

    // Group by title
    const tasksByTitle = new Map<string, typeof tasks>();
    for (const task of tasks) {
      const existing = tasksByTitle.get(task.title) || [];
      existing.push(task);
      tasksByTitle.set(task.title, existing);
    }

    let deletedCount = 0;

    // For each title with duplicates, keep the oldest and delete the rest
    for (const [title, duplicates] of tasksByTitle.entries()) {
      if (duplicates.length > 1) {
        console.log(`🔍 Found ${duplicates.length} duplicates for "${title}"`);

        // Keep the first (oldest) task, delete the rest
        const toDelete = duplicates.slice(1);

        for (const task of toDelete) {
          const { error: deleteError } = await supabase
            .from('tasks')
            .delete()
            .eq('id', task.id);

          if (!deleteError) {
            console.log(`🗑️ Deleted duplicate task: "${title}" (ID: ${task.id})`);
            deletedCount++;
          } else {
            console.error(`Failed to delete duplicate task ${task.id}:`, deleteError);
          }
        }
      }
    }

    if (deletedCount > 0) {
      console.log(`✅ Cleaned up ${deletedCount} duplicate task(s)`);
    }

    return deletedCount;
  } catch (error) {
    console.error('Error in cleanupDuplicateTasks:', error);
    return 0;
  }
}


