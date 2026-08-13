create or replace function public.update_support_ticket_admin(
  p_ticket_id uuid,
  p_admin_user_id uuid,
  p_status text,
  p_priority text,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  ticket public.support_tickets;
  clean_note text := nullif(trim(coalesce(p_note,'')), '');
begin
  if not exists(
    select 1 from public.admin_users
    where user_id=p_admin_user_id and role in ('support','admin','superadmin')
  ) then raise exception 'FORBIDDEN'; end if;
  if p_status is not null and p_status not in ('open','waiting_on_user','in_progress','resolved','closed') then
    raise exception 'INVALID_STATUS';
  end if;
  if p_priority is not null and p_priority not in ('low','normal','high','urgent') then
    raise exception 'INVALID_PRIORITY';
  end if;
  if clean_note is not null and length(clean_note)>5000 then raise exception 'NOTE_TOO_LONG'; end if;

  update public.support_tickets
  set status=coalesce(p_status,status),
      priority=coalesce(p_priority,priority),
      resolved_at=case
        when p_status='resolved' then coalesce(resolved_at,now())
        when p_status is not null then null
        else resolved_at
      end,
      updated_at=now()
  where id=p_ticket_id
  returning * into ticket;
  if not found then raise exception 'SUPPORT_TICKET_NOT_FOUND'; end if;

  if clean_note is not null then
    insert into private.support_notes(ticket_id,admin_user_id,note)
    values(ticket.id,p_admin_user_id,clean_note);
  end if;
  insert into public.audit_events(user_id,event_type,object_type,object_id,metadata)
  values(p_admin_user_id,'admin.support.updated','support_ticket',ticket.id,
    jsonb_build_object('status',p_status,'priority',p_priority,'noteAdded',clean_note is not null));
  return to_jsonb(ticket);
end;
$$;

revoke execute on function public.update_support_ticket_admin(uuid,uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.update_support_ticket_admin(uuid,uuid,text,text,text) to service_role;

create or replace function public.apply_moderation_action(
  p_flag_id uuid,
  p_admin_user_id uuid,
  p_action text,
  p_resolution text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  flag public.moderation_flags;
  result public.moderation_flags;
  next_status text;
  clean_resolution text := nullif(left(trim(coalesce(p_resolution,'')),1000),'');
begin
  if not exists(
    select 1 from public.admin_users
    where user_id=p_admin_user_id and role in ('moderator','admin','superadmin')
  ) then raise exception 'FORBIDDEN'; end if;
  if p_action not in ('review','dismiss','hide') then raise exception 'INVALID_ACTION'; end if;

  select * into flag from public.moderation_flags where id=p_flag_id for update;
  if not found then raise exception 'MODERATION_FLAG_NOT_FOUND'; end if;
  if flag.status not in ('open','reviewing') then raise exception 'FLAG_ALREADY_RESOLVED'; end if;
  if p_action='hide' then
    if flag.object_type<>'template' then raise exception 'UNSUPPORTED_OBJECT'; end if;
    update public.templates set moderation_status='hidden' where id=flag.object_id;
    if not found then raise exception 'MODERATED_OBJECT_NOT_FOUND'; end if;
  end if;

  next_status := case p_action when 'review' then 'reviewing' when 'dismiss' then 'dismissed' else 'resolved' end;
  update public.moderation_flags
  set status=next_status,assigned_to=p_admin_user_id,resolution=clean_resolution,
      resolved_at=case when next_status='reviewing' then null else now() end
  where id=flag.id returning * into result;
  insert into public.audit_events(user_id,event_type,object_type,object_id,metadata)
  values(p_admin_user_id,'admin.moderation_'||p_action,flag.object_type,flag.object_id,
    jsonb_build_object('flagId',flag.id,'resolution',clean_resolution));
  return to_jsonb(result);
end;
$$;

revoke execute on function public.apply_moderation_action(uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function public.apply_moderation_action(uuid,uuid,text,text) to service_role;
