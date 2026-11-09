begin;
do $$
declare uid uuid; sid uuid; r jsonb; p jsonb; n integer;
begin
 select id into uid from public.profiles limit 1;
 if uid is null then raise exception 'Test requires an existing profile'; end if;
 perform set_config('request.jwt.claim.sub',uid::text,true);
 perform set_config('request.jwt.claim.role','authenticated',true);
 for n in 2..3 loop
  sid:=gen_random_uuid();perform public.start_custom_training(sid,'focus-switch',15);
  p:=jsonb_build_object('focusSize',n,'focusAttempts',case when n=2 then '[{"fields":["T10","D16"],"rest":62,"hits":2},{"fields":["S20","DB"],"rest":70,"hits":1}]'::jsonb else '[{"fields":["T20","S20","D20"],"rest":120,"hits":3},{"fields":["SB","T1","D1"],"rest":30,"hits":0}]'::jsonb end,'pausedMs',0);
  begin perform public.complete_custom_training(sid,p);raise exception 'Accepted early finish';exception when others then if sqlerrm='Accepted early finish' then raise;end if;end;
  update public.custom_training_sessions set started_at=now()-interval '20 minutes',end_at=now()-interval '5 minutes' where id=sid;
  begin perform public.complete_custom_training(sid,jsonb_set(p,'{focusAttempts,0,rest}','999'::jsonb));raise exception 'Accepted wrong total';exception when others then if sqlerrm='Accepted wrong total' then raise;end if;end;
  begin perform public.complete_custom_training(sid,jsonb_set(p,'{focusAttempts,0,hits}','4'::jsonb));raise exception 'Accepted too many hits';exception when others then if sqlerrm='Accepted too many hits' then raise;end if;end;
  begin perform public.complete_custom_training(sid,jsonb_set(p,array['focusAttempts','0','fields',(n-1)::text],'"S20"'::jsonb));raise exception 'Accepted single finish';exception when others then if sqlerrm='Accepted single finish' then raise;end if;end;
  r:=public.complete_custom_training(sid,p);
  if r->'payload'->'focusAttempts' is distinct from p->'focusAttempts' or r->'payload'->'visits' is distinct from '[{"successful":1,"failed":0},{"successful":0,"failed":1}]'::jsonb then raise exception 'Focus roundtrip failed';end if;
  if (r->>'coins')::integer<>0 then raise exception 'Unexpected reward';end if;
  if r is distinct from public.complete_custom_training(sid,p) then raise exception 'Completion not idempotent';end if;
 end loop;
 insert into public.training_friend_sharing(user_id,game,enabled) values(uid,'focus-switch',false) on conflict(user_id,game) do update set enabled=false;
 perform public.reset_training_statistics('custom','focus-switch');
 if exists(select 1 from public.custom_training_sessions where user_id=uid and game='focus-switch' and status='completed') then raise exception 'Reset failed';end if;
 if has_function_privilege('anon','public.complete_custom_training(uuid,jsonb)','execute') then raise exception 'Anonymous completion exposed';end if;
end $$;
rollback;
