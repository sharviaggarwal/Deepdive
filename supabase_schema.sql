-- ==============================================================================
-- DeepDive: Supabase Database Schema & Row Level Security (RLS)
-- Run this in your Supabase Project's SQL Editor (Dashboard -> SQL Editor)
-- ==============================================================================

-- 1. Create the deepdive_sessions table
create table if not exists public.deepdive_sessions (
    id text primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    input_type text not null check (input_type in ('youtube', 'audio', 'video')),
    source_url text not null,
    title text not null,
    duration_formatted text,
    summary jsonb not null default '{}'::jsonb,
    notes jsonb not null default '[]'::jsonb,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create index for fast user session queries
create index if not exists deepdive_sessions_user_id_idx on public.deepdive_sessions (user_id, created_at desc);

-- 3. Enable Row Level Security (RLS)
alter table public.deepdive_sessions enable row level security;

-- 4. Create RLS Policies ensuring users can ONLY access their own history
drop policy if exists "Users can view their own deepdive sessions" on public.deepdive_sessions;
create policy "Users can view their own deepdive sessions"
    on public.deepdive_sessions for select
    using (auth.uid() = user_id);

drop policy if exists "Users can insert their own deepdive sessions" on public.deepdive_sessions;
create policy "Users can insert their own deepdive sessions"
    on public.deepdive_sessions for insert
    with check (auth.uid() = user_id);

drop policy if exists "Users can update their own deepdive sessions" on public.deepdive_sessions;
create policy "Users can update their own deepdive sessions"
    on public.deepdive_sessions for update
    using (auth.uid() = user_id);

drop policy if exists "Users can delete their own deepdive sessions" on public.deepdive_sessions;
create policy "Users can delete their own deepdive sessions"
    on public.deepdive_sessions for delete
    using (auth.uid() = user_id);
