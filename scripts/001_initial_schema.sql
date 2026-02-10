-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create profiles table (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  time_zone text default 'UTC',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Profiles policies
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Create calendars table
create table if not exists public.calendars (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#3b82f6',
  is_default boolean default false,
  provider text default 'local', -- 'local', 'google', 'caldav'
  provider_calendar_id text, -- external calendar ID
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS on calendars
alter table public.calendars enable row level security;

-- Calendars policies
create policy "Users can view own calendars"
  on public.calendars for select
  using (auth.uid() = user_id);

create policy "Users can insert own calendars"
  on public.calendars for insert
  with check (auth.uid() = user_id);

create policy "Users can update own calendars"
  on public.calendars for update
  using (auth.uid() = user_id);

create policy "Users can delete own calendars"
  on public.calendars for delete
  using (auth.uid() = user_id);

-- Create events table
create table if not exists public.events (
  id uuid primary key default uuid_generate_v4(),
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  all_day boolean default false,
  location text,
  reminder_minutes integer,
  provider text default 'local', -- 'local', 'google'
  provider_event_id text, -- external event ID
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS on events
alter table public.events enable row level security;

-- Events policies
create policy "Users can view own events"
  on public.events for select
  using (auth.uid() = user_id);

create policy "Users can insert own events"
  on public.events for insert
  with check (auth.uid() = user_id);

create policy "Users can update own events"
  on public.events for update
  using (auth.uid() = user_id);

create policy "Users can delete own events"
  on public.events for delete
  using (auth.uid() = user_id);

-- Create oauth_connections table for storing encrypted OAuth tokens
create table if not exists public.oauth_connections (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null, -- 'google', 'microsoft'
  provider_account_id text not null, -- email or unique ID from provider
  access_token text not null, -- encrypted in production
  refresh_token text, -- encrypted in production
  token_expires_at timestamptz,
  scope text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, provider, provider_account_id)
);

-- Enable RLS on oauth_connections
alter table public.oauth_connections enable row level security;

-- OAuth connections policies
create policy "Users can view own oauth connections"
  on public.oauth_connections for select
  using (auth.uid() = user_id);

create policy "Users can insert own oauth connections"
  on public.oauth_connections for insert
  with check (auth.uid() = user_id);

create policy "Users can update own oauth connections"
  on public.oauth_connections for update
  using (auth.uid() = user_id);

create policy "Users can delete own oauth connections"
  on public.oauth_connections for delete
  using (auth.uid() = user_id);

-- Create audit_logs table for tracking calendar changes
create table if not exists public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null, -- 'created', 'updated', 'deleted'
  entity_type text not null, -- 'event', 'calendar'
  entity_id uuid not null,
  changes jsonb,
  created_at timestamptz default now()
);

-- Enable RLS on audit_logs
alter table public.audit_logs enable row level security;

-- Audit logs policies
create policy "Users can view own audit logs"
  on public.audit_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own audit logs"
  on public.audit_logs for insert
  with check (auth.uid() = user_id);

-- Create indexes for better performance
create index if not exists idx_events_user_id on public.events(user_id);
create index if not exists idx_events_calendar_id on public.events(calendar_id);
create index if not exists idx_events_start_time on public.events(start_time);
create index if not exists idx_events_end_time on public.events(end_time);
create index if not exists idx_calendars_user_id on public.calendars(user_id);
create index if not exists idx_oauth_connections_user_id on public.oauth_connections(user_id);
create index if not exists idx_audit_logs_user_id on public.audit_logs(user_id);
