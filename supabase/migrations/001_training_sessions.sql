create table if not exists public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_key text not null default 'brian',
  session_date date not null,
  week integer,
  day text,
  activity_template text,
  title text,
  type text,
  sleep integer,
  readiness integer,
  pain text,
  bodyweight text,
  watch_duration text,
  watch_calories text,
  watch_avg_hr text,
  watch_distance text,
  cardio_entries jsonb not null default '[]'::jsonb,
  exercises jsonb not null default '[]'::jsonb,
  notes text,
  summary text,
  raw jsonb not null default '{}'::jsonb,
  submitted_at timestamptz,
  client_saved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_key, session_date)
);

alter table public.training_sessions enable row level security;

drop policy if exists "No direct client access" on public.training_sessions;
create policy "No direct client access"
on public.training_sessions
for all
using (false)
with check (false);

create index if not exists training_sessions_owner_date_idx
on public.training_sessions (owner_key, session_date desc);
