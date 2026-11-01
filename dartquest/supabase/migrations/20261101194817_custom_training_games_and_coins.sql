create table public.custom_training_sessions (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 game text not null check (game in ('bulls-warm-up','t20-combo')),
 minutes integer not null check (minutes in (5,10,15)),
 started_at timestamptz not null default now(),
 end_at timestamptz not null,
 created_at timestamptz not null default now(),
 status text not null default 'active' check (status in ('active','completed')),
 payload jsonb not null default '{}'::jsonb,
 coins integer not null default 0 check (coins >= 0)
);
create index custom_training_user_created_idx on public.custom_training_sessions(user_id, created_at desc, id);
alter table public.custom_training_sessions enable row level security;
revoke all on public.custom_training_sessions from public, anon, authenticated;
grant select on public.custom_training_sessions to authenticated;
create policy "custom training read own" on public.custom_training_sessions for select to authenticated using ((select auth.uid()) = user_id);

create table private.custom_training_reward_config (
 minutes integer primary key check (minutes in (5,10,15)),
 coins integer not null check (coins >= 0)
);
insert into private.custom_training_reward_config values (5,5),(10,10),(15,15);
revoke all on private.custom_training_reward_config from public, anon, authenticated;

create function private.start_custom_training(p_id uuid, p_game text, p_minutes integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_row public.custom_training_sessions;
begin
 if v_user is null then raise exception 'Anmeldung erforderlich'; end if;
 if p_game not in ('bulls-warm-up','t20-combo') or p_minutes not in (5,10,15) or p_id is null then raise exception 'Ungültiges Training'; end if;
 insert into public.custom_training_sessions(id,user_id,game,minutes,end_at)
 values(p_id,v_user,p_game,p_minutes,now()+make_interval(mins=>p_minutes)) on conflict(id) do nothing;
 select * into v_row from public.custom_training_sessions where id=p_id and user_id=v_user;
 if not found or v_row.game<>p_game or v_row.minutes<>p_minutes then raise exception 'Training nicht verfügbar'; end if;
 return to_jsonb(v_row);
end;
$$;
revoke all on function private.start_custom_training(uuid,text,integer) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.start_custom_training(uuid,text,integer) to authenticated;
create function public.start_custom_training(p_id uuid, p_game text, p_minutes integer)
returns jsonb language sql security invoker set search_path = '' as $$ select private.start_custom_training(p_id,p_game,p_minutes); $$;
revoke all on function public.start_custom_training(uuid,text,integer) from public, anon;
grant execute on function public.start_custom_training(uuid,text,integer) to authenticated;

create function private.complete_custom_training(p_id uuid, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
 v_user uuid := auth.uid(); v_row public.custom_training_sessions;
 v_coins integer; v_double integer := 0; v_single integer := 0;
 v_entry jsonb; v_points integer; v_count integer; v_entries jsonb := '[]'::jsonb; v_payload jsonb;
begin
 if v_user is null then raise exception 'Anmeldung erforderlich'; end if;
 select * into v_row from public.custom_training_sessions where id=p_id and user_id=v_user for update;
 if not found then raise exception 'Training nicht verfügbar'; end if;
 if v_row.status='completed' then return to_jsonb(v_row); end if;
 if now()<v_row.end_at then raise exception 'Trainingszeit noch nicht abgelaufen'; end if;
 if jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'Ungültiges Ergebnis'; end if;
 if v_row.game='bulls-warm-up' then
   if coalesce(p_payload->>'doubleBull','') !~ '^[0-9]{1,6}$' or coalesce(p_payload->>'singleBull','') !~ '^[0-9]{1,6}$' then raise exception 'Ungültige Trefferzahlen'; end if;
   v_double := (p_payload->>'doubleBull')::integer; v_single := (p_payload->>'singleBull')::integer;
 else
   if jsonb_typeof(p_payload->'entries') is distinct from 'array' then raise exception 'Serien fehlen'; end if;
   if jsonb_array_length(p_payload->'entries')>20000 then raise exception 'Zu viele Serien'; end if;
   for v_entry in select value from jsonb_array_elements(p_payload->'entries') loop
     if coalesce(v_entry->>'points','') !~ '^[0-9]{1,4}$' or coalesce(v_entry->>'count','') !~ '^[0-9]{1,2}$' then raise exception 'Ungültige Serie'; end if;
     v_points := (v_entry->>'points')::integer; v_count := (v_entry->>'count')::integer;
     if v_count<1 or v_count>20 or v_points<60*v_count or v_points>180*v_count then raise exception 'Ungültige Serienpunkte'; end if;
     v_entries := v_entries || jsonb_build_array(jsonb_build_object('points',v_points,'count',v_count));
   end loop;
 end if;
 v_payload := jsonb_build_object('game',v_row.game,'minutes',v_row.minutes,'doubleBull',v_double,'singleBull',v_single,'entries',v_entries);
 select coins into strict v_coins from private.custom_training_reward_config where minutes=v_row.minutes;
 -- The locked session and profile increment commit in the same transaction.
 update public.profiles set coins=coalesce(coins,0)+v_coins where id=v_user;
 if not found then raise exception 'Profil fehlt'; end if;
 update public.custom_training_sessions set status='completed',payload=v_payload,coins=v_coins,created_at=v_row.end_at where id=p_id returning * into v_row;
 return to_jsonb(v_row);
end;
$$;
revoke all on function private.complete_custom_training(uuid,jsonb) from public, anon;
grant execute on function private.complete_custom_training(uuid,jsonb) to authenticated;
create function public.complete_custom_training(p_id uuid, p_payload jsonb)
returns jsonb language sql security invoker set search_path = '' as $$ select private.complete_custom_training(p_id,p_payload); $$;
revoke all on function public.complete_custom_training(uuid,jsonb) from public, anon;
grant execute on function public.complete_custom_training(uuid,jsonb) to authenticated;
