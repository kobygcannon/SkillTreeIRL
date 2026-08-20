create or replace function public.close_organization(p_organization_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'UNAUTHENTICATED'; end if;
  if not exists (
    select 1 from public.organizations
    where id=p_organization_id and owner_id=(select auth.uid())
  ) then raise exception 'OWNER_REQUIRED'; end if;
  delete from public.organizations where id=p_organization_id;
end $$;

revoke all on function public.close_organization(uuid) from public,anon;
grant execute on function public.close_organization(uuid) to authenticated;
