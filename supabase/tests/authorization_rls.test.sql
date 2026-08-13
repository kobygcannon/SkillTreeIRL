begin;

create extension if not exists pgtap with schema extensions;
select plan(15);

select has_table('public', 'goals', 'goals table exists');
select has_table('public', 'xp_transactions', 'XP ledger exists');
select policies_are(
  'public',
  'goals',
  array['goals_select', 'goals_insert', 'goals_update'],
  'goals has the expected owner policies'
);

insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values
  ('10100000-0000-0000-0000-000000000001', 'one@example.test', '', now(), '{"display_name":"One"}'),
  ('20000000-0000-0000-0000-000000000002', 'two@example.test', '', now(), '{"display_name":"Two"}');

insert into public.goals (id, user_id, title, measurement)
values
  ('11100000-0000-0000-0000-000000000001', '10100000-0000-0000-0000-000000000001', 'User one goal', 'binary'),
  ('22000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'User two goal', 'binary');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10100000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  $$ select title from public.goals order by title $$,
  $$ values ('User one goal'::text) $$,
  'a user can only read their own private goals'
);

select throws_ok(
  $$ insert into public.goals (user_id, title, measurement) values ('20000000-0000-0000-0000-000000000002', 'Spoofed', 'binary') $$,
  '42501',
  'new row violates row-level security policy for table "goals"',
  'a user cannot insert a goal for another user'
);

select lives_ok(
  $$ insert into public.goals (user_id, title, measurement) values ('10100000-0000-0000-0000-000000000001', 'Owned', 'binary') $$,
  'a user can insert their own goal'
);

select is(
  (select count(*)::integer from public.profiles),
  1,
  'private profiles are isolated'
);

select throws_ok(
  $$ delete from public.xp_transactions where user_id = '10100000-0000-0000-0000-000000000001' $$,
  '42501',
  null,
  'authenticated users cannot delete XP ledger entries'
);

select throws_ok(
  $$ delete from public.goal_progress_events where user_id = '10100000-0000-0000-0000-000000000001' $$,
  '42501',
  null,
  'authenticated users cannot delete progress ledger entries'
);

select throws_ok(
  $$ insert into public.goal_progress_events (user_id, goal_id, value) values ('10100000-0000-0000-0000-000000000001', '11100000-0000-0000-0000-000000000001', 999999) $$,
  '42501',
  null,
  'clients cannot forge goal progress ledger entries'
);

select throws_ok(
  $$ insert into public.achievement_unlocks (user_id, achievement_key) values ('10100000-0000-0000-0000-000000000001', 'forged') $$,
  '42501',
  null,
  'clients cannot forge achievement unlocks'
);

select throws_ok(
  $$ insert into public.activities (user_id, description) values ('10100000-0000-0000-0000-000000000001', 'forged activity') $$,
  '42501',
  null,
  'clients cannot bypass the authoritative activity logger'
);

select is(
  public.skill_total_xp('00000000-0000-0000-0000-000000000000'),
  0::bigint,
  'skill XP reads are scoped and safely return zero'
);

select throws_ok(
  $$ select public.complete_quest('22000000-0000-0000-0000-000000000002', 'rls-test-key') $$,
  'P0001',
  'QUEST_NOT_FOUND',
  'server-authoritative quest completion rejects another user''s quest'
);

select throws_ok(
  $$ select public.refresh_season_stats('20000000-0000-0000-0000-000000000002') $$,
  'P0001',
  'FORBIDDEN',
  'season aggregation cannot be requested for another user'
);

select * from finish();
rollback;
