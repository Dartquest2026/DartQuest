begin;
do $$
declare
 u uuid; s uuid; m integer; before_coins bigint; after_coins bigint;
 spec jsonb; first_result jsonb; repeated_result jsonb; blocked boolean;
begin
 select id,coins into u,before_coins from public.profiles limit 1;
 if u is null then raise exception 'A test profile is required'; end if;
 perform set_config('request.jwt.claim.sub',u::text,true);
 foreach m in array array[5,10,15] loop
  for spec in select value from jsonb_array_elements('[{"game":"triple-20-19-18-combo","payload":{"entries":[{"points":97,"count":1},{"points":194,"count":2}]}},{"game":"favorite-double","payload":{"entries":[{"points":128,"double":16,"count":999}]}},{"game":"double-route","payload":{"route":[16,8,4],"routeThrows":[{"target":16,"hit":false},{"target":8,"hit":false},{"target":4,"hit":true}]}}]'::jsonb) loop
   s := gen_random_uuid();
   first_result := public.start_custom_training(s,spec->>'game',m);
   if extract(epoch from ((first_result->>'end_at')::timestamptz-(first_result->>'started_at')::timestamptz))<>m*60 then raise exception 'Wrong duration'; end if;
   blocked := false;
   begin perform public.complete_custom_training(s,spec->'payload'); exception when others then blocked := true; end;
   if not blocked then raise exception 'Premature completion accepted'; end if;
   update public.custom_training_sessions set end_at=now()-interval '1 second' where id=s;
   blocked := false;
   begin
    if spec->>'game'='triple-20-19-18-combo' then perform public.complete_custom_training(s,'{"entries":[{"points":97,"count":2}]}'::jsonb);
    elsif spec->>'game'='favorite-double' then perform public.complete_custom_training(s,'{"entries":[{"points":65,"double":16}]}'::jsonb);
    else perform public.complete_custom_training(s,'{"route":[16,8,4],"routeThrows":[{"target":4,"hit":true}]}'::jsonb);
    end if;
   exception when others then blocked := true; end;
   if not blocked then raise exception 'Invalid result accepted'; end if;
   first_result := public.complete_custom_training(s,spec->'payload');
   repeated_result := public.complete_custom_training(s,'{}'::jsonb);
   if first_result is distinct from repeated_result then raise exception 'Repeated completion changed result'; end if;
   if spec->>'game'='favorite-double' and (first_result->'payload'->'entries'->0->>'count')::int<>4 then raise exception 'Favorite double must derive four hits'; end if;
   if spec->>'game'='double-route' and first_result->'payload'->'routeThrows' is distinct from spec->'payload'->'routeThrows' then raise exception 'Route result lost throws'; end if;
  end loop;
 end loop;
 select coins into after_coins from public.profiles where id=u;
 if before_coins is distinct from after_coins then raise exception 'Training changed coins'; end if;
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 blocked := false;
 begin perform public.complete_custom_training(s,'{}'::jsonb); exception when others then blocked := true; end;
 if not blocked then raise exception 'Cross-user completion accepted'; end if;
end $$;
select 'PASS: three games, all durations, input validation, derived favorite hits, route persistence, idempotence, no rewards, owner isolation' as result;
rollback;
