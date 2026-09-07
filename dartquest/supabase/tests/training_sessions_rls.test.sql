begin;

select plan(5);

select has_table('public', 'training_sessions', 'training_sessions exists');
select tests.rls_enabled('public', 'training_sessions');

select tests.create_supabase_user('training_owner');
select tests.create_supabase_user('training_other');
select tests.authenticate_as('training_owner');

insert into public.training_sessions (id, user_id, mode, plan, player_results, total_score, max_score, percentage)
values ('01991e00-0000-7000-8000-000000000001', tests.get_supabase_uid('training_owner'), 'solo', '[{"id":"segment-20"}]', '[{"playerId":1}]', 12, 30, 40);

select results_eq(
  $$ select count(*)::bigint from public.training_sessions $$,
  array[1::bigint],
  'owner reads own session'
);

select tests.authenticate_as('training_other');
select results_eq(
  $$ select count(*)::bigint from public.training_sessions $$,
  array[0::bigint],
  'other user cannot read session'
);

select throws_ok(
  $$ insert into public.training_sessions (id, user_id, mode, plan, player_results, total_score, max_score, percentage) values ('01991e00-0000-7000-8000-000000000002', tests.get_supabase_uid('training_owner'), 'solo', '[{"id":"segment-20"}]', '[{"playerId":1}]', 0, 30, 0) $$,
  '42501',
  null,
  'other user cannot insert for owner'
);

select * from finish();
rollback;
