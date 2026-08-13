begin;
create extension if not exists pgtap with schema extensions;
select plan(8);
insert into auth.users(id,email,encrypted_password,email_confirmed_at,raw_user_meta_data) values('80000000-0000-0000-0000-000000000008','suggestions@example.test','',now(),'{}');
insert into public.goals(id,user_id,title,measurement,status) values
('81000000-0000-0000-0000-000000000001','80000000-0000-0000-0000-000000000008','Run 5K','numeric','focus'),
('81000000-0000-0000-0000-000000000002','80000000-0000-0000-0000-000000000008','Read deeply','open_ended','active');
set local role authenticated;
select set_config('request.jwt.claim.sub','80000000-0000-0000-0000-000000000008',true);
select set_config('request.jwt.claim.role','authenticated',true);
select is(public.ensure_quest_suggestions(),2,'one suggestion is generated per eligible goal');
select is(public.ensure_quest_suggestions(),0,'generation is idempotent and restrained');
select is((select count(*)::integer from public.quest_suggestions where status='pending'),2,'suggestions begin pending');
select lives_ok($$select public.decide_quest_suggestion((select id from public.quest_suggestions where goal_id='81000000-0000-0000-0000-000000000001'),'accept','Complete a comfortable 3 km run')$$,'a suggestion can be edited and accepted');
select is((select title from public.quests where goal_id='81000000-0000-0000-0000-000000000001'),'Complete a comfortable 3 km run','the edited title becomes a real quest');
select is((select status::text from public.quests where goal_id='81000000-0000-0000-0000-000000000001'),'planned','acceptance remains user-controlled planning');
select lives_ok($$select public.decide_quest_suggestion((select id from public.quest_suggestions where goal_id='81000000-0000-0000-0000-000000000002'),'dismiss',null)$$,'a suggestion can be dismissed');
select is((select status from public.quest_suggestions where goal_id='81000000-0000-0000-0000-000000000002'),'dismissed','dismissal persists');
select * from finish();rollback;
