begin;
create extension if not exists pgtap with schema extensions;
select plan(9);
insert into auth.users(id,email,encrypted_password,email_confirmed_at,raw_user_meta_data) values
('70000000-0000-0000-0000-000000000007','habit-config@example.test','',now(),'{}'),
('70000000-0000-0000-0000-000000000008','habit-other@example.test','',now(),'{}');
insert into public.goals(id,user_id,title,measurement) values('71000000-0000-0000-0000-000000000001','70000000-0000-0000-0000-000000000007','Read more','numeric');
insert into public.skills(id,user_id,name) values('72000000-0000-0000-0000-000000000001','70000000-0000-0000-0000-000000000007','Reading');
set local role authenticated;
select set_config('request.jwt.claim.sub','70000000-0000-0000-0000-000000000007',true);
select set_config('request.jwt.claim.role','authenticated',true);
select lives_ok($$select public.create_configured_habit('Read daily','{"kind":"weekly","days":[1,3,5]}','Europe/London','71000000-0000-0000-0000-000000000001','{72000000-0000-0000-0000-000000000001}',15,20,'pages',current_date,null,now()+interval '1 hour','{"kind":"recurring","intervalDays":1,"days":[1,3,5]}')$$,'a complete habit configuration is created atomically');
select is((select minimum_target from public.habits),20::numeric,'minimum target is persisted');
select is((select minimum_unit from public.habits),'pages','minimum unit is persisted');
select is((select frequency->'days' from public.habits),'[1, 3, 5]'::jsonb,'preferred days are persisted');
select is((select count(*)::integer from public.habit_skill_links),1,'linked skills are persisted');
select is((select count(*)::integer from public.reminders where reminder_type='habit'),1,'the habit reminder is linked');
select lives_ok($$select public.configure_habit((select id from public.habits),'Read often','{"kind":"weekly","days":[2,4]}','Europe/London',null,'{}',10,null,null,current_date,current_date+30,null,null)$$,'habit configuration can be edited');
select is((select count(*)::integer from public.reminders where reminder_type='habit'),0,'clearing the reminder removes it');
select throws_ok($$update public.habits set frequency='{"days":[]}'$$,'P0001','INVALID_FREQUENCY','empty schedules are rejected at the database boundary');
select * from finish(); rollback;
