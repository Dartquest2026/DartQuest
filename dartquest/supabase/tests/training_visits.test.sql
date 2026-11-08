begin;
do $$
declare uid uuid; sid uuid; r jsonb; p jsonb; game text;
begin
 select id into uid from public.profiles limit 1;
 if uid is null then raise exception 'Test requires an existing profile'; end if;
 perform set_config('request.jwt.claim.sub',uid::text,true);
 perform set_config('request.jwt.claim.role','authenticated',true);
 sid:=gen_random_uuid();
 insert into public.custom_training_sessions(id,user_id,game,minutes,started_at,end_at) values(sid,uid,'bulls-warm-up',15,now()-interval '20 minutes',now()-interval '5 minutes');
 p:='{"game":"bulls-warm-up","singleBull":1,"doubleBull":1,"visitVersion":1,"visits":[{"singleBull":1,"doubleBull":1},{"singleBull":0,"doubleBull":0}],"pausedMs":10000}'::jsonb;
 r:=public.complete_custom_training(sid,p);
 if r->'payload'->'visits' is distinct from p->'visits' or r->'payload'->'visitVersion'<>'1'::jsonb then raise exception 'Visits were not persisted'; end if;
 if r is distinct from public.complete_custom_training(sid,p) then raise exception 'Completion is not idempotent'; end if;
 begin
  perform private.validated_training_visits('bulls-warm-up',p||'{"singleBull":8}'::jsonb);
  raise exception 'Accepted inconsistent bulls';
 exception when others then if sqlerrm='Accepted inconsistent bulls' then raise; end if; end;
 p:='{"visitVersion":1,"entries":[{"count":3,"points":300}],"visits":[{"successful":3,"failed":1}]}'::jsonb;
 if private.validated_training_visits('t20-combo',p) is distinct from p->'visits' then raise exception 'Combo failed'; end if;
 p:='{"visitVersion":1,"entries":[{"count":9,"points":288,"double":16}],"visits":[{"successful":3,"failed":1}]}'::jsonb;
 if private.validated_training_visits('favorite-double',p) is distinct from p->'visits' then raise exception 'Nine doubles failed'; end if;
 p:='{"visitVersion":1,"route":[16,8,4],"visits":[{"hits":[16]}],"routeThrows":[{"target":16,"hit":true},{"target":8,"hit":false},{"target":4,"hit":false}]}'::jsonb;
 if private.validated_training_visits('double-route',p) is distinct from p->'visits' then raise exception 'Route failed'; end if;
 begin
  perform private.validated_training_visits('double-route',p||'{"visits":[{"hits":[16,16]}]}'::jsonb);
  raise exception 'Accepted duplicate targets';
 exception when others then if sqlerrm='Accepted duplicate targets' then raise; end if; end;
 for game in select unnest(array['t20-combo','triple-20-19-18-combo','favorite-double','double-route']) loop
  sid:=gen_random_uuid();
  insert into public.custom_training_sessions(id,user_id,game,minutes,started_at,end_at) values(sid,uid,game,15,now()-interval '20 minutes',now()-interval '5 minutes');
  p:=case game
   when 't20-combo' then '{"entries":[{"count":3,"points":300}],"visits":[{"successful":3,"failed":1}]}'::jsonb
   when 'triple-20-19-18-combo' then '{"entries":[{"count":2,"points":194}],"visits":[{"successful":2,"failed":1}]}'::jsonb
   when 'favorite-double' then '{"entries":[{"count":9,"points":288,"double":16}],"visits":[{"successful":3,"failed":1}]}'::jsonb
   else '{"route":[16,8,4],"visits":[{"hits":[16]}],"routeThrows":[{"target":16,"hit":true},{"target":8,"hit":false},{"target":4,"hit":false}]}'::jsonb end;
  p:=p||'{"visitVersion":1,"pausedMs":0}'::jsonb;
  r:=public.complete_custom_training(sid,p);
  if r->'payload'->'visits' is distinct from p->'visits' or (r->>'coins')::integer<>0 then raise exception 'Visit roundtrip failed: %',game; end if;
 end loop;
 if private.validated_training_visits('bulls-warm-up','{"singleBull":99}'::jsonb) is not null then raise exception 'Legacy history was fabricated'; end if;
 sid:=gen_random_uuid();
 insert into public.custom_training_sessions(id,user_id,game,minutes,started_at,end_at) values(sid,uid,'favorite-double',15,now()-interval '20 minutes',now()-interval '5 minutes');
 r:=public.complete_custom_training(sid,'{"favoriteDouble":20,"entries":[],"visitVersion":1,"visits":[{"successful":0,"failed":1}],"pausedMs":0}'::jsonb);
 if r->'payload'->'favoriteDouble' is distinct from '20'::jsonb then raise exception 'Target missing for zero-hit session'; end if;
 sid:=gen_random_uuid();
 insert into public.custom_training_sessions(id,user_id,game,minutes,started_at,end_at) values(sid,uid,'around-the-clock',0,clock_timestamp()-interval '20 seconds',clock_timestamp()-interval '20 seconds');
 r:=public.complete_custom_training(sid,'{"includeBull":false,"misses":1,"completed":true,"pausedMs":10000,"visitVersion":1,"visits":[]}'::jsonb);
 if (r->'payload'->>'elapsedMs')::bigint not between 9500 and 11500 then raise exception 'Pause was not subtracted from stopwatch'; end if;
 if has_function_privilege('anon','public.complete_custom_training(uuid,jsonb)','execute') then raise exception 'Anonymous completion allowed'; end if;
 if has_function_privilege('authenticated','private.validated_training_visits(text,jsonb)','execute') then raise exception 'Private validator exposed'; end if;
end $$;
rollback;
