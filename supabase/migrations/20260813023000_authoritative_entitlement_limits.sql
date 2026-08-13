create or replace function public.create_goal_with_limits(
  p_title text,p_description text,p_category text,p_measurement public.measurement_model,
  p_current_value numeric,p_target_value numeric,p_unit text,p_currency char(3),p_deadline timestamptz,p_priority text
) returns uuid language plpgsql security invoker set search_path='' as $$
declare owner uuid=(select auth.uid());result uuid;active_count integer;focus_count integer;allowed_focus_limit integer;unlimited boolean;
begin
  if owner is null then raise exception 'UNAUTHENTICATED';end if;
  perform pg_advisory_xact_lock(hashtextextended(owner::text,731));
  select exists(select 1 from public.entitlements where user_id=owner and entitlement in('pro','unlimited_active_goals') and(expires_at is null or expires_at>now())) into unlimited;
  select count(*) into active_count from public.goals where user_id=owner and status in('active','focus');
  if not unlimited and active_count>=10 then raise exception 'ACTIVE_GOAL_LIMIT';end if;
  if p_priority='focus' then
    select count(*) into focus_count from public.goals where user_id=owner and status='focus';
    select coalesce((select p.focus_limit from public.user_preferences p where p.user_id=owner),3) into allowed_focus_limit;
    if focus_count>=allowed_focus_limit then raise exception 'FOCUS_LIMIT';end if;
  end if;
  insert into public.goals(user_id,title,description,category,status,measurement,current_value,target_value,unit,currency,deadline,priority)
  values(owner,p_title,p_description,p_category,case when p_priority='focus' then 'focus'::public.goal_status else 'active'::public.goal_status end,p_measurement,p_current_value,p_target_value,p_unit,p_currency,p_deadline,p_priority)
  returning id into result;
  return result;
end $$;
revoke all on function public.create_goal_with_limits(text,text,text,public.measurement_model,numeric,numeric,text,char(3),timestamptz,text) from public,anon;
grant execute on function public.create_goal_with_limits(text,text,text,public.measurement_model,numeric,numeric,text,char(3),timestamptz,text) to authenticated;
