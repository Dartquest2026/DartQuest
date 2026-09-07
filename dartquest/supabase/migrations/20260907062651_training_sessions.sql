create table public.training_sessions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  mode text not null check (mode in ('solo', 'versus', 'coop')),
  plan jsonb not null check (jsonb_typeof(plan) = 'array' and jsonb_array_length(plan) > 0),
  player_results jsonb not null check (jsonb_typeof(player_results) = 'array' and jsonb_array_length(player_results) > 0),
  total_score integer not null check (total_score >= 0),
  max_score integer not null check (max_score >= 0),
  percentage numeric(7, 3) not null check (percentage >= 0 and percentage <= 100)
);

create index training_sessions_user_created_idx
  on public.training_sessions using btree (user_id, created_at desc);

alter table public.training_sessions enable row level security;

revoke all on table public.training_sessions from anon, authenticated;
grant select, insert on table public.training_sessions to authenticated;

create policy "training sessions select own"
  on public.training_sessions for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "training sessions insert own"
  on public.training_sessions for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
