import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for database tables
export interface DbTask {
  id: string;
  user_id: string;
  title: string;
  tag: string | null;
  tag_color: string | null;
  time: string | null;
  completed: boolean;
  completed_at: string | null; // Timestamp when task was completed
  assigned_date: string | null; // Date this task is assigned to (YYYY-MM-DD format)
  is_recurring: boolean; // Whether this is a recurring task template
  recurrence_pattern: 'daily' | 'weekly' | 'monthly'; // How often it recurs
  parent_task_id: string | null; // Reference to parent recurring task (for instances)
  list_type: 'active' | 'later';
  created_at: string;
}

export interface DbScheduleBlock {
  id: string;
  user_id: string;
  title: string;
  tag: string | null;
  start_hour: number;
  duration: number;
  color: string | null;
  text_color: string | null;
  is_google: boolean;
  google_event_id: string | null;
  completed: boolean;
  date: string;
  created_at: string;
  task_id: string | null;
  habit_id: string | null;
  color_id: string | null;

  // Newer optional Google metadata columns (may not exist in all environments)
  calendar_id?: string | null;
  calendar_name?: string | null;
  calendar_color?: string | null;
  can_edit?: boolean | null;
  google_updated_at?: string | null;
  etag?: string | null;
}

export interface DbUserSettings {
  user_id: string;
  time_format: '12h' | '24h';
  timezone: string;
  google_connected: boolean;
}

// Auth helper functions
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signInWithGoogle() {
  const envRedirect = import.meta.env.VITE_AUTH_REDIRECT_URL;
  const hostname = window.location.hostname;
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
  // In local dev we always redirect back to the current origin, even if a prod
  // redirect URL is present in env, otherwise OAuth will bounce to production.
  const redirectTo = isLocal ? window.location.origin : (envRedirect || window.location.origin);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
    },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export function onAuthStateChange(callback: (event: string, session: any) => void) {
  return supabase.auth.onAuthStateChange(callback);
}
