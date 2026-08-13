begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

select has_function('public','create_goal_with_limits',array['text','text','text','public.measurement_model','numeric','numeric','text','character','timestamp with time zone','text'],'atomic goal creation policy exists');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000005',true);
select throws_ok($$select public.create_goal_with_limits('One too many',null,'Personal','binary',0,1,'complete',null,null,'normal')$$,'P0001','ACTIVE_GOAL_LIMIT','free active-goal limit is enforced in the transaction');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000006',true);
select lives_ok($$select public.create_goal_with_limits('Another Pro goal',null,'Personal','binary',0,1,'complete',null,null,'normal')$$,'Pro entitlement permits additional active goals');
select is((select count(*)::integer from public.goals where user_id='10000000-0000-0000-0000-000000000006' and status in('active','focus')),2,'Pro goal is persisted');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000005',true);
select lives_ok($$select public.reserve_evidence_upload('10000000-0000-0000-0000-000000000005/seed/one.pdf',10485760)$$,'free user can reserve the first 10 MB evidence file');
select lives_ok($$select public.reserve_evidence_upload('10000000-0000-0000-0000-000000000005/seed/two.pdf',10485760)$$,'free user can use the useful 25 MB allowance');
select throws_ok($$select public.reserve_evidence_upload('10000000-0000-0000-0000-000000000005/seed/three.pdf',10485760)$$,'P0001','EVIDENCE_STORAGE_LIMIT','free evidence quota is transactionally enforced');

select * from finish();
rollback;
