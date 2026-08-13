-- Development-only personas from product specification section 120.
-- Every address uses the reserved .test TLD and the shared password is SkillTree123!
insert into auth.users(id,email,encrypted_password,email_confirmed_at,raw_user_meta_data,raw_app_meta_data) values
('10000000-0000-0000-0000-000000000001','new-user@skilltree.test',crypt('SkillTree123!',gen_salt('bf')),now(),'{"display_name":"New User"}','{"provider":"email","providers":["email"]}'),
('10000000-0000-0000-0000-000000000002','multi-goal@skilltree.test',crypt('SkillTree123!',gen_salt('bf')),now(),'{"display_name":"Multi Goal"}','{"provider":"email","providers":["email"]}'),
('10000000-0000-0000-0000-000000000003','long-term@skilltree.test',crypt('SkillTree123!',gen_salt('bf')),now(),'{"display_name":"Long Term"}','{"provider":"email","providers":["email"]}'),
('10000000-0000-0000-0000-000000000004','power-user@skilltree.test',crypt('SkillTree123!',gen_salt('bf')),now(),'{"display_name":"Power User"}','{"provider":"email","providers":["email"]}'),
('10000000-0000-0000-0000-000000000005','free-limit@skilltree.test',crypt('SkillTree123!',gen_salt('bf')),now(),'{"display_name":"Free At Limit"}','{"provider":"email","providers":["email"]}'),
('10000000-0000-0000-0000-000000000006','pro-user@skilltree.test',crypt('SkillTree123!',gen_salt('bf')),now(),'{"display_name":"Pro User"}','{"provider":"email","providers":["email"]}')
on conflict(id) do nothing;

insert into auth.identities(id,user_id,provider_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
select id,id,id::text,jsonb_build_object('sub',id::text,'email',email),'email',now(),now(),now()
from auth.users where email like '%@skilltree.test'
on conflict(provider_id,provider) do nothing;

update public.profiles set timezone='Europe/London' where id between '10000000-0000-0000-0000-000000000001' and '10000000-0000-0000-0000-000000000006';

insert into public.goals(id,user_id,title,category,status,measurement,current_value,target_value,unit,priority,created_at) values
('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Walk a comfortable 5 km','Health','focus','duration',20,60,'minutes','focus',now()),
('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','Run 500 km this year','Fitness','focus','numeric',132,500,'km','focus',now()-interval '5 months'),
('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000002','Build an emergency fund','Finance','active','currency',2400,6000,'GBP','high',now()-interval '8 months'),
('20000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000002','Hold a conversation in Spanish','Learning','active','open_ended',0,null,null,'normal',now()-interval '3 months'),
('20000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000003','Develop as a documentary photographer','Creative','focus','open_ended',0,null,null,'focus',now()-interval '4 years'),
('20000000-0000-0000-0000-000000000006','10000000-0000-0000-0000-000000000006','Complete a first marathon','Fitness','focus','milestones',0,5,'milestones','focus',now()-interval '1 year');

insert into public.skills(id,user_id,name,category,discovered_at) values
('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Walking','Fitness',now()),
('30000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','Endurance running','Fitness',now()-interval '5 months'),
('30000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000002','Personal finance','Finance',now()-interval '8 months'),
('30000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000002','Spanish','Language',now()-interval '3 months'),
('30000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000003','Documentary photography','Creative',now()-interval '4 years'),
('30000000-0000-0000-0000-000000000006','10000000-0000-0000-0000-000000000006','Marathon training','Fitness',now()-interval '1 year');

with seeded as (
  insert into public.activities(user_id,description,duration_minutes,effort,occurred_at,idempotency_key)
  select '10000000-0000-0000-0000-000000000003','Photography field practice',60,'moderate',now()-(day||' days')::interval,'seed-long-'||day
  from generate_series(0,730,7) day returning id,user_id
)
insert into public.activity_goal_links(activity_id,goal_id,user_id)
select id,'20000000-0000-0000-0000-000000000005',user_id from seeded;

insert into public.xp_transactions(user_id,skill_id,source_type,source_id,amount,reason,created_at)
select '10000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000005','activity',gen_random_uuid(),25,'Seeded long-term practice',now()-(day||' days')::interval from generate_series(0,730,7) day;

insert into public.goals(user_id,title,category,status,measurement,current_value,target_value,unit,priority,created_at)
select '10000000-0000-0000-0000-000000000004','Power goal '||n,'Development',case when n<=3 then 'focus'::public.goal_status else 'active'::public.goal_status end,'numeric',n,n+100,'units',case when n<=3 then 'focus' else 'normal' end,now()-(n||' days')::interval from generate_series(1,30) n;
insert into public.skills(user_id,name,category,discovered_at)
select '10000000-0000-0000-0000-000000000004','Power skill '||n,'Development',now()-(n||' days')::interval from generate_series(1,60) n;
insert into public.quests(user_id,title,status,xp_reward,due_at)
select '10000000-0000-0000-0000-000000000004','Power quest '||n,'ready',25,now()+(n||' hours')::interval from generate_series(1,40) n;

insert into public.goals(user_id,title,category,status,measurement,current_value,target_value,unit,priority)
select '10000000-0000-0000-0000-000000000005','Free active goal '||n,'Personal','active','binary',0,1,'complete','normal' from generate_series(1,10) n;

insert into public.entitlements(user_id,entitlement,source,expires_at) values
('10000000-0000-0000-0000-000000000006','pro','development_seed',now()+interval '1 year'),
('10000000-0000-0000-0000-000000000006','unlimited_active_goals','development_seed',now()+interval '1 year')
on conflict(user_id,entitlement) do update set expires_at=excluded.expires_at;
