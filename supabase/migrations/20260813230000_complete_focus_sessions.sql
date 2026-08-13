alter table public.focus_sessions drop constraint if exists focus_sessions_status_check;
alter table public.focus_sessions add constraint focus_sessions_status_check check(status in('planned','running','paused','completed','cancelled'));
alter table public.focus_sessions
  add column if not exists active_seconds integer not null default 0 check(active_seconds>=0),
  add column if not exists segment_started_at timestamptz,
  add column if not exists paused_at timestamptz,
  add column if not exists activity_id uuid unique references public.activities(id) on delete set null;
update public.focus_sessions set segment_started_at=started_at where status='running' and segment_started_at is null;
drop index if exists public.one_running_focus_session_per_user;
create unique index if not exists one_active_focus_session_per_user on public.focus_sessions(user_id) where status in('running','paused');

create or replace function public.transition_focus_session(p_session_id uuid,p_action text,p_description text,p_result text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare session public.focus_sessions; elapsed integer; created_activity uuid; linked_goal uuid; description text;
begin
 if (select auth.uid()) is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
 select * into session from public.focus_sessions where id=p_session_id and user_id=(select auth.uid()) for update;
 if not found then raise exception 'FOCUS_SESSION_NOT_FOUND'; end if;
 if p_action='pause' then
  if session.status='paused' then return jsonb_build_object('id',session.id,'status',session.status,'started_at',session.started_at,'active_seconds',session.active_seconds,'segment_started_at',session.segment_started_at,'activity_id',session.activity_id); end if;
  if session.status<>'running' then raise exception 'INVALID_FOCUS_TRANSITION'; end if;
  elapsed=session.active_seconds+greatest(0,extract(epoch from (now()-coalesce(session.segment_started_at,session.started_at)))::integer);
  update public.focus_sessions set status='paused',active_seconds=elapsed,segment_started_at=null,paused_at=now() where id=session.id returning * into session;
 elsif p_action='resume' then
  if session.status='running' then return jsonb_build_object('id',session.id,'status',session.status,'started_at',session.started_at,'active_seconds',session.active_seconds,'segment_started_at',session.segment_started_at,'activity_id',session.activity_id); end if;
  if session.status<>'paused' then raise exception 'INVALID_FOCUS_TRANSITION'; end if;
  update public.focus_sessions set status='running',segment_started_at=now(),paused_at=null where id=session.id returning * into session;
 elsif p_action='cancel' then
  if session.status='cancelled' then return jsonb_build_object('id',session.id,'status',session.status,'started_at',session.started_at,'active_seconds',session.active_seconds,'segment_started_at',session.segment_started_at,'activity_id',session.activity_id); end if;
  if session.status not in('running','paused') then raise exception 'INVALID_FOCUS_TRANSITION'; end if;
  elapsed=session.active_seconds+case when session.status='running' then greatest(0,extract(epoch from (now()-coalesce(session.segment_started_at,session.started_at)))::integer) else 0 end;
  update public.focus_sessions set status='cancelled',active_seconds=elapsed,segment_started_at=null,paused_at=null,ended_at=now(),notes=coalesce(nullif(trim(p_result),''),notes) where id=session.id returning * into session;
 elsif p_action='complete' then
  if session.status='completed' and session.activity_id is not null then return jsonb_build_object('id',session.id,'status',session.status,'started_at',session.started_at,'active_seconds',session.active_seconds,'segment_started_at',session.segment_started_at,'activity_id',session.activity_id); end if;
  if session.status not in('running','paused') then raise exception 'INVALID_FOCUS_TRANSITION'; end if;
  elapsed=session.active_seconds+case when session.status='running' then greatest(0,extract(epoch from (now()-coalesce(session.segment_started_at,session.started_at)))::integer) else 0 end;
  linked_goal=session.goal_id;
  if linked_goal is null and session.quest_id is not null then select goal_id into linked_goal from public.quests where id=session.quest_id and user_id=session.user_id; end if;
  description=coalesce(nullif(trim(p_description),''),(select title from public.quests where id=session.quest_id and user_id=session.user_id),(select title from public.goals where id=linked_goal and user_id=session.user_id),'Focus session');
  created_activity=public.log_activity(
   description,session.started_at,greatest(1,ceil(elapsed/60.0)::integer),null,null,'moderate',
   case when linked_goal is null then array[]::uuid[] else array[linked_goal] end,
   '[]'::jsonb,nullif(trim(p_result),''),'focus:'||session.id
  );
  update public.focus_sessions set status='completed',active_seconds=elapsed,segment_started_at=null,paused_at=null,ended_at=now(),activity_id=created_activity,notes=nullif(trim(p_result),'') where id=session.id returning * into session;
 else raise exception 'INVALID_FOCUS_ACTION'; end if;
 return jsonb_build_object('id',session.id,'status',session.status,'started_at',session.started_at,'active_seconds',session.active_seconds,'segment_started_at',session.segment_started_at,'activity_id',session.activity_id);
end $$;
revoke execute on function public.transition_focus_session(uuid,text,text,text) from public,anon;
grant execute on function public.transition_focus_session(uuid,text,text,text) to authenticated;
