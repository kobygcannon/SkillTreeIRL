begin;
select plan(2);

select lives_ok(
  $$delete from auth.users where id = '10000000-0000-0000-0000-000000000002'$$,
  'a populated account can be permanently deleted through cascades'
);

select is(
  (select count(*)::integer from public.goal_progress_events where user_id = '10000000-0000-0000-0000-000000000002'),
  0,
  'immutable progress ledger rows are erased with their account'
);

select * from finish();
rollback;
