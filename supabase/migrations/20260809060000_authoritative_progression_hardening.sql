-- Progression ledgers and reward allocations must only be mutated through validated functions.
revoke insert, update, delete on public.xp_transactions from authenticated;
revoke insert, update, delete on public.goal_progress_events from authenticated;
revoke insert, update, delete on public.quest_completions from authenticated;
revoke insert, update, delete on public.quest_skill_rewards from authenticated;
revoke insert, update, delete on public.habit_skill_links from authenticated;
revoke insert, update, delete on public.activity_skill_links from authenticated;
revoke insert, update, delete on public.achievement_unlocks from authenticated;
revoke insert, update, delete on public.activities from authenticated;
revoke insert, update, delete on public.activity_goal_links from authenticated;
revoke insert, update, delete on public.activity_evidence from authenticated;
revoke update on public.profiles from authenticated;
grant update(display_name,timezone,updated_at,public_slug,visibility,bio,accent,featured_achievement_keys) on public.profiles to authenticated;

alter function public.log_activity(text,timestamptz,integer,numeric,text,text,uuid[],jsonb,text,text) security definer;
alter function public.complete_quest(uuid,text) security definer;
alter function public.complete_habit(uuid,date,text,text,text) security definer;
alter function public.reverse_xp(uuid,text) security definer;
alter function public.record_goal_progress(uuid,numeric,text,text) security definer;
alter function public.evaluate_achievements() security definer;

create or replace function public.create_planned_quest(
  p_title text,
  p_description text,
  p_goal_id uuid,
  p_skill_id uuid,
  p_xp_reward integer,
  p_due_at timestamptz,
  p_evidence_required boolean
) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; chosen_skill uuid;
begin
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
  if length(trim(p_title)) not between 1 and 180 then raise exception 'INVALID_TITLE'; end if;
  if p_xp_reward not between 0 and 500 then raise exception 'INVALID_XP_REWARD'; end if;
  if p_goal_id is not null and not exists(select 1 from public.goals where id=p_goal_id and user_id=(select auth.uid())) then raise exception 'GOAL_NOT_FOUND'; end if;
  if p_skill_id is not null and not exists(select 1 from public.skills where id=p_skill_id and user_id=(select auth.uid())) then raise exception 'SKILL_NOT_FOUND'; end if;
  chosen_skill=p_skill_id;
  if chosen_skill is null and p_goal_id is not null then select skill_id into chosen_skill from public.goal_skill_links where goal_id=p_goal_id and user_id=(select auth.uid()) order by weight desc limit 1; end if;
  if chosen_skill is null then select id into chosen_skill from public.skills where user_id=(select auth.uid()) and archived_at is null order by discovered_at limit 1; end if;
  insert into public.quests(user_id,title,description,goal_id,xp_reward,due_at,evidence_required)
  values((select auth.uid()),trim(p_title),nullif(trim(p_description),''),p_goal_id,p_xp_reward,p_due_at,coalesce(p_evidence_required,false)) returning id into result;
  if chosen_skill is not null and p_xp_reward>0 then insert into public.quest_skill_rewards(quest_id,skill_id,user_id,xp) values(result,chosen_skill,(select auth.uid()),p_xp_reward); end if;
  return result;
end $$;

create or replace function public.create_planned_habit(
  p_name text,
  p_frequency jsonb,
  p_timezone text,
  p_goal_id uuid,
  p_skill_id uuid,
  p_xp_reward integer,
  p_start_date date,
  p_end_date date
) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; chosen_skill uuid;
begin
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
  if length(trim(p_name)) not between 1 and 180 then raise exception 'INVALID_NAME'; end if;
  if p_xp_reward not between 0 and 100 then raise exception 'INVALID_XP_REWARD'; end if;
  if p_goal_id is not null and not exists(select 1 from public.goals where id=p_goal_id and user_id=(select auth.uid())) then raise exception 'GOAL_NOT_FOUND'; end if;
  if p_skill_id is not null and not exists(select 1 from public.skills where id=p_skill_id and user_id=(select auth.uid())) then raise exception 'SKILL_NOT_FOUND'; end if;
  chosen_skill=p_skill_id;
  if chosen_skill is null and p_goal_id is not null then select skill_id into chosen_skill from public.goal_skill_links where goal_id=p_goal_id and user_id=(select auth.uid()) order by weight desc limit 1; end if;
  if chosen_skill is null then select id into chosen_skill from public.skills where user_id=(select auth.uid()) and archived_at is null order by discovered_at limit 1; end if;
  insert into public.habits(user_id,name,frequency,timezone,xp_reward,goal_id,start_date,end_date)
  values((select auth.uid()),trim(p_name),coalesce(p_frequency,'{"kind":"daily","days":[1,2,3,4,5,6,7]}'::jsonb),coalesce(nullif(p_timezone,''),'UTC'),p_xp_reward,p_goal_id,coalesce(p_start_date,current_date),p_end_date) returning id into result;
  if chosen_skill is not null then insert into public.habit_skill_links(habit_id,skill_id,user_id,weight) values(result,chosen_skill,(select auth.uid()),1); end if;
  return result;
end $$;

revoke all on function public.create_planned_quest(text,text,uuid,uuid,integer,timestamptz,boolean) from public,anon;
revoke all on function public.create_planned_habit(text,jsonb,text,uuid,uuid,integer,date,date) from public,anon;
grant execute on function public.create_planned_quest(text,text,uuid,uuid,integer,timestamptz,boolean) to authenticated;
grant execute on function public.create_planned_habit(text,jsonb,text,uuid,uuid,integer,date,date) to authenticated;

create or replace function public.attach_activity_evidence(p_activity_id uuid,p_type text,p_storage_path text,p_external_url text,p_text_note text) returns uuid language plpgsql security definer set search_path='' as $$ declare result uuid;begin if auth.uid() is null or not exists(select 1 from public.activities where id=p_activity_id and user_id=(select auth.uid())) then raise exception 'ACTIVITY_NOT_FOUND';end if;if p_type not in('photo','image','document','url','text','timer','integration') then raise exception 'INVALID_EVIDENCE_TYPE';end if;if p_storage_path is not null and p_storage_path not like (select auth.uid())::text||'/%' then raise exception 'FORBIDDEN_PATH';end if;insert into public.activity_evidence(user_id,activity_id,evidence_type,storage_path,external_url,text_note,is_private) values((select auth.uid()),p_activity_id,p_type,p_storage_path,p_external_url,p_text_note,true) returning id into result;update public.activities set confidence='evidence_attached' where id=p_activity_id;return result;end $$;
revoke all on function public.attach_activity_evidence(uuid,text,text,text,text) from public,anon;grant execute on function public.attach_activity_evidence(uuid,text,text,text,text) to authenticated;
