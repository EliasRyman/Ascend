import { supabase } from '../src/supabase';

async function cleanup() {
  console.log('🧹 Starting database cleanup...');

  const { error: tasksErr } = await supabase.from('tasks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (tasksErr) console.error('Error clearing tasks:', tasksErr);
  else console.log('✅ Tasks cleared');

  const { error: blocksErr } = await supabase.from('schedule_blocks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (blocksErr) console.error('Error clearing blocks:', blocksErr);
  else console.log('✅ Schedule blocks cleared');

  console.log('✨ Cleanup complete!');
}

cleanup();
