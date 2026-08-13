begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

select is((select count(*)::integer from auth.users where email like '%@skilltree.test'),6,'all six development personas exist');
select is((select count(*)::integer from public.goals where user_id='10000000-0000-0000-0000-000000000001'),1,'new user starts with one simple goal');
select is((select count(distinct category)::integer from public.goals where user_id='10000000-0000-0000-0000-000000000002'),3,'multi-goal user covers fitness, finance, and learning');
select ok((select min(occurred_at)<now()-interval '1 year' from public.activities where user_id='10000000-0000-0000-0000-000000000003'),'long-term user has years of history');
select ok((select count(*)>=30 from public.goals where user_id='10000000-0000-0000-0000-000000000004'),'power user has dozens of goals');
select ok((select count(*)>=60 from public.skills where user_id='10000000-0000-0000-0000-000000000004'),'power user has dozens of skills');
select ok((select count(*)>=40 from public.quests where user_id='10000000-0000-0000-0000-000000000004'),'power user has dozens of quests');
select is((select count(*)::integer from public.goals where user_id='10000000-0000-0000-0000-000000000005' and status in('active','focus')),10,'free user is at the active-goal limit');
select ok(exists(select 1 from public.entitlements where user_id='10000000-0000-0000-0000-000000000006' and entitlement='pro' and expires_at>now()),'Pro user has an active backend entitlement');

select * from finish();
rollback;
