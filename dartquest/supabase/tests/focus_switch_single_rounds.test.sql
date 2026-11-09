begin;
do $test$
declare uid uuid; sid uuid; p jsonb; r jsonb;
begin
 select id into uid from public.profiles limit 1;
 perform set_config('request.jwt.claim.sub',uid::text,true);
 sid:=gen_random_uuid();
 insert into public.custom_training_sessions(id,user_id,game,minutes,started_at,end_at) values(sid,uid,'focus-switch',15,now()-interval '20 minutes',now()-interval '5 minutes');
 p:='{"focusSize":3,"focusAttempts":[{"kind":"single","fields":["S10","S20","S17"],"rest":47,"hits":3},{"kind":"checkout","fields":["T20","S20","D20"],"rest":120,"hits":1}],"pausedMs":0}'::jsonb;
 begin perform public.complete_custom_training(sid,jsonb_set(p,'{focusAttempts,0,fields,2}','"T17"'::jsonb));raise exception 'Accepted triple in single round';exception when others then if sqlerrm='Accepted triple in single round' then raise;end if;end;
 begin perform public.complete_custom_training(sid,jsonb_set(p,'{focusAttempts,0,kind}','"unknown"'::jsonb));raise exception 'Accepted unknown kind';exception when others then if sqlerrm='Accepted unknown kind' then raise;end if;end;
 begin perform public.complete_custom_training(sid,jsonb_set(p,'{focusAttempts,0,fields,2}','"S10"'::jsonb));raise exception 'Accepted duplicate single';exception when others then if sqlerrm='Accepted duplicate single' then raise;end if;end;
 r:=public.complete_custom_training(sid,p);
 if r->'payload'->'focusAttempts' is distinct from p->'focusAttempts' then raise exception 'Task kinds lost';end if;
 if r->'payload'->'visits' is distinct from '[{"successful":1,"failed":0},{"successful":0,"failed":1}]'::jsonb then raise exception 'Visit totals wrong';end if;
 if r is distinct from public.complete_custom_training(sid,p) then raise exception 'Non-idempotent';end if;
end $test$;
rollback;
