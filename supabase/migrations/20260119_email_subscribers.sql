-- Optional: Create a table to store email subscribers for future marketing campaigns
-- This allows you to build an email list for newsletters, product updates, etc.

create table if not exists public.email_subscribers (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  user_id uuid references auth.users(id) on delete cascade,
  subscribed_at timestamp with time zone default now(),
  is_active boolean default true,
  subscription_source text default 'signup', -- 'signup', 'newsletter', 'landing_page', etc.
  unsubscribed_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Add index for faster lookups
create index if not exists idx_email_subscribers_email on public.email_subscribers(email);
create index if not exists idx_email_subscribers_user_id on public.email_subscribers(user_id);
create index if not exists idx_email_subscribers_is_active on public.email_subscribers(is_active);

-- Enable RLS
alter table public.email_subscribers enable row level security;

-- Policy: Users can view their own subscription
create policy "Users can view own subscription"
  on public.email_subscribers for select
  using (auth.uid() = user_id);

-- Policy: Users can update their own subscription (e.g., unsubscribe)
create policy "Users can update own subscription"
  on public.email_subscribers for update
  using (auth.uid() = user_id);

-- Policy: Service role can insert new subscribers
create policy "Service role can insert subscribers"
  on public.email_subscribers for insert
  with check (true);

-- Function to automatically add new users to email subscribers
create or replace function public.add_user_to_email_list()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Add the new user to the email subscribers list
  insert into public.email_subscribers (email, user_id, subscription_source)
  values (new.email, new.id, 'signup')
  on conflict (email) do nothing; -- Ignore if already exists
  
  return new;
exception when others then
  -- Don't fail the signup if email subscription fails
  return new;
end;
$$;

-- Create trigger to automatically add users to email list
drop trigger if exists on_user_signup_add_to_email_list on auth.users;
create trigger on_user_signup_add_to_email_list
  after insert on auth.users
  for each row
  execute function public.add_user_to_email_list();

-- Function to unsubscribe from emails
create or replace function public.unsubscribe_from_emails()
returns void
language plpgsql
security definer
as $$
begin
  update public.email_subscribers
  set 
    is_active = false,
    unsubscribed_at = now(),
    updated_at = now()
  where user_id = auth.uid();
end;
$$;

-- Grant necessary permissions
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on public.email_subscribers to postgres, service_role;
grant select, update on public.email_subscribers to authenticated;

-- Add comment
comment on table public.email_subscribers is 'Stores email subscribers for marketing campaigns and newsletters';
