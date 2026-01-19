-- Enable the HTTP extension for making external requests
create extension if not exists http with schema extensions;

-- Create a table to track sent welcome emails (optional, for debugging)
create table if not exists public.welcome_emails_log (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  sent_at timestamp with time zone default now(),
  success boolean default true,
  error_message text
);

-- Enable RLS on the log table
alter table public.welcome_emails_log enable row level security;

-- Policy: Only authenticated users can view their own email logs
create policy "Users can view own email logs"
  on public.welcome_emails_log for select
  using (auth.uid() = user_id);

-- Function that triggers when a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  request_id bigint;
  supabase_url text;
  service_role_key text;
begin
  -- Get Supabase URL from environment
  -- Updated with your actual Supabase project reference
  supabase_url := 'https://hmnbdkwjgmwchuyhtmqh.supabase.co/functions/v1/send-welcome-email';

  
  -- Make async HTTP request to Edge Function
  -- The function will handle the email sending
  select http_post(
    supabase_url,
    json_build_object(
      'email', new.email,
      'user_id', new.id
    )::text,
    'application/json'
  ) into request_id;
  
  -- Log the attempt (optional)
  insert into public.welcome_emails_log (user_id, email, success)
  values (new.id, new.email, true);
  
  return new;
exception when others then
  -- Log the error but don't fail the user signup
  insert into public.welcome_emails_log (user_id, email, success, error_message)
  values (new.id, new.email, false, sqlerrm);
  
  return new;
end;
$$;

-- Create trigger that fires after a new user is inserted
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Grant necessary permissions
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on public.welcome_emails_log to postgres, anon, authenticated, service_role;
