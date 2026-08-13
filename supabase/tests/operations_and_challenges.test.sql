begin;
create extension if not exists pgtap with schema extensions;
select plan(53);

select has_table('public','push_subscriptions','push subscription storage exists');
select has_table('public','product_events','privacy-safe product events exist');
select has_view('public','product_metrics','aggregate product metrics exist');
select has_trigger('public','template_reports','template_report_moderation_flag','template reports enter the moderation queue');
select has_column('public','support_tickets','category','feedback category is persisted');
select has_column('public','support_tickets','diagnostic_context','optional diagnostics are persisted separately');
select has_column('public','subscriptions','billing_interval','subscription interval supports revenue metrics');
select has_column('public','subscriptions','unit_amount','subscription amount supports revenue metrics');
select has_column('public','subscriptions','currency','subscription currency is explicit');
select has_trigger('public','profiles','metric_profile_shared','profile sharing is measured server-side');
select has_trigger('public','focus_sessions','metric_focus_completed','completed focus sessions are measured server-side');
select has_trigger('public','subscriptions','metric_subscription_lifecycle','subscription lifecycle is measured server-side');
select has_function('public','prepare_user_deletion',array['uuid'],'account deletion cleanup is versioned and callable by the service role');
select ok(has_function_privilege('service_role','public.consume_rate_limit(text,integer,integer)','EXECUTE'),'service role can consume request rate limits');
select ok(not has_function_privilege('authenticated','public.consume_rate_limit(text,integer,integer)','EXECUTE'),'users cannot bypass the request boundary to consume rate limits directly');
select has_function('public','create_challenge',array['text','text','timestamp with time zone','timestamp with time zone','text','numeric','text','uuid[]'],'transactional challenge creation exists');
select ok(has_function_privilege('authenticated','public.create_challenge(text,text,timestamptz,timestamptz,text,numeric,text,uuid[])','EXECUTE'),'signed-in users can create challenges transactionally');
select ok(not has_function_privilege('anon','public.create_challenge(text,text,timestamptz,timestamptz,text,numeric,text,uuid[])','EXECUTE'),'anonymous users cannot create challenges');
select has_function('public','update_account_preferences',array['jsonb','jsonb'],'transactional account preference updates exist');
select ok(has_function_privilege('authenticated','public.update_account_preferences(jsonb,jsonb)','EXECUTE'),'signed-in users can update account preferences transactionally');
select ok(not has_function_privilege('anon','public.update_account_preferences(jsonb,jsonb)','EXECUTE'),'anonymous users cannot update account preferences');
select has_function('public','update_public_profile',array['jsonb'],'transactional public profile updates exist');
select ok(has_function_privilege('authenticated','public.update_public_profile(jsonb)','EXECUTE'),'signed-in users can update public profiles transactionally');
select ok(not has_function_privilege('anon','public.update_public_profile(jsonb)','EXECUTE'),'anonymous users cannot update public profiles');
select has_function('public','cancel_evidence_upload',array['text'],'unused evidence reservations can be cancelled');
select ok(has_function_privilege('authenticated','public.cancel_evidence_upload(text)','EXECUTE'),'signed-in users can cancel their unused upload reservations');
select ok(not has_function_privilege('anon','public.cancel_evidence_upload(text)','EXECUTE'),'anonymous users cannot cancel evidence reservations');
select has_function('public','update_support_ticket_admin',array['uuid','uuid','text','text','text'],'support updates are transactional');
select ok(has_function_privilege('service_role','public.update_support_ticket_admin(uuid,uuid,text,text,text)','EXECUTE'),'service role can perform transactional support updates');
select ok(not has_function_privilege('authenticated','public.update_support_ticket_admin(uuid,uuid,text,text,text)','EXECUTE'),'users cannot call admin support updates');
select has_function('public','apply_moderation_action',array['uuid','uuid','text','text'],'moderation actions are transactional');
select ok(has_function_privilege('service_role','public.apply_moderation_action(uuid,uuid,text,text)','EXECUTE'),'service role can perform transactional moderation');
select ok(not has_function_privilege('authenticated','public.apply_moderation_action(uuid,uuid,text,text)','EXECUTE'),'users cannot call admin moderation actions');
select has_column('public','journal_entries','goal_id','journal entries can relate to goals');
select has_column('public','journal_entries','activity_id','journal entries can relate to activities');
select has_column('public','journal_entries','skill_id','journal entries can relate to skills');
select has_function('public','transition_focus_session',array['uuid','text','text','text'],'focus transitions and completion are transactional');
select ok(has_function_privilege('authenticated','public.transition_focus_session(uuid,text,text,text)','EXECUTE'),'signed-in users can transition their focus session');
select ok(not has_function_privilege('anon','public.transition_focus_session(uuid,text,text,text)','EXECUTE'),'anonymous users cannot transition focus sessions');

insert into auth.users(id,email,encrypted_password,email_confirmed_at,raw_user_meta_data) values
('61000000-0000-0000-0000-000000000001','challenge-owner@example.test','',now(),'{}'),
('62000000-0000-0000-0000-000000000002','challenge-friend@example.test','',now(),'{}'),
('63000000-0000-0000-0000-000000000003','challenge-other@example.test','',now(),'{}');
insert into public.friendships(id,requester_id,addressee_id,status) values('64000000-0000-0000-0000-000000000001','61000000-0000-0000-0000-000000000001','62000000-0000-0000-0000-000000000002','accepted');
insert into public.challenges(id,creator_id,title,starts_at,ends_at,metric,target,visibility) values
('65000000-0000-0000-0000-000000000001','61000000-0000-0000-0000-000000000001','Friends challenge',now(),now()+interval '7 days','activities',3,'friends'),
('65000000-0000-0000-0000-000000000002','61000000-0000-0000-0000-000000000001','Public challenge',now(),now()+interval '7 days','activities',3,'public');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','61000000-0000-0000-0000-000000000001',true);
select lives_ok($$select public.create_challenge('Transactional challenge','All records commit together',now(),now()+interval '3 days','activities',2,'invite_only',array['62000000-0000-0000-0000-000000000002']::uuid[])$$,'challenge and memberships are created in one transaction');
select is((select count(*) from public.challenge_members m join public.challenges c on c.id=m.challenge_id where c.title='Transactional challenge'),2::bigint,'creator and invitee memberships both exist');
select lives_ok($$insert into public.challenge_members(challenge_id,user_id,status) values('65000000-0000-0000-0000-000000000001','63000000-0000-0000-0000-000000000003','invited')$$,'creator can invite a member');
reset role;
delete from public.challenge_members where challenge_id='65000000-0000-0000-0000-000000000001' and user_id='63000000-0000-0000-0000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.sub','63000000-0000-0000-0000-000000000003',true);
select throws_ok($$insert into public.challenge_members(challenge_id,user_id,status) values('65000000-0000-0000-0000-000000000001','63000000-0000-0000-0000-000000000003','accepted')$$,'42501','new row violates row-level security policy for table "challenge_members"','unconnected user cannot join friends-only challenge');
select lives_ok($$insert into public.challenge_members(challenge_id,user_id,status) values('65000000-0000-0000-0000-000000000002','63000000-0000-0000-0000-000000000003','accepted')$$,'user can join a public challenge');
select set_config('request.jwt.claim.sub','62000000-0000-0000-0000-000000000002',true);
select lives_ok($$insert into public.challenge_members(challenge_id,user_id,status) values('65000000-0000-0000-0000-000000000001','62000000-0000-0000-0000-000000000002','accepted')$$,'accepted friend can join friends-only challenge');
select lives_ok($$insert into public.push_subscriptions(user_id,endpoint,p256dh,auth_key) values('62000000-0000-0000-0000-000000000002','https://push.example/sub','public-key','auth-key')$$,'user can store their own push subscription');
select throws_ok($$insert into public.push_subscriptions(user_id,endpoint,p256dh,auth_key) values('63000000-0000-0000-0000-000000000003','https://push.example/spoof','public-key','auth-key')$$,'42501','new row violates row-level security policy for table "push_subscriptions"','user cannot spoof another push owner');
select throws_ok($$select count(*) from public.product_events$$,'42501','permission denied for table product_events','raw product events are not exposed to users');

insert into public.focus_sessions(id,user_id,status,started_at,active_seconds)
values('66000000-0000-0000-0000-000000000001','62000000-0000-0000-0000-000000000002','paused',now()-interval '2 minutes',120);
select is((public.transition_focus_session('66000000-0000-0000-0000-000000000001','resume',null,null)->>'status'),'running','a paused focus session resumes');
select is((public.transition_focus_session('66000000-0000-0000-0000-000000000001','pause',null,null)->>'status'),'paused','a running focus session pauses');
select is((public.transition_focus_session('66000000-0000-0000-0000-000000000001','complete','Focused test work','Finished the test')->>'status'),'completed','finishing completes the focus session');
select is((select count(*) from public.activities where idempotency_key='focus:66000000-0000-0000-0000-000000000001'),1::bigint,'finishing creates exactly one activity');
select is((select count(*) from public.activities where id=(public.transition_focus_session('66000000-0000-0000-0000-000000000001','complete','Focused test work','Finished the test')->>'activity_id')::uuid),1::bigint,'retrying finish returns the original activity without duplication');

select * from finish();
rollback;
