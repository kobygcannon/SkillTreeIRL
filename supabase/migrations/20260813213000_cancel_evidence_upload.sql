create or replace function public.cancel_evidence_upload(p_storage_path text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid := (select auth.uid());
begin
  if owner is null or p_storage_path not like owner::text||'/%' then raise exception 'FORBIDDEN_PATH'; end if;
  delete from public.evidence_upload_reservations
  where storage_path=p_storage_path and user_id=owner and attached_at is null;
  return found;
end;
$$;

revoke execute on function public.cancel_evidence_upload(text) from public, anon;
grant execute on function public.cancel_evidence_upload(text) to authenticated;
