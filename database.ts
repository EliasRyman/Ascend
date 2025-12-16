import { supabase, DbTask, DbScheduleBlock, DbUserSettings } from './supabase';

// Task types matching the app
export interface Task {
  id: string;
  title: string;
  tag: string | null;
  tagColor: string | null;
  time: string | null;
  completed: boolean;
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
  console.log('📋 Loading tasks for user:', user?.id, 'listType:', listType);

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('list_type', listType)
    .order('position', { ascending: true });

  if (error) {
    console.error('❌ Error loading tasks:', error);
    return [];
  }

  console.log('✅ Loaded tasks:', data?.length || 0, 'items');
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
  const { error } = await supabase
    .from('tasks')
    .update({
      title: updates.title,
      tag: updates.tag,
      tag_color: updates.tagColor,
      time: updates.time,
      completed: updates.completed,
    })
    .eq('id', taskId);

  if (error) {
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
  const dateStr = targetDate.toISOString().split('T')[0];

  const { data: { user } } = await supabase.auth.getUser();
  console.log('📅 Loading schedule blocks for user:', user?.id, 'date:', dateStr);

  const { data: rawData, error } = await supabase
    .from('schedule_blocks')
    .select('*')
    .order('start_hour', { ascending: true }); // Removed .eq('date', dateStr) to debug

  if (error) {
    console.error('❌ Error loading schedule blocks:', error);
    return [];
  }

  // Filter in memory to see if we have ANY blocks
  const allBlocks = (rawData || []).map(dbBlockToBlock);
  console.log(`📦 LOAD DEBUG: User has ${allBlocks.length} TOTAL blocks in DB.`);

  const matchingBlocks = rawData?.filter(b => b.date === dateStr).map(dbBlockToBlock) || [];
  console.log(`📦 LOAD DEBUG: Found ${matchingBlocks.length} blocks for date ${dateStr}. TITLES:`, matchingBlocks.map(b => b.title));

  if (allBlocks.length > 0 && matchingBlocks.length === 0) {
    console.warn('⚠️ POSSIBLE DATE MISMATCH! Blocks exist but none match today.',
      'Target:', dateStr,
      'Existing Dates:', rawData?.map(b => b.date).slice(0, 5)
    );
  }

  return matchingBlocks;
}

export async function createScheduleBlock(block: Omit<ScheduleBlock, 'id'>, date?: Date): Promise<ScheduleBlock | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Revert to ISO string to match existing DB format and ensure consistency
  const targetDate = date || new Date();
  const dateStr = targetDate.toISOString().split('T')[0];

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
  const dateStr = date.toISOString().split('T')[0];

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

  const dateStr = date.toISOString().split('T')[0];

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

