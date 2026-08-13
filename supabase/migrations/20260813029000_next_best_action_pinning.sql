alter table public.quests add column pinned_at timestamptz;
alter table public.quests add column recurrence_parent_id uuid unique references public.quests(id) on delete set null;
create or replace function public.clear_inactive_quest_pin() returns trigger language plpgsql set search_path='' as $$
begin
  if new.status in ('completed','skipped','cancelled') then new.pinned_at=null; end if;
  return new;
end $$;
create trigger quest_clear_inactive_pin before insert or update on public.quests for each row execute function public.clear_inactive_quest_pin();
create unique index one_pinned_quest_per_user on public.quests(user_id) where pinned_at is not null and status in ('planned','ready','in_progress','overdue');

create or replace function public.set_pinned_quest(p_quest_id uuid,p_pinned boolean)
returns void language plpgsql security invoker set search_path='' as $$
begin
  if not exists(select 1 from public.quests where id=p_quest_id and user_id=(select auth.uid()) and status in ('planned','ready','in_progress','overdue')) then raise exception 'QUEST_NOT_PINNABLE'; end if;
  if p_pinned then
    update public.quests set pinned_at=null,updated_at=now() where user_id=(select auth.uid()) and pinned_at is not null;
    update public.quests set pinned_at=now(),updated_at=now() where id=p_quest_id and user_id=(select auth.uid());
  else
    update public.quests set pinned_at=null,updated_at=now() where id=p_quest_id and user_id=(select auth.uid());
  end if;
end $$;
revoke all on function public.set_pinned_quest(uuid,boolean) from public,anon;
grant execute on function public.set_pinned_quest(uuid,boolean) to authenticated;

create or replace function public.update_configured_quest(p_quest_id uuid,p_title text,p_description text,p_goal_id uuid,p_skill_ids uuid[],p_status public.quest_status,p_xp_reward integer,p_due_at timestamptz,p_priority text,p_estimated_minutes integer,p_recurrence jsonb,p_evidence_required boolean)
returns public.quests language plpgsql security definer set search_path='' as $$
declare result public.quests;
begin
  if p_recurrence is not null and (p_recurrence->>'kind'<>'recurring' or (p_recurrence->>'intervalDays') is null or (p_recurrence->>'intervalDays')::integer not between 1 and 3650) then raise exception 'INVALID_RECURRENCE'; end if;
  result=public.update_quest_plan(p_quest_id,p_title,p_description,p_goal_id,p_status,p_xp_reward,p_due_at,p_priority,p_estimated_minutes,p_recurrence,p_evidence_required);
  perform public.configure_quest_skills(p_quest_id,p_skill_ids,p_xp_reward);
  return result;
end $$;
revoke all on function public.update_configured_quest(uuid,text,text,uuid,uuid[],public.quest_status,integer,timestamptz,text,integer,jsonb,boolean) from public,anon;
grant execute on function public.update_configured_quest(uuid,text,text,uuid,uuid[],public.quest_status,integer,timestamptz,text,integer,jsonb,boolean) to authenticated;

create or replace function public.spawn_recurring_quest() returns trigger language plpgsql security definer set search_path='' as $$
declare next_id uuid; interval_days integer;
begin
  if new.status='completed' and old.status<>'completed' and new.recurrence->>'kind'='recurring' and not exists(select 1 from public.quests where recurrence_parent_id=new.id) then
    interval_days=greatest(1,least(3650,coalesce((new.recurrence->>'intervalDays')::integer,7)));
    insert into public.quests(user_id,title,description,goal_id,status,xp_reward,due_at,recurrence,evidence_required,priority,estimated_minutes,recurrence_parent_id)
    values(new.user_id,new.title,new.description,new.goal_id,'ready',new.xp_reward,coalesce(new.due_at,now())+make_interval(days=>interval_days),new.recurrence,new.evidence_required,new.priority,new.estimated_minutes,new.id)
    returning id into next_id;
    insert into public.quest_skill_rewards(quest_id,skill_id,user_id,xp) select next_id,skill_id,user_id,xp from public.quest_skill_rewards where quest_id=new.id;
  end if;
  return new;
end $$;
create trigger quest_spawn_recurrence after update of status on public.quests for each row execute function public.spawn_recurring_quest();
