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
  tag: string;
  start: number;
  duration: number;
  color: string;
  textColor: string;
  isGoogle?: boolean;
  googleEventId?: string;
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
    tag: dbBlock.tag || 'work',
    start: dbBlock.start_hour,
    duration: dbBlock.duration,
    color: dbBlock.color || 'bg-indigo-400/90 dark:bg-indigo-600/90 border-indigo-500',
    textColor: dbBlock.text_color || 'text-indigo-950 dark:text-indigo-50',
    isGoogle: dbBlock.is_google,
    googleEventId: dbBlock.google_event_id || undefined,
  };
}

// ============ TASKS ============

export async function loadTasks(listType: 'active' | 'later'): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('list_type', listType)
    .order('position', { ascending: true });

  if (error) {
    console.error('Error loading tasks:', error);
    return [];
  }

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
  // Check if taskId looks like a UUID (contains dashes and is ~36 chars)
  // Demo tasks have simple numeric IDs which shouldn't be sent to database
  const isUuid = taskId.includes('-') && taskId.length >= 32;
  
  if (!isUuid) {
    console.log('Task ID is not a UUID, skipping database delete:', taskId);
    return true; // Return true since there's nothing to delete in DB
  }
  
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

  const { data, error } = await supabase
    .from('schedule_blocks')
    .select('*')
    .eq('date', dateStr)
    .order('start_hour', { ascending: true });

  if (error) {
    console.error('Error loading schedule blocks:', error);
    return [];
  }

  return (data || []).map(dbBlockToBlock);
}

export async function createScheduleBlock(block: Omit<ScheduleBlock, 'id'>, date?: Date): Promise<ScheduleBlock | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const targetDate = date || new Date();
  const dateStr = targetDate.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('schedule_blocks')
    .insert({
      user_id: user.id,
      title: block.title,
      tag: block.tag,
      start_hour: block.start,
      duration: block.duration,
      color: block.color,
      text_color: block.textColor,
      is_google: block.isGoogle || false,
      google_event_id: block.googleEventId || null,
      date: dateStr,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating schedule block:', error);
    return null;
  }

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
  // Check if blockId looks like a UUID (contains dashes and is ~36 chars)
  // Local/demo blocks have simple numeric IDs which shouldn't be sent to database
  const isUuid = blockId.includes('-') && blockId.length >= 32;
  
  if (!isUuid) {
    console.log('Block ID is not a UUID, skipping database delete:', blockId);
    return true; // Return true since there's nothing to delete in DB
  }
  
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

