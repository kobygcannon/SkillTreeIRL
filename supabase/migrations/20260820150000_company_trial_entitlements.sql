create or replace function private.organization_collaboration_enabled(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select status='active' or (status='trialing' and current_period_end>now())
    from public.organization_subscriptions
    where organization_id=p_organization_id
  ),false)
$$;
revoke all on function private.organization_collaboration_enabled(uuid) from public,anon,authenticated;

update public.organization_subscriptions
set status='trialing',current_period_end=now()+interval '14 days',updated_at=now()
where status='inactive' and provider_subscription_id is null;

create or replace function public.create_organization(p_name text,p_slug text,p_job_title text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare current_user_id uuid=(select auth.uid()); result uuid;
begin
  if current_user_id is null then raise exception 'UNAUTHENTICATED'; end if;
  if char_length(trim(p_name)) not between 2 and 120 or p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then raise exception 'INVALID_ORGANIZATION'; end if;
  insert into public.organizations(name,slug,owner_id) values(trim(p_name),p_slug,current_user_id) returning id into result;
  insert into public.organization_members(organization_id,user_id,role,display_name,job_title) values(result,current_user_id,'owner',coalesce((select display_name from public.profiles where id=current_user_id),'Workspace owner'),nullif(trim(p_job_title),''));
  insert into public.organization_subscriptions(organization_id,status,seat_quantity,current_period_end) values(result,'trialing',1,now()+interval '14 days');
  return result;
end $$;

create or replace function public.create_organization_invitation(p_organization_id uuid,p_email text,p_role text default 'member')
returns text language plpgsql security definer set search_path='' as $$
declare raw_token text; normalized_email text=lower(trim(p_email));
begin
  if (select private.organization_role(p_organization_id)) not in ('owner','admin') then raise exception 'FORBIDDEN'; end if;
  if not (select private.organization_collaboration_enabled(p_organization_id)) then raise exception 'COMPANY_PLAN_REQUIRED'; end if;
  if p_role not in ('admin','manager','member') or position('@' in normalized_email)<=1 then raise exception 'INVALID_INVITATION'; end if;
  update public.organization_invitations set revoked_at=now() where organization_id=p_organization_id and email=normalized_email and accepted_at is null and revoked_at is null;
  raw_token=encode(gen_random_bytes(32),'hex');
  insert into public.organization_invitations(organization_id,email,role,token_hash,invited_by,expires_at)
  values(p_organization_id,normalized_email,p_role,encode(digest(raw_token,'sha256'),'hex'),(select auth.uid()),now()+interval '7 days');
  return raw_token;
end $$;

create or replace function public.accept_organization_invitation(p_token text)
returns uuid language plpgsql security definer set search_path='' as $$
declare invitation public.organization_invitations%rowtype; current_user_id uuid=(select auth.uid()); current_email text=lower(coalesce((select auth.jwt()->>'email'),''));
begin
  if current_user_id is null then raise exception 'UNAUTHENTICATED'; end if;
  select * into invitation from public.organization_invitations where token_hash=encode(digest(p_token,'sha256'),'hex') and accepted_at is null and revoked_at is null and expires_at>now() for update;
  if not found or current_email<>invitation.email then raise exception 'INVITATION_INVALID'; end if;
  if not (select private.organization_collaboration_enabled(invitation.organization_id)) then raise exception 'COMPANY_PLAN_REQUIRED'; end if;
  insert into public.organization_members(organization_id,user_id,role,display_name) values(invitation.organization_id,current_user_id,invitation.role,coalesce((select display_name from public.profiles where id=current_user_id),'Team member')) on conflict(organization_id,user_id) do update set status='active';
  update public.organization_invitations set accepted_at=now() where id=invitation.id;
  return invitation.organization_id;
end $$;

create or replace function public.submit_organization_checkin(p_objective_id uuid,p_progress_value numeric,p_summary text,p_visibility text default 'managers')
returns uuid language plpgsql security definer set search_path='' as $$
declare current_user_id uuid=(select auth.uid()); result uuid; objective_target numeric; objective_measurement text; organization_id uuid;
begin
  if current_user_id is null then raise exception 'UNAUTHENTICATED'; end if;
  if p_progress_value is null or p_progress_value<0 or char_length(trim(p_summary)) not between 1 and 2000 or p_visibility not in ('managers','workspace') then raise exception 'INVALID_CHECKIN'; end if;
  if not exists(select 1 from public.organization_assignments where objective_id=p_objective_id and user_id=current_user_id) then raise exception 'ASSIGNMENT_NOT_FOUND'; end if;
  select target_value,measurement,o.organization_id into objective_target,objective_measurement,organization_id from public.organization_objectives o where id=p_objective_id;
  if not (select private.organization_collaboration_enabled(organization_id)) then raise exception 'COMPANY_PLAN_REQUIRED'; end if;
  update public.organization_assignments set current_value=p_progress_value,status=case when (objective_measurement='binary' and p_progress_value>=1) or (objective_target is not null and p_progress_value>=objective_target) then 'completed' else 'in_progress' end,completed_at=case when (objective_measurement='binary' and p_progress_value>=1) or (objective_target is not null and p_progress_value>=objective_target) then now() else null end where objective_id=p_objective_id and user_id=current_user_id;
  insert into public.organization_checkins(objective_id,user_id,progress_value,summary,visibility) values(p_objective_id,current_user_id,p_progress_value,trim(p_summary),p_visibility) returning id into result;
  return result;
end $$;

create or replace function public.create_organization_objective(
  p_organization_id uuid,
  p_title text,
  p_description text default null,
  p_measurement text default 'percentage',
  p_target_value numeric default 100,
  p_unit text default '%',
  p_due_at timestamptz default null,
  p_assignees uuid[] default array[]::uuid[]
)
returns uuid language plpgsql security definer set search_path='' as $$
declare current_user_id uuid:=(select auth.uid()); new_objective_id uuid; assignee_id uuid;
begin
  if current_user_id is null then raise exception 'UNAUTHENTICATED'; end if;
  if (select private.organization_role(p_organization_id)) not in ('owner','admin','manager') then raise exception 'FORBIDDEN'; end if;
  if not (select private.organization_collaboration_enabled(p_organization_id)) then raise exception 'COMPANY_PLAN_REQUIRED'; end if;
  if char_length(trim(coalesce(p_title,''))) not between 1 and 180 or p_measurement not in ('percentage','numeric','binary','milestones') or p_target_value is not null and p_target_value<0 or p_description is not null and char_length(p_description)>2000 or p_unit is not null and char_length(p_unit)>40 then raise exception 'INVALID_OBJECTIVE'; end if;
  foreach assignee_id in array coalesce(p_assignees,array[]::uuid[]) loop
    if not exists(select 1 from public.organization_members where organization_id=p_organization_id and user_id=assignee_id and status='active') then raise exception 'INVALID_ASSIGNEE'; end if;
  end loop;
  insert into public.organization_objectives(organization_id,title,description,measurement,target_value,unit,due_at,created_by) values(p_organization_id,trim(p_title),nullif(trim(coalesce(p_description,'')),''),p_measurement,p_target_value,nullif(trim(coalesce(p_unit,'')),''),p_due_at,current_user_id) returning id into new_objective_id;
  insert into public.organization_assignments(objective_id,user_id,assigned_by) select new_objective_id,member_id,current_user_id from unnest(coalesce(p_assignees,array[]::uuid[])) member_id on conflict(objective_id,user_id) do nothing;
  return new_objective_id;
end $$;

create or replace function public.manage_organization_member(p_organization_id uuid,p_user_id uuid,p_action text,p_role text default null)
returns void language plpgsql security definer set search_path='' as $$
declare actor_role text:=(select private.organization_role(p_organization_id)); target_role text;
begin
  if actor_role not in ('owner','admin') then raise exception 'FORBIDDEN'; end if;
  select role into target_role from public.organization_members where organization_id=p_organization_id and user_id=p_user_id for update;
  if not found then raise exception 'MEMBER_NOT_FOUND'; end if;
  if target_role='owner' then raise exception 'OWNER_IMMUTABLE'; end if;
  if actor_role='admin' and (target_role='admin' or p_role='admin') then raise exception 'OWNER_REQUIRED'; end if;
  if p_action<>'suspend' and not (select private.organization_collaboration_enabled(p_organization_id)) then raise exception 'COMPANY_PLAN_REQUIRED'; end if;
  if p_action='change_role' then
    if p_role not in ('admin','manager','member') then raise exception 'INVALID_ROLE'; end if;
    update public.organization_members set role=p_role where organization_id=p_organization_id and user_id=p_user_id;
  elsif p_action='suspend' then
    update public.organization_members set status='suspended' where organization_id=p_organization_id and user_id=p_user_id;
  elsif p_action='reactivate' then
    update public.organization_members set status='active' where organization_id=p_organization_id and user_id=p_user_id;
  else raise exception 'INVALID_ACTION'; end if;
end $$;
