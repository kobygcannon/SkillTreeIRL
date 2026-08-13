alter table public.habits
  add column minimum_target numeric check (minimum_target > 0),
  add column minimum_unit text check (minimum_unit is null or length(trim(minimum_unit)) between 1 and 40),
  add column updated_at timestamptz not null default now();

create unique index one_habit_reminder on public.reminders(user_id,entity_id)
  where reminder_type='habit';

create or replace function public.validate_habit_integrity() returns trigger language plpgsql set search_path='' as $$
declare day_value jsonb;
begin
  if tg_op='UPDATE' and new.user_id<>old.user_id then raise exception 'HABIT_OWNER_IMMUTABLE'; end if;
  if new.goal_id is not null and not exists(select 1 from public.goals where id=new.goal_id and user_id=new.user_id) then raise exception 'INVALID_GOAL_LINK'; end if;
  if jsonb_typeof(new.frequency)<>'object' or jsonb_typeof(new.frequency->'days')<>'array' or jsonb_array_length(new.frequency->'days') not between 1 and 7 then raise exception 'INVALID_FREQUENCY'; end if;
  for day_value in select value from jsonb_array_elements(new.frequency->'days') loop
    if jsonb_typeof(day_value)<>'number' or (day_value #>> '{}')::integer not between 1 and 7 then raise exception 'INVALID_FREQUENCY'; end if;
  end loop;
  return new;
end $$;
create trigger habit_integrity before insert or update on public.habits for each row execute function public.validate_habit_integrity();

create or replace function public.configure_habit(
  p_habit_id uuid,
  p_name text,
  p_frequency jsonb,
  p_timezone text,
  p_goal_id uuid,
  p_skill_ids uuid[],
  p_xp_reward integer,
  p_minimum_target numeric,
  p_minimum_unit text,
  p_start_date date,
  p_end_date date,
  p_reminder_next_run timestamptz,
  p_reminder_schedule jsonb
) returns public.habits language plpgsql security definer set search_path='' as $$
declare h public.habits; skill_id uuid; day_value jsonb;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  select * into h from public.habits where id=p_habit_id and user_id=(select auth.uid()) for update;
  if not found then raise exception 'HABIT_NOT_FOUND'; end if;
  if length(trim(p_name)) not between 1 and 180 then raise exception 'INVALID_NAME'; end if;
  if p_xp_reward not between 0 and 500 then raise exception 'INVALID_XP'; end if;
  if p_minimum_target is not null and p_minimum_target<=0 then raise exception 'INVALID_MINIMUM_TARGET'; end if;
  if p_minimum_target is not null and length(trim(coalesce(p_minimum_unit,''))) not between 1 and 40 then raise exception 'INVALID_MINIMUM_UNIT'; end if;
  if p_end_date is not null and p_end_date<p_start_date then raise exception 'INVALID_DATE_RANGE'; end if;
  if jsonb_typeof(p_frequency)<>'object' or jsonb_typeof(p_frequency->'days')<>'array' or jsonb_array_length(p_frequency->'days') not between 1 and 7 then raise exception 'INVALID_FREQUENCY'; end if;
  for day_value in select value from jsonb_array_elements(p_frequency->'days') loop
    if jsonb_typeof(day_value)<>'number' or (day_value #>> '{}')::integer not between 1 and 7 then raise exception 'INVALID_FREQUENCY'; end if;
  end loop;
  if p_goal_id is not null and not exists(select 1 from public.goals where id=p_goal_id and user_id=(select auth.uid())) then raise exception 'INVALID_GOAL_LINK'; end if;
  foreach skill_id in array coalesce(p_skill_ids,array[]::uuid[]) loop
    if not exists(select 1 from public.skills where id=skill_id and user_id=(select auth.uid())) then raise exception 'INVALID_SKILL_LINK'; end if;
  end loop;
  update public.habits set name=trim(p_name),frequency=p_frequency,timezone=p_timezone,goal_id=p_goal_id,
    xp_reward=p_xp_reward,minimum_target=p_minimum_target,minimum_unit=nullif(trim(p_minimum_unit),''),
    start_date=p_start_date,end_date=p_end_date,updated_at=now() where id=p_habit_id returning * into h;
  delete from public.habit_skill_links where habit_id=p_habit_id;
  foreach skill_id in array coalesce(p_skill_ids,array[]::uuid[]) loop
    insert into public.habit_skill_links(habit_id,skill_id,user_id,weight) values(p_habit_id,skill_id,(select auth.uid()),1);
  end loop;
  if p_reminder_next_run is null then
    delete from public.reminders where user_id=(select auth.uid()) and reminder_type='habit' and entity_id=p_habit_id;
  else
    insert into public.reminders(user_id,reminder_type,entity_id,title,schedule,timezone,next_run_at,enabled)
    values((select auth.uid()),'habit',p_habit_id,'Time for '||trim(p_name),coalesce(p_reminder_schedule,'{"kind":"recurring","intervalDays":1}'::jsonb),p_timezone,p_reminder_next_run,true)
    on conflict(user_id,entity_id) where reminder_type='habit' do update set title=excluded.title,schedule=excluded.schedule,timezone=excluded.timezone,next_run_at=excluded.next_run_at,enabled=true,updated_at=now();
  end if;
  return h;
end $$;

revoke all on function public.configure_habit(uuid,text,jsonb,text,uuid,uuid[],integer,numeric,text,date,date,timestamptz,jsonb) from public,anon;
grant execute on function public.configure_habit(uuid,text,jsonb,text,uuid,uuid[],integer,numeric,text,date,date,timestamptz,jsonb) to authenticated;

create or replace function public.create_configured_habit(p_name text,p_frequency jsonb,p_timezone text,p_goal_id uuid,p_skill_ids uuid[],p_xp_reward integer,p_minimum_target numeric,p_minimum_unit text,p_start_date date,p_end_date date,p_reminder_next_run timestamptz,p_reminder_schedule jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
  result=public.create_planned_habit(p_name,p_frequency,p_timezone,p_goal_id,null,p_xp_reward,p_start_date,p_end_date);
  perform public.configure_habit(result,p_name,p_frequency,p_timezone,p_goal_id,p_skill_ids,p_xp_reward,p_minimum_target,p_minimum_unit,p_start_date,p_end_date,p_reminder_next_run,p_reminder_schedule);
  return result;
end $$;
revoke all on function public.create_configured_habit(text,jsonb,text,uuid,uuid[],integer,numeric,text,date,date,timestamptz,jsonb) from public,anon;
grant execute on function public.create_configured_habit(text,jsonb,text,uuid,uuid[],integer,numeric,text,date,date,timestamptz,jsonb) to authenticated;
