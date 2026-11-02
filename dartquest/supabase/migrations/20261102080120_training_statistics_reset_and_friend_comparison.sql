-- Activate the existing standard-training storage if not yet installed.
do $install$ begin if to_regclass('public.training_sessions') is null then execute $base$create table public.training_sessions (
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
$base$; end if; end; $install$;
-- Statistics deletion is separate from profile XP and campaign resets.
create table public.training_stat_resets (
 user_id uuid not null references auth.users(id) on delete cascade,
 category text not null check (category in ('custom','standard')),
 game text not null,
 reset_at timestamptz not null default clock_timestamp(),
 primary key(user_id,category,game)
);
alter table public.training_stat_resets enable row level security;
revoke all on public.training_stat_resets from public,anon,authenticated;
grant select on public.training_stat_resets to authenticated;
create policy "read own training reset markers" on public.training_stat_resets for select to authenticated using ((select auth.uid())=user_id);

create table public.training_friend_sharing (
 user_id uuid not null references auth.users(id) on delete cascade,
 game text not null check (game in ('bulls-warm-up','t20-combo','triple-20-19-18-combo','favorite-double','double-route','around-the-clock')),
 enabled boolean not null default false,
 primary key(user_id,game)
);
alter table public.training_friend_sharing enable row level security;
revoke all on public.training_friend_sharing from public,anon,authenticated;
grant select,insert,update on public.training_friend_sharing to authenticated;
create policy "read own training sharing" on public.training_friend_sharing for select to authenticated using ((select auth.uid())=user_id);
create policy "insert own training sharing" on public.training_friend_sharing for insert to authenticated with check ((select auth.uid())=user_id);
create policy "update own training sharing" on public.training_friend_sharing for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

create function private.reset_training_statistics(p_category text,p_game text)
returns timestamptz language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_reset timestamptz:=clock_timestamp();
begin
 if v_user is null then raise exception 'Anmeldung erforderlich'; end if;
 if p_category='custom' and p_game in ('bulls-warm-up','t20-combo','triple-20-19-18-combo','favorite-double','double-route','around-the-clock') then
  delete from public.custom_training_sessions where user_id=v_user and game=p_game and status='completed';
 elsif p_category='standard' and p_game in ('201','bull-finisher','random-checkouts') then
  delete from public.training_sessions where user_id=v_user and plan->0->>'id'=p_game;
 else raise exception 'Ungültige Trainingsstatistik'; end if;
 insert into public.training_stat_resets(user_id,category,game,reset_at) values(v_user,p_category,p_game,v_reset)
 on conflict(user_id,category,game) do update set reset_at=excluded.reset_at;
 return v_reset;
end; $$;
create function public.reset_training_statistics(p_category text,p_game text)
returns timestamptz language sql security invoker set search_path='' as $$ select private.reset_training_statistics(p_category,p_game); $$;
revoke all on function private.reset_training_statistics(text,text),public.reset_training_statistics(text,text) from public,anon;
grant execute on function private.reset_training_statistics(text,text),public.reset_training_statistics(text,text) to authenticated;

create function private.get_friend_training_history(p_friend uuid,p_game text,p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_rows jsonb;
begin
 if v_user is null then raise exception 'Anmeldung erforderlich'; end if;
 if p_offset is null or p_offset<0 then raise exception 'Ungültige Seite'; end if;
 if not exists(select 1 from public.friendships where user_id_a=least(v_user,p_friend) and user_id_b=greatest(v_user,p_friend)) or p_friend=v_user or p_friend is null then raise exception 'Vergleich nur mit bestätigten Freunden möglich'; end if;
 if not exists(select 1 from public.training_friend_sharing where user_id=p_friend and game=p_game and enabled) then return jsonb_build_object('sharing',false,'rows','[]'::jsonb); end if;
 select coalesce(jsonb_agg(to_jsonb(s)),'[]'::jsonb) into v_rows from (
  select id,game,minutes,created_at,payload from public.custom_training_sessions where user_id=p_friend and game=p_game and status='completed' order by created_at desc,id offset p_offset limit 500
 ) s;
 return jsonb_build_object('sharing',true,'rows',v_rows);
end; $$;
create function public.get_friend_training_history(p_friend uuid,p_game text,p_offset integer default 0)
returns jsonb language sql stable security invoker set search_path='' as $$ select private.get_friend_training_history(p_friend,p_game,p_offset); $$;
revoke all on function private.get_friend_training_history(uuid,text,integer),public.get_friend_training_history(uuid,text,integer) from public,anon;
grant execute on function private.get_friend_training_history(uuid,text,integer),public.get_friend_training_history(uuid,text,integer) to authenticated;
