begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users(id,email,encrypted_password,email_confirmed_at,raw_user_meta_data) values
('30000000-0000-0000-0000-000000000003','merge-one@example.test','',now(),'{"display_name":"Merge One"}'),
('40000000-0000-0000-0000-000000000004','merge-two@example.test','',now(),'{"display_name":"Merge Two"}');
insert into public.skills(id,user_id,name,category) values
('31000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000003','JS','Technology'),
('31000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000003','JavaScript','Technology'),
('41000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000004','Other user skill','Technology');
insert into public.goals(id,user_id,title,measurement) values
('32000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000003','Owned organiser','open_ended'),
('42000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000004','Other organiser','open_ended');
insert into public.xp_transactions(user_id,skill_id,source_type,source_id,amount,reason) values
('30000000-0000-0000-0000-000000000003','31000000-0000-0000-0000-000000000001','adjustment','31000000-0000-0000-0000-000000000011',40,'test source XP'),
('30000000-0000-0000-0000-000000000003','31000000-0000-0000-0000-000000000002','adjustment','31000000-0000-0000-0000-000000000012',60,'test retained XP');

set local role authenticated;
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000003',true);
select set_config('request.jwt.claim.role','authenticated',true);

select lives_ok($$select public.merge_personal_skills('31000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000002')$$,'a user can merge two owned skills transactionally');
select is(public.skill_total_xp('31000000-0000-0000-0000-000000000002'),100::bigint,'retained skill includes archived source XP without duplicating it');
select is((select merged_into from public.skills where id='31000000-0000-0000-0000-000000000001'),'31000000-0000-0000-0000-000000000002'::uuid,'source skill records its retained branch');
select is((select count(*)::integer from public.xp_transactions where user_id='30000000-0000-0000-0000-000000000003'),2,'merge preserves immutable XP ledger rows');
select is((select count(*)::integer from public.skill_merges),1,'merge audit record is visible to its owner');
select throws_ok($$select public.merge_personal_skills('31000000-0000-0000-0000-000000000002','41000000-0000-0000-0000-000000000001')$$,'P0001','Choose two different active personal skills','a user cannot merge into another user''s skill');
select is((select count(*)::integer from public.templates where owner_id is null),3,'curated templates are discoverable');
select lives_ok($$select public.instantiate_template((select id from public.templates where name='Run your first 5K'),null)$$,'a curated goal template instantiates in one transaction');
select lives_ok($$select public.set_goal_organization('32000000-0000-0000-0000-000000000001',array['work','2026'],null,null)$$,'an owner can transactionally assign normalized goal tags');
select throws_ok($$select public.set_goal_organization('42000000-0000-0000-0000-000000000001',array['stolen'],null,null)$$,'P0001','GOAL_NOT_FOUND','goal organisation rejects another user''s goal');
select lives_ok($$insert into public.referral_codes(referrer_id,code) values('30000000-0000-0000-0000-000000000003','invite-code-one')$$,'a user can create their own referral code');
select throws_ok($$insert into public.referral_codes(referrer_id,code) values('40000000-0000-0000-0000-000000000004','spoofed-code')$$,'42501','new row violates row-level security policy for table "referral_codes"','a user cannot create another user''s referral code');
select set_config('request.jwt.claim.sub','40000000-0000-0000-0000-000000000004',true);
select lives_ok($$select public.claim_referral('invite-code-one')$$,'a referred user can claim a valid code');
select is((select status from public.referrals where referred_id='40000000-0000-0000-0000-000000000004'),'signed_up'::text,'referral claim records signup without progression rewards');

select * from finish();
rollback;
