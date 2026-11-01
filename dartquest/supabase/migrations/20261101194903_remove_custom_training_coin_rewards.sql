create or replace function private.complete_custom_training(p_id uuid, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
 v_user uuid := auth.uid(); v_row public.custom_training_sessions;
 v_double integer := 0; v_single integer := 0;
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
 update public.custom_training_sessions set status='completed',payload=v_payload,coins=0,created_at=v_row.end_at where id=p_id returning * into v_row;
 return to_jsonb(v_row);
end;
$$;

drop table private.custom_training_reward_config;
