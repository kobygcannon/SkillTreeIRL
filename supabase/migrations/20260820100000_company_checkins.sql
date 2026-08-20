create or replace function public.submit_organization_checkin(p_objective_id uuid,p_progress_value numeric,p_summary text,p_visibility text default 'managers')
returns uuid language plpgsql security invoker set search_path='' as $$
declare current_user_id uuid=(select auth.uid()); result uuid; objective_target numeric; objective_measurement text;
begin
  if current_user_id is null then raise exception 'UNAUTHENTICATED'; end if;
  if p_progress_value is null or p_progress_value<0 or char_length(trim(p_summary)) not between 1 and 2000 or p_visibility not in ('managers','workspace') then raise exception 'INVALID_CHECKIN'; end if;
  if not exists(select 1 from public.organization_assignments where objective_id=p_objective_id and user_id=current_user_id) then raise exception 'ASSIGNMENT_NOT_FOUND'; end if;
  select target_value,measurement into objective_target,objective_measurement from public.organization_objectives where id=p_objective_id;
  update public.organization_assignments set current_value=p_progress_value,status=case when (objective_measurement='binary' and p_progress_value>=1) or (objective_target is not null and p_progress_value>=objective_target) then 'completed' else 'in_progress' end,completed_at=case when (objective_measurement='binary' and p_progress_value>=1) or (objective_target is not null and p_progress_value>=objective_target) then now() else null end where objective_id=p_objective_id and user_id=current_user_id;
  insert into public.organization_checkins(objective_id,user_id,progress_value,summary,visibility) values(p_objective_id,current_user_id,p_progress_value,trim(p_summary),p_visibility) returning id into result;
  return result;
end $$;
revoke all on function public.submit_organization_checkin(uuid,numeric,text,text) from public,anon;
grant execute on function public.submit_organization_checkin(uuid,numeric,text,text) to authenticated;
