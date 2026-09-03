create table if not exists public.time_challenge_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_id text not null,
  target_time_ms bigint not null check (target_time_ms >= 30000),
  elapsed_time_ms bigint not null check (elapsed_time_ms > 0),
  completed_at timestamptz not null default now()
);

create index if not exists time_challenge_attempts_user_challenge_completed_idx
  on public.time_challenge_attempts (user_id, challenge_id, completed_at desc);

alter table public.time_challenge_attempts enable row level security;
revoke all on table public.time_challenge_attempts from anon, authenticated;
grant select, insert on table public.time_challenge_attempts to authenticated;
grant usage, select on sequence public.time_challenge_attempts_id_seq to authenticated;

create policy "time challenge attempts select own"
  on public.time_challenge_attempts for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "time challenge attempts insert own"
  on public.time_challenge_attempts for insert to authenticated
  with check ((select auth.uid()) = user_id);
