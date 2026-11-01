begin;
do $$
declare u uuid; s uuid; bull boolean; first_result jsonb; repeat_result jsonb; blocked boolean; before_coins bigint; after_coins bigint;
begin
 select id,coins into u,before_coins from public.profiles limit 1;
 if u is null then raise exception 'A test profile is required'; end if;
 perform set_config('request.jwt.claim.sub',u::text,true);
 foreach bull in array array[false,true] loop
  s := gen_random_uuid();
  first_result := public.start_custom_training(s,'around-the-clock',0);
  if (first_result->>'minutes')::int<>0 then raise exception 'Unexpected duration'; end if;
  blocked := false;
  begin perform public.complete_custom_training(s,jsonb_build_object('includeBull',bull,'misses',3,'completed',false)); exception when others then blocked:=true; end;
  if not blocked then raise exception 'Unfinished game was accepted'; end if;
  blocked := false;
  begin perform public.complete_custom_training(s,jsonb_build_object('includeBull',bull,'misses',-1,'completed',true)); exception when others then blocked:=true; end;
  if not blocked then raise exception 'Negative miss count accepted'; end if;
  update public.custom_training_sessions set started_at=clock_timestamp()-interval '5 minutes' where id=s;
  first_result := public.complete_custom_training(s,jsonb_build_object('includeBull',bull,'misses',3,'completed',true,'elapsedMs',1));
  if first_result->'payload'->'includeBull' is distinct from to_jsonb(bull) or (first_result->'payload'->>'misses')::int<>3 then raise exception 'Wrong stored variant or misses'; end if;
  if (first_result->'payload'->>'elapsedMs')::bigint not between 299000 and 301000 then raise exception 'Stopwatch did not use server start time'; end if;
  repeat_result := public.complete_custom_training(s,jsonb_build_object('includeBull',not bull,'misses',999,'completed',true));
  if first_result is distinct from repeat_result then raise exception 'Repeated completion changed the result'; end if;
 end loop;
 blocked := false;
 begin perform public.start_custom_training(gen_random_uuid(),'around-the-clock',5); exception when others then blocked:=true; end;
 if not blocked then raise exception 'Around the Clock accepted a countdown duration'; end if;
 blocked := false;
 begin perform public.start_custom_training(gen_random_uuid(),'t20-combo',0); exception when others then blocked:=true; end;
 if not blocked then raise exception 'Timed training lost duration validation'; end if;
 select coins into after_coins from public.profiles where id=u;
 if before_coins is distinct from after_coins then raise exception 'Training changed coins'; end if;
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 blocked := false;
 begin perform public.complete_custom_training(s,'{}'::jsonb); exception when others then blocked:=true; end;
 if not blocked then raise exception 'Cross-user completion accepted'; end if;
end $$;
select 'PASS: both Bull variants, no countdown, manual finish, server stopwatch, validation, immutable results, no rewards, owner isolation' as result;
rollback;
