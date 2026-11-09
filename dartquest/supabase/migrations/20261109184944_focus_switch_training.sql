-- Extend existing training storage and its existing ownership/friendship checks.
alter table public.custom_training_sessions drop constraint custom_training_sessions_game_check;
alter table public.custom_training_sessions add constraint custom_training_sessions_game_check check(game in ('bulls-warm-up','t20-combo','triple-20-19-18-combo','favorite-double','double-route','around-the-clock','focus-switch'));
alter table public.training_friend_sharing drop constraint training_friend_sharing_game_check;
alter table public.training_friend_sharing add constraint training_friend_sharing_game_check check(game in ('bulls-warm-up','t20-combo','triple-20-19-18-combo','favorite-double','double-route','around-the-clock','focus-switch'));

CREATE OR REPLACE FUNCTION private.reset_training_statistics(p_category text, p_game text)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_user uuid:=auth.uid(); v_reset timestamptz:=clock_timestamp();
begin
 if v_user is null then raise exception 'Anmeldung erforderlich'; end if;
 if p_category='custom' and p_game in ('bulls-warm-up','t20-combo','triple-20-19-18-combo','favorite-double','double-route','around-the-clock','focus-switch') then
  delete from public.custom_training_sessions where user_id=v_user and game=p_game and status='completed';
 elsif p_category='standard' and p_game in ('201','bull-finisher','random-checkouts') then
  delete from public.training_sessions where user_id=v_user and plan->0->>'id'=p_game;
 else raise exception 'Ungültige Trainingsstatistik'; end if;
 insert into public.training_stat_resets(user_id,category,game,reset_at) values(v_user,p_category,p_game,v_reset)
 on conflict(user_id,category,game) do update set reset_at=excluded.reset_at;
 return v_reset;
end; $function$;

CREATE OR REPLACE FUNCTION private.start_custom_training(p_id uuid, p_game text, p_minutes integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_user uuid := auth.uid(); v_row public.custom_training_sessions;
begin
 if v_user is null then raise exception 'Anmeldung erforderlich'; end if;
 if p_game not in ('bulls-warm-up','t20-combo','triple-20-19-18-combo','favorite-double','double-route','around-the-clock','focus-switch') or (p_game='around-the-clock' and p_minutes<>0) or (p_game<>'around-the-clock' and p_minutes not in (5,10,15)) or p_id is null then raise exception 'Ungültiges Training'; end if;
 insert into public.custom_training_sessions(id,user_id,game,minutes,end_at) values(p_id,v_user,p_game,p_minutes,now()+make_interval(mins=>p_minutes)) on conflict(id) do nothing;
 select * into v_row from public.custom_training_sessions where id=p_id and user_id=v_user;
 if not found or v_row.game<>p_game or v_row.minutes<>p_minutes then raise exception 'Training nicht verfügbar'; end if;
 return to_jsonb(v_row);
end;
$function$;

CREATE OR REPLACE FUNCTION private.complete_custom_training(p_id uuid, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_user uuid := auth.uid(); v_row public.custom_training_sessions;
 v_double integer := 0; v_single integer := 0;
 v_entry jsonb; v_points integer; v_count integer; v_target integer;
 v_entries jsonb := '[]'::jsonb; v_throws jsonb := '[]'::jsonb;
 v_route jsonb; v_payload jsonb; v_index integer := 0; v_finished timestamptz := clock_timestamp();
 v_size integer; v_rest integer; v_field jsonb; v_label text;
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

 if v_row.game='focus-switch' then
  if p_payload->'focusSize' not in ('2'::jsonb,'3'::jsonb) or p_payload->'focusSize' is null then raise exception 'Ungültige Fokuswechsel-Variante'; end if;
  v_size:=(p_payload->>'focusSize')::integer;
  if jsonb_typeof(p_payload->'focusAttempts') is distinct from 'array' then raise exception 'Aufgaben fehlen'; end if;
  if jsonb_array_length(p_payload->'focusAttempts')>20000 then raise exception 'Zu viele Aufgaben'; end if;
  v_visits:='[]'::jsonb;
  for v_entry in select value from jsonb_array_elements(p_payload->'focusAttempts') loop
   if jsonb_typeof(v_entry->'fields') is distinct from 'array' then raise exception 'Zielfelder fehlen'; end if;
   if jsonb_array_length(v_entry->'fields')<>v_size then raise exception 'Falsche Anzahl Zielfelder'; end if;
   if jsonb_typeof(v_entry->'hits') is distinct from 'number' or coalesce(v_entry->>'hits','') !~ '^[0-3]$' then raise exception 'Ungültige Trefferzahl'; end if;
   v_count:=(v_entry->>'hits')::integer;
   if v_count>v_size then raise exception 'Zu viele Treffer'; end if;
   v_rest:=0;v_index:=0;
   for v_field in select value from jsonb_array_elements(v_entry->'fields') loop
    if jsonb_typeof(v_field) is distinct from 'string' then raise exception 'Ungültiges Zielfeld'; end if;
    v_label:=v_field#>>'{}';
    if v_label='SB' then v_points:=25;
    elsif v_label='DB' then v_points:=50;
    elsif v_label~'^[SDT]([1-9]|1[0-9]|20)$' then
     v_points:=substring(v_label from 2)::integer * case left(v_label,1) when 'S' then 1 when 'D' then 2 else 3 end;
    else raise exception 'Ungültiges Zielfeld'; end if;
    if v_index=v_size-1 and v_label!~'^D([1-9]|1[0-9]|20|B)$' then raise exception 'Letztes Feld muss ein Doppel sein'; end if;
    v_rest:=v_rest+v_points;v_index:=v_index+1;
   end loop;
   if v_entry->'rest' is distinct from to_jsonb(v_rest) then raise exception 'Rest passt nicht zu den Zielfeldern'; end if;
   v_entries:=v_entries||jsonb_build_array(jsonb_build_object('fields',v_entry->'fields','rest',v_rest,'hits',v_count));
   v_visits:=v_visits||jsonb_build_array(jsonb_build_object('successful',case when v_count=v_size then 1 else 0 end,'failed',case when v_count=v_size then 0 else 1 end));
  end loop;
  v_payload:=jsonb_build_object('game',v_row.game,'minutes',v_row.minutes,'focusSize',v_size,'focusAttempts',v_entries,'visitVersion',1,'visits',v_visits,'pausedMs',v_paused);
  update public.custom_training_sessions set status='completed',payload=v_payload,coins=0,created_at=v_finished where id=p_id returning * into v_row;
  return to_jsonb(v_row);
 end if;

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
 if v_row.game='favorite-double' and p_payload ? 'favoriteDouble' then
  if coalesce(p_payload->>'favoriteDouble','') !~ '^[0-9]{1,2}$' then raise exception 'Ungültiges Favoriten-Doppel'; end if;
  if (p_payload->>'favoriteDouble')::integer not between 1 and 20 then raise exception 'Ungültiges Favoriten-Doppel'; end if;
 end if;
 v_visits:=private.validated_training_visits(v_row.game,p_payload);
 v_payload := jsonb_build_object('game',v_row.game,'minutes',v_row.minutes,'doubleBull',v_double,'singleBull',v_single,'entries',v_entries);
 if v_row.game='favorite-double' and p_payload ? 'favoriteDouble' then v_payload:=v_payload||jsonb_build_object('favoriteDouble',(p_payload->>'favoriteDouble')::integer); end if;
 if v_row.game='double-route' then v_payload := v_payload || jsonb_build_object('route',v_route,'routeThrows',v_throws); end if;
 if v_visits is not null then v_payload:=v_payload||jsonb_build_object('visitVersion',1,'visits',v_visits,'pausedMs',v_paused); end if;
 update public.custom_training_sessions set status='completed',payload=v_payload,coins=0,created_at=case when v_visits is not null then v_finished else v_row.end_at end where id=p_id returning * into v_row;
 return to_jsonb(v_row);
end;
$function$;
