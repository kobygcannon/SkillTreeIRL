begin;
create extension if not exists pgtap with schema extensions;
select plan(9);
insert into auth.users(id,email,encrypted_password,email_confirmed_at,raw_user_meta_data) values('50000000-0000-0000-0000-000000000005','undo@example.test','',now(),'{"display_name":"Undo"}');
insert into public.skills(id,user_id,name) values('51000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000005','Undo Skill');
insert into public.goals(id,user_id,title,measurement,target_value) values('52000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000005','Undo Goal','numeric',10);
insert into public.quests(id,user_id,title,xp_reward) values('53000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000005','Undo Quest',25);
insert into public.quest_skill_rewards(quest_id,skill_id,user_id,xp) values('53000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000005',25);
set local role authenticated;select set_config('request.jwt.claim.sub','50000000-0000-0000-0000-000000000005',true);select set_config('request.jwt.claim.role','authenticated',true);

select lives_ok($$select public.undo_activity(public.log_activity('Undo me',now(),30,null,null,'moderate','{}','[{"skillId":"51000000-0000-0000-0000-000000000001","weight":1}]',null,'undo-activity-key'))$$,'an owned activity can be safely undone');
select is(public.skill_total_xp('51000000-0000-0000-0000-000000000001'),0::bigint,'activity undo reverses its XP exactly');
select is((select count(*)::integer from public.activities where reversed_at is not null),1,'activity remains as reversed audit history');

select lives_ok($$select public.undo_goal_progress(public.record_goal_progress('52000000-0000-0000-0000-000000000001',7,'test','undo-progress-key'))$$,'goal progress can be safely undone');
select is((select current_value from public.goals where id='52000000-0000-0000-0000-000000000001'),0::numeric,'progress undo restores the prior authoritative value');
select is((select count(*)::integer from public.goal_progress_events where reversal_of is not null),1,'progress undo appends a correction instead of deleting history');

select lives_ok($$select public.undo_quest_completion('53000000-0000-0000-0000-000000000001') from (select public.complete_quest('53000000-0000-0000-0000-000000000001','undo-quest-key')) completed$$,'quest completion can be safely undone');
select is((select status::text from public.quests where id='53000000-0000-0000-0000-000000000001'),'ready','quest undo makes the quest available again');
select is(public.skill_total_xp('51000000-0000-0000-0000-000000000001'),0::bigint,'quest undo reverses awarded XP without deleting the ledger');
select * from finish();rollback;
