begin;
do $$
declare
 u uuid; s uuid := gen_random_uuid(); before_coins bigint; after_coins bigint;
 first_result jsonb; second_result jsonb; blocked boolean := false;
begin
 select id,coins into u,before_coins from public.profiles limit 1;
 if u is null then raise exception 'A test profile is required'; end if;
 perform set_config('request.jwt.claim.sub',u::text,true);
 perform public.start_custom_training(s,'t20-combo',5);
 begin perform public.complete_custom_training(s,'{"entries":[{"points":285,"count":3}]}'::jsonb);
 exception when others then blocked := true; end;
 if not blocked then raise exception 'Premature completion accepted'; end if;
 update public.custom_training_sessions set end_at=now()-interval '1 second' where id=s;
 first_result := public.complete_custom_training(s,'{"entries":[{"points":285,"count":3}]}'::jsonb);
 second_result := public.complete_custom_training(s,'{"entries":[{"points":600,"count":4}]}'::jsonb);
 if first_result is distinct from second_result then raise exception 'Repeated completion changed result'; end if;
 select coins into after_coins from public.profiles where id=u;
 if before_coins is distinct from after_coins then raise exception 'Training changed coins'; end if;
 if (first_result->'payload'->'entries'->0->>'points')::int<>285 then raise exception 'Wrong score'; end if;
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 blocked := false;
 begin perform public.complete_custom_training(s,'{}'::jsonb);
 exception when others then blocked := true; end;
 if not blocked then raise exception 'Cross-user completion accepted'; end if;
end $$;
select 'PASS: deadlines, persistence, duplicate prevention, unchanged coins, owner isolation' as result;
rollback;
