create unique index goal_milestone_threshold_unique on public.goal_milestones(goal_id,threshold_value) where threshold_value is not null;
create index goal_dependencies_reverse_idx on public.goal_dependencies(depends_on_goal_id);

create or replace function public.record_goal_progress(p_goal_id uuid,p_value numeric,p_note text,p_idempotency_key text) returns uuid language plpgsql security invoker set search_path='' as $$
declare g public.goals; event_id uuid; milestone record;
begin
 if p_value is null then raise exception 'INVALID_PROGRESS_VALUE'; end if;
 if p_idempotency_key is null or length(p_idempotency_key)<8 then raise exception 'IDEMPOTENCY_KEY_REQUIRED'; end if;
 select * into g from public.goals where id=p_goal_id and user_id=(select auth.uid()) for update; if not found then raise exception 'GOAL_NOT_FOUND'; end if;
 select id into event_id from public.goal_progress_events where user_id=(select auth.uid()) and metadata->>'idempotencyKey'=p_idempotency_key; if event_id is not null then return event_id; end if;
 insert into public.goal_progress_events(user_id,goal_id,value,delta,note,metadata) values((select auth.uid()),g.id,p_value,p_value-g.current_value,p_note,jsonb_build_object('idempotencyKey',p_idempotency_key)) returning id into event_id;
 update public.goals set current_value=p_value,updated_at=now() where id=g.id;
 for milestone in select * from public.goal_milestones where goal_id=g.id and completed_at is null and threshold_value is not null and threshold_value<=p_value order by threshold_value loop update public.goal_milestones set completed_at=now() where id=milestone.id; end loop;
 return event_id;
end $$;

alter table public.goal_progress_events add column if not exists metadata jsonb not null default '{}';
create unique index goal_progress_idempotency_unique on public.goal_progress_events(user_id,((metadata->>'idempotencyKey'))) where metadata ? 'idempotencyKey';

create or replace function public.change_goal_target(p_goal_id uuid,p_target numeric,p_unit text,p_currency text,p_reason text,p_idempotency_key text) returns uuid language plpgsql security invoker set search_path='' as $$
declare g public.goals; revision_id uuid;
begin
 if p_target is not null and p_target<0 then raise exception 'INVALID_TARGET'; end if;
 select * into g from public.goals where id=p_goal_id and user_id=(select auth.uid()) for update; if not found then raise exception 'GOAL_NOT_FOUND'; end if;
 select id into revision_id from public.goal_revisions where user_id=(select auth.uid()) and new_data->>'idempotencyKey'=p_idempotency_key; if revision_id is not null then return revision_id; end if;
 insert into public.goal_revisions(user_id,goal_id,previous_data,new_data,reason) values((select auth.uid()),g.id,jsonb_build_object('target',g.target_value,'unit',g.unit,'currency',g.currency),jsonb_build_object('target',p_target,'unit',p_unit,'currency',p_currency,'idempotencyKey',p_idempotency_key),p_reason) returning id into revision_id;
 update public.goals set target_value=p_target,unit=p_unit,currency=p_currency,updated_at=now() where id=g.id;
 return revision_id;
end $$;
create unique index goal_revision_idempotency_unique on public.goal_revisions(user_id,((new_data->>'idempotencyKey'))) where new_data ? 'idempotencyKey';

create or replace function public.transition_goal(p_goal_id uuid,p_status public.goal_status,p_reason text) returns public.goal_status language plpgsql security invoker set search_path='' as $$
declare g public.goals; focus_count integer; focus_limit integer;
begin
 select * into g from public.goals where id=p_goal_id and user_id=(select auth.uid()) for update; if not found then raise exception 'GOAL_NOT_FOUND'; end if;
 if g.status in('completed','abandoned','archived') and p_status='focus' then raise exception 'INVALID_TRANSITION'; end if;
 if p_status='focus' then select count(*) into focus_count from public.goals where user_id=(select auth.uid()) and status='focus' and id<>g.id; select up.focus_limit into focus_limit from public.user_preferences up where up.user_id=(select auth.uid()); if focus_count>=coalesce(focus_limit,3) then raise exception 'FOCUS_LIMIT'; end if; end if;
 insert into public.goal_revisions(user_id,goal_id,previous_data,new_data,reason) values((select auth.uid()),g.id,jsonb_build_object('status',g.status),jsonb_build_object('status',p_status),p_reason);
 update public.goals set status=p_status,archived_at=case when p_status='archived' then now() else archived_at end,updated_at=now() where id=g.id;
 return p_status;
end $$;

revoke all on function public.record_goal_progress(uuid,numeric,text,text),public.change_goal_target(uuid,numeric,text,text,text,text),public.transition_goal(uuid,public.goal_status,text) from public,anon;
grant execute on function public.record_goal_progress(uuid,numeric,text,text),public.change_goal_target(uuid,numeric,text,text,text,text),public.transition_goal(uuid,public.goal_status,text) to authenticated;
