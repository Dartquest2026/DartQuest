alter table public.custom_training_sessions
 drop constraint custom_training_sessions_game_check,
 add constraint custom_training_sessions_game_check check (game in ('bulls-warm-up','t20-combo','triple-20-19-18-combo','favorite-double','double-route','around-the-clock')),
 drop constraint custom_training_sessions_minutes_check,
 add constraint custom_training_sessions_minutes_check check ((game='around-the-clock' and minutes=0) or (game<>'around-the-clock' and minutes in (5,10,15)));

create or replace function private.start_custom_training(p_id uuid,p_game text,p_minutes integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_row public.custom_training_sessions;
begin
 if v_user is null then raise exception 'Anmeldung erforderlich'; end if;
 if p_game not in ('bulls-warm-up','t20-combo','triple-20-19-18-combo','favorite-double','double-route','around-the-clock') or (p_game='around-the-clock' and p_minutes<>0) or (p_game<>'around-the-clock' and p_minutes not in (5,10,15)) or p_id is null then raise exception 'Ungültiges Training'; end if;
 insert into public.custom_training_sessions(id,user_id,game,minutes,end_at) values(p_id,v_user,p_game,p_minutes,now()+make_interval(mins=>p_minutes)) on conflict(id) do nothing;
 select * into v_row from public.custom_training_sessions where id=p_id and user_id=v_user;
 if not found or v_row.game<>p_game or v_row.minutes<>p_minutes then raise exception 'Training nicht verfügbar'; end if;
 return to_jsonb(v_row);
end;
$$;

create or replace function private.complete_custom_training(p_id uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
 v_user uuid := auth.uid(); v_row public.custom_training_sessions;
 v_double integer := 0; v_single integer := 0;
 v_entry jsonb; v_points integer; v_count integer; v_target integer;
 v_entries jsonb := '[]'::jsonb; v_throws jsonb := '[]'::jsonb;
 v_route jsonb; v_payload jsonb; v_index integer := 0; v_finished timestamptz := clock_timestamp();
begin
 if v_user is null then raise exception 'Anmeldung erforderlich'; end if;
 select * into v_row from public.custom_training_sessions where id=p_id and user_id=v_user for update;
 if not found then raise exception 'Training nicht verfügbar'; end if;
 if v_row.status='completed' then return to_jsonb(v_row); end if;
 if v_row.game='around-the-clock' then
   if jsonb_typeof(p_payload) is distinct from 'object'
     or jsonb_typeof(p_payload->'includeBull') is distinct from 'boolean'
     or p_payload->'completed' is distinct from 'true'::jsonb
     or coalesce(p_payload->>'misses','') !~ '^[0-9]{1,6}$'
   then raise exception 'Ungültiges Around-the-Clock-Ergebnis'; end if;
   v_payload := jsonb_build_object('game',v_row.game,'minutes',0,'includeBull',(p_payload->>'includeBull')::boolean,'misses',(p_payload->>'misses')::integer,'completed',true,'elapsedMs',greatest(0,floor(extract(epoch from (v_finished-v_row.started_at))*1000)::bigint));
   update public.custom_training_sessions set status='completed',payload=v_payload,coins=0,end_at=v_finished,created_at=v_finished where id=p_id returning * into v_row;
   return to_jsonb(v_row);
 end if;
 if now()<v_row.end_at then raise exception 'Trainingszeit noch nicht abgelaufen'; end if;
 if jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'Ungültiges Ergebnis'; end if;
 if v_row.game='bulls-warm-up' then
   if coalesce(p_payload->>'doubleBull','') !~ '^[0-9]{1,6}$' or coalesce(p_payload->>'singleBull','') !~ '^[0-9]{1,6}$' then raise exception 'Ungültige Trefferzahlen'; end if;
   v_double := (p_payload->>'doubleBull')::integer; v_single := (p_payload->>'singleBull')::integer;
 elsif v_row.game='double-route' then
   v_route := p_payload->'route';
   if v_route is null or v_route not in ('[20,10,5]'::jsonb,'[16,8,4]'::jsonb,'[12,6,3]'::jsonb,'[4,2,1]'::jsonb) then raise exception 'Ungültiger Doppelweg'; end if;
   if jsonb_typeof(p_payload->'routeThrows') is distinct from 'array' then raise exception 'Würfe fehlen'; end if;
   if jsonb_array_length(p_payload->'routeThrows')>20000 then raise exception 'Zu viele Würfe'; end if;
   for v_entry in select value from jsonb_array_elements(p_payload->'routeThrows') loop
     v_target := (v_route->>(v_index%3))::integer;
     if jsonb_typeof(v_entry->'hit') is distinct from 'boolean' or coalesce(v_entry->>'target','')<>v_target::text then raise exception 'Würfe passen nicht zur Reihenfolge des Doppelwegs'; end if;
     v_throws := v_throws || jsonb_build_array(jsonb_build_object('target',v_target,'hit',v_entry->'hit'));
     v_index := v_index+1;
   end loop;
 else
   if jsonb_typeof(p_payload->'entries') is distinct from 'array' then raise exception 'Serien fehlen'; end if;
   if jsonb_array_length(p_payload->'entries')>20000 then raise exception 'Zu viele Serien'; end if;
   for v_entry in select value from jsonb_array_elements(p_payload->'entries') loop
     if coalesce(v_entry->>'points','') !~ '^[0-9]{1,5}$' then raise exception 'Ungültige Serienpunkte'; end if;
     v_points := (v_entry->>'points')::integer;
     if v_row.game='favorite-double' then
       if coalesce(v_entry->>'double','') !~ '^[0-9]{1,2}$' then raise exception 'Gespieltes Doppel fehlt'; end if;
       v_target := (v_entry->>'double')::integer;
       if v_target<1 or v_target>20 or v_points<1 or v_points>99999 then raise exception 'Ungültiges Doppel oder Punkte'; end if;
       if v_points%(2*v_target)<>0 then raise exception 'Punkte passen nicht zum Doppel'; end if;
       v_count := v_points/(2*v_target);
       v_entries := v_entries || jsonb_build_array(jsonb_build_object('points',v_points,'count',v_count,'double',v_target));
     else
       if coalesce(v_entry->>'count','') !~ '^[0-9]{1,2}$' then raise exception 'Ungültige Serienlänge'; end if;
       v_count := (v_entry->>'count')::integer;
       if v_count<1 or v_count>20 then raise exception 'Ungültige Serienlänge'; end if;
       if v_row.game='triple-20-19-18-combo' then
         if not private.valid_triple_training_combo(v_points,v_count) then raise exception 'Punkte sind mit 20,19,18 und mindestens einem Triple pro Aufnahme nicht möglich'; end if;
       elsif v_points<60*v_count or v_points>180*v_count then raise exception 'Ungültige Serienpunkte';
       end if;
       v_entries := v_entries || jsonb_build_array(jsonb_build_object('points',v_points,'count',v_count));
     end if;
   end loop;
 end if;
 v_payload := jsonb_build_object('game',v_row.game,'minutes',v_row.minutes,'doubleBull',v_double,'singleBull',v_single,'entries',v_entries);
 if v_row.game='double-route' then v_payload := v_payload || jsonb_build_object('route',v_route,'routeThrows',v_throws); end if;
 update public.custom_training_sessions set status='completed',payload=v_payload,coins=0,created_at=v_row.end_at where id=p_id returning * into v_row;
 return to_jsonb(v_row);
end;
$$;
