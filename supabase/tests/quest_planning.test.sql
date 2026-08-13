begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

insert into auth.users(id,email,encrypted_password,email_confirmed_at,raw_user_meta_data) values
('60000000-0000-0000-0000-000000000006','quest-plan@example.test','',now(),'{}'),
('60000000-0000-0000-0000-000000000007','quest-other@example.test','',now(),'{}');
insert into public.quests(id,user_id,title) values
('61000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000006','Plan launch'),
('61000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000006','Complete research'),
('61000000-0000-0000-0000-000000000003','60000000-0000-0000-0000-000000000007','Private quest');
insert into public.goals(id,user_id,title,measurement) values('62000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000007','Private goal','binary');

set local role authenticated;
select set_config('request.jwt.claim.sub','60000000-0000-0000-0000-000000000006',true);
select set_config('request.jwt.claim.role','authenticated',true);

select lives_ok($$select public.update_quest_plan('61000000-0000-0000-0000-000000000001','Plan public launch','Ship it',null,'in_progress',80,now() + interval '7 days','high',120,null,true)$$,'an owner can update the full quest plan');
select is((select priority from public.quests where id='61000000-0000-0000-0000-000000000001'),'high','priority is persisted');
select is((select estimated_minutes from public.quests where id='61000000-0000-0000-0000-000000000001'),120,'effort estimate is persisted');
select is((select status::text from public.quests where id='61000000-0000-0000-0000-000000000001'),'in_progress','lifecycle state is persisted');

select lives_ok($$select public.add_quest_dependency('61000000-0000-0000-0000-000000000001','61000000-0000-0000-0000-000000000002')$$,'an owned dependency can be added');
select is((select count(*)::integer from public.quest_dependencies),1,'dependency is persisted once');
select throws_ok($$select public.add_quest_dependency('61000000-0000-0000-0000-000000000002','61000000-0000-0000-0000-000000000001')$$,'P0001','DEPENDENCY_CYCLE','dependency cycles are rejected');
select throws_ok($$select public.add_quest_dependency('61000000-0000-0000-0000-000000000001','61000000-0000-0000-0000-000000000003')$$,'P0001','QUEST_NOT_FOUND','cross-account dependencies are rejected');
select throws_ok($$update public.quests set status='completed' where id='61000000-0000-0000-0000-000000000001'$$,'P0001','USE_COMPLETE_QUEST','completion cannot be forged without its ledger record');
select throws_ok($$update public.quests set goal_id='62000000-0000-0000-0000-000000000001' where id='61000000-0000-0000-0000-000000000001'$$,'P0001','INVALID_GOAL_LINK','a quest cannot link to another account goal');

insert into public.quest_subtasks(quest_id,user_id,title) values('61000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000006','Prepare announcement');
select is((select count(*)::integer from public.quest_subtasks where quest_id='61000000-0000-0000-0000-000000000001'),1,'subtasks are stored independently');
select lives_ok($$select public.set_pinned_quest('61000000-0000-0000-0000-000000000001',true)$$,'an active quest can be pinned');
select ok((select pinned_at is not null from public.quests where id='61000000-0000-0000-0000-000000000001'),'pin time is persisted');
select lives_ok($$select public.set_pinned_quest('61000000-0000-0000-0000-000000000002',true)$$,'pinning another quest atomically replaces the first pin');
select is((select count(*)::integer from public.quests where pinned_at is not null),1,'only one next action remains pinned');
update public.quests set status='skipped' where id='61000000-0000-0000-0000-000000000002';
select ok((select pinned_at is null from public.quests where id='61000000-0000-0000-0000-000000000002'),'leaving the active lifecycle clears the pin');
update public.quests set status='ready',recurrence='{"kind":"recurring","intervalDays":7}' where id='61000000-0000-0000-0000-000000000002';
select lives_ok($$select public.complete_quest('61000000-0000-0000-0000-000000000002','recurring-quest-key')$$,'a repeating quest can be completed');
select is((select count(*)::integer from public.quests where recurrence_parent_id='61000000-0000-0000-0000-000000000002'),1,'completion creates exactly one traceable next occurrence');
select is((select status::text from public.quests where recurrence_parent_id='61000000-0000-0000-0000-000000000002'),'ready','the next occurrence is actionable');

select * from finish();
rollback;
