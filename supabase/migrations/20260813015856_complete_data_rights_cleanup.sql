create or replace function public.prepare_user_deletion(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path=''
as $$
begin
  if p_user_id is null then raise exception 'USER_REQUIRED'; end if;
  delete from public.background_jobs where job_type='process_import' and payload->>'importId' in(select id::text from public.imports where user_id=p_user_id);
  delete from public.templates where owner_id=p_user_id;
  delete from public.referrals where referred_id=p_user_id;
  delete from public.moderation_flags where reporter_id=p_user_id;
  delete from public.product_events where user_id=p_user_id;
  delete from public.audit_events where user_id=p_user_id;
  insert into public.audit_events(user_id,event_type,object_type,metadata) values(p_user_id,'account.deletion_requested','account',jsonb_build_object('method','self_service'));
end
$$;
revoke all on function public.prepare_user_deletion(uuid) from public,anon,authenticated;
grant execute on function public.prepare_user_deletion(uuid) to service_role;
