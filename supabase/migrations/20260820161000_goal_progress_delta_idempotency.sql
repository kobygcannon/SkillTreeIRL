create or replace function public.add_goal_progress(
  p_goal_id uuid,
  p_delta numeric,
  p_note text,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  g public.goals;
  event_id uuid;
  next_value numeric;
  milestone record;
begin
  if current_user_id is null then raise exception 'UNAUTHENTICATED'; end if;
  if p_delta is null or p_delta <= 0 then raise exception 'INVALID_PROGRESS_DELTA'; end if;
  if p_idempotency_key is null or length(p_idempotency_key) < 8 then raise exception 'IDEMPOTENCY_KEY_REQUIRED'; end if;

  select id into event_id
  from public.goal_progress_events
  where user_id = current_user_id
    and metadata->>'idempotencyKey' = p_idempotency_key;
  if event_id is not null then return event_id; end if;

  select * into g
  from public.goals
  where id = p_goal_id and user_id = current_user_id
  for update;
  if not found then raise exception 'GOAL_NOT_FOUND'; end if;

  -- A retry can pass the first lookup while another request owns the row lock.
  -- Recheck after serialization so the retry returns the original event.
  select id into event_id
  from public.goal_progress_events
  where user_id = current_user_id
    and metadata->>'idempotencyKey' = p_idempotency_key;
  if event_id is not null then return event_id; end if;

  if g.measurement in ('binary','milestones','composite') then
    raise exception 'DELTA_NOT_SUPPORTED';
  end if;

  next_value := g.current_value + p_delta;
  if g.measurement = 'percentage' and next_value > 100 then
    raise exception 'PERCENTAGE_EXCEEDS_100';
  end if;

  insert into public.goal_progress_events(user_id,goal_id,value,delta,note,metadata)
  values(current_user_id,g.id,next_value,p_delta,nullif(trim(p_note),''),
         jsonb_build_object('idempotencyKey',p_idempotency_key,'entryMode','add'))
  returning id into event_id;

  update public.goals set current_value=next_value,updated_at=now() where id=g.id;
  for milestone in
    select * from public.goal_milestones
    where goal_id=g.id and completed_at is null
      and threshold_value is not null and threshold_value<=next_value
    order by threshold_value
  loop
    update public.goal_milestones set completed_at=now() where id=milestone.id;
  end loop;
  return event_id;
end $$;

revoke all on function public.add_goal_progress(uuid,numeric,text,text) from public,anon;
grant execute on function public.add_goal_progress(uuid,numeric,text,text) to authenticated;
