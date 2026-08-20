begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

select has_function('public','create_organization_objective',array['uuid','text','text','text','numeric','text','timestamp with time zone','uuid[]'],'transactional company objective creation exists');
select ok(has_function_privilege('authenticated','public.create_organization_objective(uuid,text,text,text,numeric,text,timestamptz,uuid[])','EXECUTE'),'authenticated workspace leads can call objective creation');
select ok(not has_function_privilege('anon','public.create_organization_objective(uuid,text,text,text,numeric,text,timestamptz,uuid[])','EXECUTE'),'anonymous callers cannot create objectives');
select ok(not has_table_privilege('authenticated','public.organization_objectives','INSERT'),'clients cannot bypass transactional objective creation');
select ok(not has_table_privilege('authenticated','public.organization_assignments','INSERT'),'clients cannot bypass assignee validation');
select has_function('public','manage_organization_member',array['uuid','uuid','text','text'],'authoritative company member management exists');
select ok(has_function_privilege('authenticated','public.manage_organization_member(uuid,uuid,text,text)','EXECUTE'),'authenticated owners and admins can request member changes');
select ok(not has_function_privilege('anon','public.manage_organization_member(uuid,uuid,text,text)','EXECUTE'),'anonymous callers cannot manage members');
select ok(not has_table_privilege('authenticated','public.organization_members','DELETE'),'clients cannot remove membership history directly');

insert into auth.users(id,email,encrypted_password,email_confirmed_at,raw_user_meta_data) values
('91000000-0000-0000-0000-000000000001','company-owner@example.test','',now(),'{"display_name":"Owner"}'),
('92000000-0000-0000-0000-000000000002','company-member@example.test','',now(),'{"display_name":"Member"}'),
('93000000-0000-0000-0000-000000000003','company-outsider@example.test','',now(),'{"display_name":"Outsider"}');

insert into public.organizations(id,name,slug,owner_id)
values('94000000-0000-0000-0000-000000000004','Example Studio','example-studio','91000000-0000-0000-0000-000000000001');
insert into public.organization_members(organization_id,user_id,role,display_name)
values('94000000-0000-0000-0000-000000000004','91000000-0000-0000-0000-000000000001','owner','Owner');
insert into public.organization_members(organization_id,user_id,role,display_name)
values('94000000-0000-0000-0000-000000000004','92000000-0000-0000-0000-000000000002','member','Member');
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','91000000-0000-0000-0000-000000000001',true);

select lives_ok($$select public.create_organization_objective('94000000-0000-0000-0000-000000000004','Improve onboarding',null,'percentage',100,'%',null,array['92000000-0000-0000-0000-000000000002']::uuid[])$$,'owner can transactionally create and assign an objective');
select is((select count(*) from public.organization_objectives where organization_id='94000000-0000-0000-0000-000000000004'),1::bigint,'one objective is committed');
select is((select count(*) from public.organization_assignments),1::bigint,'its member assignment is committed');
select throws_ok($$select public.create_organization_objective('94000000-0000-0000-0000-000000000004','Leaked assignment',null,'percentage',100,'%',null,array['93000000-0000-0000-0000-000000000003']::uuid[])$$,'P0001','INVALID_ASSIGNEE','an outsider cannot be assigned');
select is((select count(*) from public.organization_objectives where organization_id='94000000-0000-0000-0000-000000000004'),1::bigint,'invalid assignment rolls back the objective');
select set_config('request.jwt.claim.sub','92000000-0000-0000-0000-000000000002',true);
select throws_ok($$select public.create_organization_objective('94000000-0000-0000-0000-000000000004','Unauthorized objective',null,'percentage',100,'%',null,array[]::uuid[])$$,'P0001','FORBIDDEN','ordinary members cannot create shared objectives');
select throws_ok($$select public.manage_organization_member('94000000-0000-0000-0000-000000000004','91000000-0000-0000-0000-000000000001','suspend',null)$$,'P0001','FORBIDDEN','ordinary members cannot manage memberships');
select set_config('request.jwt.claim.sub','91000000-0000-0000-0000-000000000001',true);
select lives_ok($$select public.manage_organization_member('94000000-0000-0000-0000-000000000004','92000000-0000-0000-0000-000000000002','change_role','manager')$$,'owner can promote a member to manager');
select is((select role from public.organization_members where organization_id='94000000-0000-0000-0000-000000000004' and user_id='92000000-0000-0000-0000-000000000002'),'manager','role change persists');
select lives_ok($$select public.manage_organization_member('94000000-0000-0000-0000-000000000004','92000000-0000-0000-0000-000000000002','suspend',null)$$,'owner can suspend access without deleting history');
select is((select status from public.organization_members where organization_id='94000000-0000-0000-0000-000000000004' and user_id='92000000-0000-0000-0000-000000000002'),'suspended','suspension persists');
select throws_ok($$select public.manage_organization_member('94000000-0000-0000-0000-000000000004','91000000-0000-0000-0000-000000000001','suspend',null)$$,'P0001','OWNER_IMMUTABLE','the workspace owner cannot be suspended');

select * from finish();
rollback;
