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
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  new_objective_id uuid;
  assignee_id uuid;
begin
  if current_user_id is null then raise exception 'UNAUTHENTICATED'; end if;
  if (select private.organization_role(p_organization_id)) not in ('owner','admin','manager') then
    raise exception 'FORBIDDEN';
  end if;
  if char_length(trim(coalesce(p_title,''))) not between 1 and 180
    or p_measurement not in ('percentage','numeric','binary','milestones')
    or p_target_value is not null and p_target_value < 0
    or p_description is not null and char_length(p_description) > 2000
    or p_unit is not null and char_length(p_unit) > 40
  then raise exception 'INVALID_OBJECTIVE'; end if;

  foreach assignee_id in array coalesce(p_assignees,array[]::uuid[]) loop
    if not exists (
      select 1 from public.organization_members
      where organization_id=p_organization_id and user_id=assignee_id and status='active'
    ) then raise exception 'INVALID_ASSIGNEE'; end if;
  end loop;

  insert into public.organization_objectives(
    organization_id,title,description,measurement,target_value,unit,due_at,created_by
  ) values (
    p_organization_id,trim(p_title),nullif(trim(coalesce(p_description,'')),''),
    p_measurement,p_target_value,nullif(trim(coalesce(p_unit,'')),''),p_due_at,current_user_id
  ) returning id into new_objective_id;

  insert into public.organization_assignments(objective_id,user_id,assigned_by)
  select new_objective_id,member_id,current_user_id
  from unnest(coalesce(p_assignees,array[]::uuid[])) member_id
  on conflict (objective_id,user_id) do nothing;

  return new_objective_id;
end $$;

revoke insert on public.organization_objectives,public.organization_assignments from authenticated;
revoke all on function public.create_organization_objective(uuid,text,text,text,numeric,text,timestamptz,uuid[]) from public,anon;
grant execute on function public.create_organization_objective(uuid,text,text,text,numeric,text,timestamptz,uuid[]) to authenticated;
