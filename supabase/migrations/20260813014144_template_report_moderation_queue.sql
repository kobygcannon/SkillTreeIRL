create or replace function private.enqueue_template_moderation_flag()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  insert into public.moderation_flags(reporter_id,object_type,object_id,reason)
  values(new.reporter_id,'template',new.template_id,new.reason);
  update public.templates set moderation_status='pending' where id=new.template_id and visibility='public';
  return new;
end
$$;
revoke all on function private.enqueue_template_moderation_flag() from public,anon,authenticated;
drop trigger if exists template_report_moderation_flag on public.template_reports;
create trigger template_report_moderation_flag after insert on public.template_reports for each row execute function private.enqueue_template_moderation_flag();
