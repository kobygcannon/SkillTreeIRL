create or replace function public.manage_organization_member(
  p_organization_id uuid,
  p_user_id uuid,
  p_action text,
  p_role text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_role text := (select private.organization_role(p_organization_id));
  target_role text;
begin
  if actor_role not in ('owner','admin') then raise exception 'FORBIDDEN'; end if;
  select role into target_role from public.organization_members
  where organization_id=p_organization_id and user_id=p_user_id for update;
  if not found then raise exception 'MEMBER_NOT_FOUND'; end if;
  if target_role='owner' then raise exception 'OWNER_IMMUTABLE'; end if;
  if actor_role='admin' and (target_role='admin' or p_role='admin') then
    raise exception 'OWNER_REQUIRED';
  end if;

  if p_action='change_role' then
    if p_role not in ('admin','manager','member') then raise exception 'INVALID_ROLE'; end if;
    update public.organization_members set role=p_role
    where organization_id=p_organization_id and user_id=p_user_id;
  elsif p_action='suspend' then
    update public.organization_members set status='suspended'
    where organization_id=p_organization_id and user_id=p_user_id;
  elsif p_action='reactivate' then
    update public.organization_members set status='active'
    where organization_id=p_organization_id and user_id=p_user_id;
  else
    raise exception 'INVALID_ACTION';
  end if;
end $$;

revoke delete on public.organization_members from authenticated;
revoke all on function public.manage_organization_member(uuid,uuid,text,text) from public,anon;
grant execute on function public.manage_organization_member(uuid,uuid,text,text) to authenticated;
