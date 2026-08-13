alter table public.quests
  add column priority text not null default 'normal' check (priority in ('high','normal','low')),
  add column estimated_minutes integer check (estimated_minutes between 1 and 100000),
  add column updated_at timestamptz not null default now();

create table public.quest_dependencies (
  quest_id uuid not null references public.quests(id) on delete cascade,
  depends_on_quest_id uuid not null references public.quests(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (quest_id, depends_on_quest_id),
  check (quest_id <> depends_on_quest_id)
);

create table public.quest_subtasks (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references public.quests(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 180),
  completed_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.quest_dependencies enable row level security;
alter table public.quest_subtasks enable row level security;
create policy quest_dependencies_owner on public.quest_dependencies for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy quest_subtasks_owner on public.quest_subtasks for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.quest_dependencies, public.quest_subtasks to authenticated;
create index quest_dependencies_target_idx on public.quest_dependencies(depends_on_quest_id);
create index quest_subtasks_quest_idx on public.quest_subtasks(quest_id, sort_order, created_at);

create or replace function public.validate_quest_integrity() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op='UPDATE' and new.user_id <> old.user_id then raise exception 'QUEST_OWNER_IMMUTABLE'; end if;
  if new.goal_id is not null and not exists(select 1 from public.goals where id=new.goal_id and user_id=new.user_id) then raise exception 'INVALID_GOAL_LINK'; end if;
  if new.status='completed' and not exists(select 1 from public.quest_completions where quest_id=new.id and user_id=new.user_id and undone_at is null) then raise exception 'USE_COMPLETE_QUEST'; end if;
  if tg_op='UPDATE' and old.status='completed' and new.status<>'completed' and exists(select 1 from public.quest_completions where quest_id=new.id and user_id=new.user_id and undone_at is null) then raise exception 'USE_UNDO_QUEST'; end if;
  return new;
end $$;
create trigger quest_integrity before insert or update on public.quests for each row execute function public.validate_quest_integrity();

create or replace function public.validate_quest_child_ownership() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists(select 1 from public.quests where id=new.quest_id and user_id=new.user_id) then raise exception 'QUEST_NOT_FOUND'; end if;
  if tg_table_name='quest_dependencies' and not exists(select 1 from public.quests where id=(to_jsonb(new)->>'depends_on_quest_id')::uuid and user_id=new.user_id) then raise exception 'QUEST_NOT_FOUND'; end if;
  return new;
end $$;
create trigger quest_dependency_ownership before insert or update on public.quest_dependencies for each row execute function public.validate_quest_child_ownership();
create trigger quest_subtask_ownership before insert or update on public.quest_subtasks for each row execute function public.validate_quest_child_ownership();

create or replace function public.update_quest_plan(
  p_quest_id uuid,
  p_title text,
  p_description text,
  p_goal_id uuid,
  p_status public.quest_status,
  p_xp_reward integer,
  p_due_at timestamptz,
  p_priority text,
  p_estimated_minutes integer,
  p_recurrence jsonb,
  p_evidence_required boolean
) returns public.quests language plpgsql security invoker set search_path = '' as $$
declare q public.quests;
begin
  if length(trim(p_title)) not between 1 and 180 then raise exception 'INVALID_TITLE'; end if;
  if p_xp_reward not between 0 and 5000 then raise exception 'INVALID_XP'; end if;
  if p_priority not in ('high','normal','low') then raise exception 'INVALID_PRIORITY'; end if;
  if p_estimated_minutes is not null and p_estimated_minutes not between 1 and 100000 then raise exception 'INVALID_ESTIMATE'; end if;
  if p_status = 'completed' then raise exception 'USE_COMPLETE_QUEST'; end if;
  if p_goal_id is not null and not exists(select 1 from public.goals where id=p_goal_id and user_id=(select auth.uid())) then raise exception 'INVALID_GOAL_LINK'; end if;
  update public.quests set title=trim(p_title), description=nullif(trim(p_description),''), goal_id=p_goal_id,
    status=p_status, xp_reward=p_xp_reward, due_at=p_due_at, priority=p_priority,
    estimated_minutes=p_estimated_minutes, recurrence=p_recurrence,
    evidence_required=p_evidence_required, updated_at=now()
  where id=p_quest_id and user_id=(select auth.uid()) and status <> 'completed'
  returning * into q;
  if not found then raise exception 'QUEST_NOT_EDITABLE'; end if;
  return q;
end $$;

create or replace function public.add_quest_dependency(p_quest_id uuid, p_depends_on_quest_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if p_quest_id=p_depends_on_quest_id then raise exception 'SELF_DEPENDENCY'; end if;
  if not exists(select 1 from public.quests where id=p_quest_id and user_id=(select auth.uid()))
    or not exists(select 1 from public.quests where id=p_depends_on_quest_id and user_id=(select auth.uid())) then raise exception 'QUEST_NOT_FOUND'; end if;
  if exists(with recursive chain(id) as (
      select p_depends_on_quest_id union all
      select d.depends_on_quest_id from public.quest_dependencies d join chain c on d.quest_id=c.id
      where d.user_id=(select auth.uid())
    ) select 1 from chain where id=p_quest_id) then raise exception 'DEPENDENCY_CYCLE'; end if;
  insert into public.quest_dependencies(quest_id,depends_on_quest_id,user_id)
  values(p_quest_id,p_depends_on_quest_id,(select auth.uid())) on conflict do nothing;
end $$;

revoke all on function public.update_quest_plan(uuid,text,text,uuid,public.quest_status,integer,timestamptz,text,integer,jsonb,boolean) from public,anon;
grant execute on function public.update_quest_plan(uuid,text,text,uuid,public.quest_status,integer,timestamptz,text,integer,jsonb,boolean) to authenticated;
revoke all on function public.add_quest_dependency(uuid,uuid) from public,anon;
grant execute on function public.add_quest_dependency(uuid,uuid) to authenticated;

create or replace function public.configure_quest_skills(p_quest_id uuid,p_skill_ids uuid[],p_total_xp integer)
returns void language plpgsql security definer set search_path='' as $$
declare skill_id uuid; item_index integer=0; item_count integer; award integer;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  if not exists(select 1 from public.quests where id=p_quest_id and user_id=(select auth.uid()) and status<>'completed') then raise exception 'QUEST_NOT_EDITABLE'; end if;
  if p_total_xp not between 0 and 5000 then raise exception 'INVALID_XP'; end if;
  item_count=coalesce(array_length(p_skill_ids,1),0);
  foreach skill_id in array coalesce(p_skill_ids,array[]::uuid[]) loop
    if not exists(select 1 from public.skills where id=skill_id and user_id=(select auth.uid())) then raise exception 'INVALID_SKILL_LINK'; end if;
  end loop;
  delete from public.quest_skill_rewards where quest_id=p_quest_id;
  foreach skill_id in array coalesce(p_skill_ids,array[]::uuid[]) loop
    item_index=item_index+1;
    award=floor(p_total_xp::numeric/item_count)::integer + case when item_index<=mod(p_total_xp,item_count) then 1 else 0 end;
    if award>0 then insert into public.quest_skill_rewards(quest_id,skill_id,user_id,xp) values(p_quest_id,skill_id,(select auth.uid()),award); end if;
  end loop;
end $$;
revoke all on function public.configure_quest_skills(uuid,uuid[],integer) from public,anon;
grant execute on function public.configure_quest_skills(uuid,uuid[],integer) to authenticated;

create or replace function public.create_configured_quest(p_title text,p_description text,p_goal_id uuid,p_skill_ids uuid[],p_xp_reward integer,p_due_at timestamptz,p_evidence_required boolean,p_priority text,p_estimated_minutes integer,p_status public.quest_status,p_recurrence jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
  result=public.create_planned_quest(p_title,p_description,p_goal_id,null,p_xp_reward,p_due_at,p_evidence_required);
  perform public.configure_quest_skills(result,p_skill_ids,p_xp_reward);
  perform public.update_quest_plan(result,p_title,p_description,p_goal_id,p_status,p_xp_reward,p_due_at,p_priority,p_estimated_minutes,p_recurrence,p_evidence_required);
  return result;
end $$;
revoke all on function public.create_configured_quest(text,text,uuid,uuid[],integer,timestamptz,boolean,text,integer,public.quest_status,jsonb) from public,anon;
grant execute on function public.create_configured_quest(text,text,uuid,uuid[],integer,timestamptz,boolean,text,integer,public.quest_status,jsonb) to authenticated;
