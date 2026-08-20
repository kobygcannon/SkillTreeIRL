begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

select has_function('public','add_goal_progress',array['uuid','numeric','text','text'],'atomic relative progress entry exists');
select ok(has_function_privilege('authenticated','public.add_goal_progress(uuid,numeric,text,text)','EXECUTE'),'authenticated users can add their own progress');
select ok(not has_function_privilege('anon','public.add_goal_progress(uuid,numeric,text,text)','EXECUTE'),'anonymous users cannot add progress');

insert into auth.users(id,email,encrypted_password,email_confirmed_at,raw_user_meta_data)
values('a1600000-0000-0000-0000-000000000001','delta-test@example.test','',now(),'{"display_name":"Delta Test"}');
insert into public.goals(id,user_id,title,category,measurement,current_value,target_value,unit,status)
values('a1600000-0000-0000-0000-000000000002','a1600000-0000-0000-0000-000000000001','Walk 10,000 steps','Health','numeric',1000,10000,'steps','active');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','a1600000-0000-0000-0000-000000000001',true);
select lives_ok($$select public.add_goal_progress('a1600000-0000-0000-0000-000000000002',2000,'morning walk','delta-test-key-1')$$,'positive progress is added');
select is((select current_value from public.goals where id='a1600000-0000-0000-0000-000000000002'),3000::numeric,'the authoritative total includes the delta');
select lives_ok($$select public.add_goal_progress('a1600000-0000-0000-0000-000000000002',2000,'replay','delta-test-key-1')$$,'a replay is idempotent');
select is((select count(*) from public.goal_progress_events where goal_id='a1600000-0000-0000-0000-000000000002'),1::bigint,'a replay creates no duplicate event');
select throws_ok($$select public.add_goal_progress('a1600000-0000-0000-0000-000000000002',0,null,'delta-test-key-2')$$,'P0001','INVALID_PROGRESS_DELTA','zero is rejected as an addition');

select * from finish();
rollback;
