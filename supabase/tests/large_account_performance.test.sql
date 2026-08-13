begin;

create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values ('30000000-0000-0000-0000-000000000003', 'large-account@example.test', '', now(), '{"display_name":"Large Account"}');

insert into public.skills (user_id, name, category)
select '30000000-0000-0000-0000-000000000003', 'Skill ' || n, 'Performance test'
from generate_series(1, 500) n;

insert into public.activities (user_id, description, occurred_at, idempotency_key)
select '30000000-0000-0000-0000-000000000003', 'Historical activity ' || n, now() - (n || ' minutes')::interval, 'large-' || n
from generate_series(1, 20000) n;

insert into public.goals (user_id, title, measurement, status)
select '30000000-0000-0000-0000-000000000003', 'Historical goal ' || n, 'binary', case when n % 10 = 0 then 'archived'::public.goal_status else 'active'::public.goal_status end
from generate_series(1, 100) n;

insert into public.xp_transactions (user_id, skill_id, source_type, source_id, amount, reason, created_at)
select '30000000-0000-0000-0000-000000000003', skills.id, 'activity', gen_random_uuid(), 5, 'Large-account history', now() - (n || ' minutes')::interval
from public.skills skills cross join generate_series(1, 100) n
where skills.user_id = '30000000-0000-0000-0000-000000000003';

set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000003', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select has_index('public', 'activities', 'activities_user_time_idx', 'large history reads have a user/time index');
select has_index('public', 'goals', 'goals_user_status_idx', 'large goal reads have a user/status index');
select has_index('public', 'xp_transactions', 'xp_user_time_idx', 'large XP history reads have a user/time index');
select performs_ok($$ select id, description, occurred_at from public.activities order by occurred_at desc limit 100 $$, 250, 'latest 100 activities remain responsive with 20k records');
select performs_ok($$ select id, title from public.goals where status in ('active','focus') order by updated_at desc limit 100 $$, 250, 'active goal list remains responsive with 100 records and years of history');
select performs_ok($$ select id, amount, created_at from public.xp_transactions order by created_at desc limit 100 $$, 250, 'latest XP history remains responsive with 50k ledger records');

select * from finish();
rollback;
