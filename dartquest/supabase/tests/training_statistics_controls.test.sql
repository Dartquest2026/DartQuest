begin;
create temporary table qa_training_fixture as select
 (select id from auth.users order by id limit 1) as a,
 (select id from auth.users order by id offset 1 limit 1) as b,
 gen_random_uuid() as own_bull,gen_random_uuid() as own_combo,gen_random_uuid() as friend_bull,gen_random_uuid() as active_bull,gen_random_uuid() as standard_201,gen_random_uuid() as standard_bull;
grant select on qa_training_fixture to authenticated;
create temporary table qa_training_profile_before as select p.id,p.xp,p.coins from public.profiles p where p.id=(select a from qa_training_fixture);
grant select on qa_training_profile_before to authenticated;
insert into public.custom_training_sessions(id,user_id,game,minutes,started_at,end_at,created_at,status,payload,coins)
 select own_bull,a,'bulls-warm-up',15,now()-interval '16 minutes',now()-interval '1 minute',now()-interval '1 minute','completed','{"game":"bulls-warm-up","singleBull":33,"doubleBull":15}'::jsonb,0 from qa_training_fixture union all
 select own_combo,a,'t20-combo',15,now()-interval '16 minutes',now()-interval '1 minute',now()-interval '1 minute','completed','{"game":"t20-combo","entries":[]}'::jsonb,0 from qa_training_fixture union all
 select friend_bull,b,'bulls-warm-up',15,now()-interval '16 minutes',now()-interval '1 minute',now()-interval '1 minute','completed','{"game":"bulls-warm-up","singleBull":21,"doubleBull":12}'::jsonb,0 from qa_training_fixture union all
 select active_bull,a,'bulls-warm-up',15,now(),now()+interval '15 minutes',now(),'active','{}'::jsonb,0 from qa_training_fixture;
insert into public.friendships(user_id_a,user_id_b) select least(a,b),greatest(a,b) from qa_training_fixture on conflict do nothing;
insert into public.training_friend_sharing(user_id,game,enabled) select b,'bulls-warm-up',false from qa_training_fixture on conflict(user_id,game) do update set enabled=false;
select set_config('request.jwt.claim.sub',(select a::text from qa_training_fixture),true);
set local role authenticated;
do $$ declare f record; v jsonb; failed boolean; begin
 select * into f from qa_training_fixture;
 if exists(select 1 from public.custom_training_sessions where user_id=f.b) then raise exception 'Friend sessions exposed by RLS'; end if;
 v:=public.get_friend_training_history(f.b,'bulls-warm-up');
 if v->'sharing'<>'false'::jsonb or jsonb_array_length(v->'rows')<>0 then raise exception 'Private training exposed'; end if;
 failed:=false;begin perform public.get_friend_training_history(gen_random_uuid(),'bulls-warm-up');exception when others then failed:=true;end;
 if not failed then raise exception 'Stranger access allowed';end if;
 failed:=false;begin insert into public.training_friend_sharing(user_id,game,enabled) values(f.b,'t20-combo',true);exception when insufficient_privilege then failed:=true;end;
 if not failed then raise exception 'Could change friend sharing';end if;
 perform set_config('request.jwt.claim.sub',f.b::text,true);
 update public.training_friend_sharing set enabled=true where user_id=f.b and game='bulls-warm-up';
 perform set_config('request.jwt.claim.sub',f.a::text,true);
 v:=public.get_friend_training_history(f.b,'bulls-warm-up');
 if v->'sharing'<>'true'::jsonb or not exists(select 1 from jsonb_array_elements(v->'rows') r where r->>'id'=f.friend_bull::text) then raise exception 'Shared friend comparison missing';end if;
 if exists(select 1 from jsonb_array_elements(v->'rows') r where r ? 'user_id' or r ? 'coins') then raise exception 'Excess friend fields exposed';end if;
 perform public.reset_training_statistics('custom','bulls-warm-up');
 if exists(select 1 from public.custom_training_sessions where user_id=f.a and game='bulls-warm-up' and status='completed') then raise exception 'Own results survived reset';end if;
 if not exists(select 1 from public.custom_training_sessions where id=f.own_combo) or not exists(select 1 from public.custom_training_sessions where id=f.active_bull) then raise exception 'Other game or active training deleted';end if;
 if not exists(select 1 from jsonb_array_elements(public.get_friend_training_history(f.b,'bulls-warm-up')->'rows') r where r->>'id'=f.friend_bull::text) then raise exception 'Friend result deleted';end if;
 if not exists(select 1 from public.training_stat_resets where user_id=f.a and category='custom' and game='bulls-warm-up') then raise exception 'Reset marker missing';end if;
 insert into public.training_sessions(id,user_id,mode,plan,player_results,total_score,max_score,percentage) values(f.standard_201,f.a,'solo','[{"id":"201"}]','[{}]',0,0,0),(f.standard_bull,f.a,'solo','[{"id":"bull-finisher"}]','[{}]',0,0,0);
 insert into public.training_sessions(id,user_id,mode,plan,player_results,total_score,max_score,percentage) values(f.standard_201,f.a,'solo','[{"id":"201"}]','[{}]',1,1,100) on conflict(id) do update set total_score=excluded.total_score;
 perform public.reset_training_statistics('standard','201');
 if exists(select 1 from public.training_sessions where id=f.standard_201) or not exists(select 1 from public.training_sessions where id=f.standard_bull) then raise exception 'Standard reset scope wrong';end if;
 if exists(select 1 from public.profiles p join qa_training_profile_before q using(id) where p.xp is distinct from q.xp or p.coins is distinct from q.coins) then raise exception 'Profile XP or balance changed';end if;
 perform set_config('request.jwt.claim.sub',f.b::text,true);
 update public.training_friend_sharing set enabled=false where user_id=f.b and game='bulls-warm-up';
 perform set_config('request.jwt.claim.sub',f.a::text,true);
 if public.get_friend_training_history(f.b,'bulls-warm-up')->'sharing'<>'false'::jsonb then raise exception 'Sharing revocation ineffective';end if;
end $$;
reset role;
select 'Reset scope, profile separation, RLS, friend opt-in and revocation passed; all changes rolled back.' as result;
rollback;
