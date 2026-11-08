-- New metadata is opt-in. Existing results remain unchanged.
create or replace function private.validated_training_visits(p_game text,p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 v jsonb; e jsonb; result jsonb := '[]'::jsonb; expected_throws jsonb := '[]'::jsonb;
 n integer; d integer; s integer; successes integer; failures integer; entry_index integer := 0;
 total_single integer := 0; total_double integer := 0; target integer; hits jsonb;
begin
 if p_payload->'visitVersion' is distinct from '1'::jsonb then return null; end if;
 if jsonb_typeof(p_payload->'visits') is distinct from 'array' or jsonb_array_length(p_payload->'visits')>20000 then raise exception 'Ungültige Aufnahmen'; end if;
 for v in select value from jsonb_array_elements(p_payload->'visits') loop
  if jsonb_typeof(v) is distinct from 'object' then raise exception 'Ungültige Aufnahme'; end if;
  if p_game='bulls-warm-up' then
   if coalesce(v->>'singleBull','') !~ '^[0-3]$' or coalesce(v->>'doubleBull','') !~ '^[0-3]$' then raise exception 'Ungültige Bull-Aufnahme'; end if;
   s:=(v->>'singleBull')::integer; d:=(v->>'doubleBull')::integer;
   if s+d>3 then raise exception 'Maximal drei Pfeile je Aufnahme'; end if;
   total_single:=total_single+s; total_double:=total_double+d;
   result:=result||jsonb_build_array(jsonb_build_object('singleBull',s,'doubleBull',d));
  elsif p_game='double-route' then
   hits:=v->'hits';
   if jsonb_typeof(hits) is distinct from 'array' or jsonb_array_length(hits)>3 then raise exception 'Ungültige Doppelweg-Aufnahme'; end if;
   if (select count(distinct value) from jsonb_array_elements(hits))<>jsonb_array_length(hits) then raise exception 'Doppelter Treffer je Ziel'; end if;
   for e in select value from jsonb_array_elements(hits) loop
    if not (p_payload->'route' @> jsonb_build_array(e)) then raise exception 'Treffer außerhalb des Doppelwegs'; end if;
   end loop;
   for target in select value::text::integer from jsonb_array_elements(p_payload->'route') loop
    expected_throws:=expected_throws||jsonb_build_array(jsonb_build_object('target',target,'hit',hits @> jsonb_build_array(target)));
   end loop;
   result:=result||jsonb_build_array(jsonb_build_object('hits',hits));
  elsif p_game in ('t20-combo','triple-20-19-18-combo','favorite-double') then
   if coalesce(v->>'successful','') !~ '^[0-9]{1,5}$' or coalesce(v->>'failed','') !~ '^[01]$' then raise exception 'Ungültige Aufnahmezahl'; end if;
   successes:=(v->>'successful')::integer; failures:=(v->>'failed')::integer;
   if successes=0 then
    if failures<>1 then raise exception 'Leere Aufnahme'; end if;
   else
    e:=p_payload->'entries'->entry_index;
    if e is null then raise exception 'Serie zur Aufnahme fehlt'; end if;
    n:=(e->>'count')::integer;
    if p_game='favorite-double' then
     if successes<>(n+2)/3 or (failures=1 and n%3<>0) then raise exception 'Aufnahmen passen nicht zu den Doppeltreffern'; end if;
    elsif successes<>n then raise exception 'Aufnahmen passen nicht zur Combo'; end if;
    entry_index:=entry_index+1;
   end if;
   result:=result||jsonb_build_array(jsonb_build_object('successful',successes,'failed',failures));
  else raise exception 'Keine Aufnahmen für diesen Modus';
  end if;
 end loop;
 if p_game='bulls-warm-up' and (total_single<>(p_payload->>'singleBull')::integer or total_double<>(p_payload->>'doubleBull')::integer) then raise exception 'Bull-Aufnahmen stimmen nicht mit Treffern überein'; end if;
 if p_game='double-route' and expected_throws is distinct from p_payload->'routeThrows' then raise exception 'Aufnahmen stimmen nicht mit Doppelweg überein'; end if;
 if p_game in ('t20-combo','triple-20-19-18-combo','favorite-double') and entry_index<>jsonb_array_length(p_payload->'entries') then raise exception 'Aufnahmen zu Serien fehlen'; end if;
 return result;
end;
$$;
revoke all on function private.validated_training_visits(text,jsonb) from public,anon,authenticated;

create or replace function private.complete_custom_training(p_id uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
 v_user uuid := auth.uid(); v_row public.custom_training_sessions;
 v_double integer := 0; v_single integer := 0;
 v_entry jsonb; v_points integer; v_count integer; v_target integer;
 v_entries jsonb := '[]'::jsonb; v_throws jsonb := '[]'::jsonb;
 v_route jsonb; v_payload jsonb; v_index integer := 0; v_finished timestamptz := clock_timestamp();
 v_visits jsonb; v_paused bigint := 0; v_wall bigint;
begin
 if v_user is null then raise exception 'Anmeldung erforderlich'; end if;
 select * into v_row from public.custom_training_sessions where id=p_id and user_id=v_user for update;
 if not found then raise exception 'Training nicht verfügbar'; end if;
 if v_row.status='completed' then return to_jsonb(v_row); end if;
 v_wall:=greatest(0,floor(extract(epoch from (v_finished-v_row.started_at))*1000)::bigint);
 if p_payload ? 'pausedMs' then
  if coalesce(p_payload->>'pausedMs','') !~ '^[0-9]{1,13}$' then raise exception 'Ungültige Pausendauer'; end if;
  v_paused:=(p_payload->>'pausedMs')::bigint;
  if v_paused>v_wall then raise exception 'Pause überschreitet Trainingsdauer'; end if;
 end if;
 if v_row.game='around-the-clock' then
   if jsonb_typeof(p_payload) is distinct from 'object'
     or jsonb_typeof(p_payload->'includeBull') is distinct from 'boolean'
     or p_payload->'completed' is distinct from 'true'::jsonb
     or coalesce(p_payload->>'misses','') !~ '^[0-9]{1,6}$'
   then raise exception 'Ungültiges Around-the-Clock-Ergebnis'; end if;
   v_payload := jsonb_build_object('game',v_row.game,'minutes',0,'includeBull',(p_payload->>'includeBull')::boolean,'misses',(p_payload->>'misses')::integer,'completed',true,'elapsedMs',greatest(0,v_wall-v_paused));
   if p_payload->'visitVersion'='1'::jsonb then v_payload:=v_payload||jsonb_build_object('visitVersion',1,'visits','[]'::jsonb,'pausedMs',v_paused); end if;
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
 v_visits:=private.validated_training_visits(v_row.game,p_payload);
 v_payload := jsonb_build_object('game',v_row.game,'minutes',v_row.minutes,'doubleBull',v_double,'singleBull',v_single,'entries',v_entries);
 if v_row.game='double-route' then v_payload := v_payload || jsonb_build_object('route',v_route,'routeThrows',v_throws); end if;
 if v_visits is not null then v_payload:=v_payload||jsonb_build_object('visitVersion',1,'visits',v_visits,'pausedMs',v_paused); end if;
 update public.custom_training_sessions set status='completed',payload=v_payload,coins=0,created_at=case when v_visits is not null then v_finished else v_row.end_at end where id=p_id returning * into v_row;
 return to_jsonb(v_row);
end;
$$;
