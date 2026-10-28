-- The Furnalations: starter database schema for a future multi-user app.
-- Run in Supabase SQL Editor after enabling Supabase Auth.
-- This schema stores one check-in per user per South African calendar date.

create table if not exists public.brother_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Brother',
  created_at timestamptz not null default now()
);

create table if not exists public.daily_checkins (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  checkin_date date not null, -- store the Africa/Johannesburg calendar date
  reflection text not null default '' check (char_length(reflection) <= 500),
  created_at timestamptz not null default now(),
  unique (user_id, checkin_date)
);

alter table public.brother_profiles enable row level security;
alter table public.daily_checkins enable row level security;

create policy "Members can read their own profile"
  on public.brother_profiles for select to authenticated
  using (auth.uid() = id);
create policy "Members can create their own profile"
  on public.brother_profiles for insert to authenticated
  with check (auth.uid() = id);
create policy "Members can update their own profile"
  on public.brother_profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

create policy "Members can read their own check-ins"
  on public.daily_checkins for select to authenticated
  using (auth.uid() = user_id);
create policy "Members can create their own check-ins"
  on public.daily_checkins for insert to authenticated
  with check (auth.uid() = user_id);

-- Do not allow members to edit/delete historical check-ins from the client by default.
-- For a production app, use a trusted server/Edge Function to validate the South African
-- date and compute streak statistics. Add explicit policies only for approved workflows.
