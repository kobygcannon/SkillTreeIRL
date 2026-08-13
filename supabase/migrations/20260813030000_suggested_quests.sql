create table public.quest_suggestions(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  title text not null check(length(trim(title)) between 1 and 180),
  description text,
  estimated_minutes integer check(estimated_minutes between 1 and 100000),
  status text not null default 'pending' check(status in('pending','accepted','dismissed')),
  accepted_quest_id uuid references public.quests(id) on delete set null,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique(user_id,goal_id,title)
);
alter table public.quest_suggestions enable row level security;
create policy quest_suggestions_owner on public.quest_suggestions for select to authenticated using(user_id=(select auth.uid()));
grant select on public.quest_suggestions to authenticated;
create index quest_suggestions_pending_idx on public.quest_suggestions(user_id,created_at desc) where status='pending';

create or replace function public.ensure_quest_suggestions() returns integer language plpgsql security definer set search_path='' as $$
declare inserted integer;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  insert into public.quest_suggestions(user_id,goal_id,title,description,estimated_minutes)
  select (select auth.uid()),g.id,'Choose one concrete next step for '||g.title,'Turn this direction into one action you can realistically complete.',30
  from public.goals g where g.user_id=(select auth.uid()) and g.status in('focus','active')
    and not exists(select 1 from public.quests q where q.goal_id=g.id and q.user_id=g.user_id and q.status in('planned','ready','in_progress','overdue'))
    and not exists(select 1 from public.quest_suggestions s where s.goal_id=g.id and s.user_id=g.user_id)
  order by case g.status when 'focus' then 0 else 1 end,g.updated_at desc limit 3;
  get diagnostics inserted=row_count; return inserted;
end $$;

create or replace function public.decide_quest_suggestion(p_suggestion_id uuid,p_action text,p_title text)
returns uuid language plpgsql security definer set search_path='' as $$
declare suggestion public.quest_suggestions;quest_id uuid;
begin
  if p_action not in('accept','dismiss') then raise exception 'INVALID_ACTION'; end if;
  select * into suggestion from public.quest_suggestions where id=p_suggestion_id and user_id=(select auth.uid()) for update;
  if not found then raise exception 'SUGGESTION_NOT_FOUND'; end if;
  if suggestion.status<>'pending' then return suggestion.accepted_quest_id; end if;
  if p_action='dismiss' then update public.quest_suggestions set status='dismissed',decided_at=now() where id=suggestion.id;return null;end if;
  if length(trim(coalesce(p_title,suggestion.title))) not between 1 and 180 then raise exception 'INVALID_TITLE'; end if;
  quest_id=public.create_configured_quest(coalesce(nullif(trim(p_title),''),suggestion.title),coalesce(suggestion.description,''),suggestion.goal_id,'{}',25,null,false,'normal',suggestion.estimated_minutes,'planned',null);
  update public.quest_suggestions set status='accepted',accepted_quest_id=quest_id,decided_at=now() where id=suggestion.id;
  return quest_id;
end $$;
revoke all on function public.ensure_quest_suggestions(),public.decide_quest_suggestion(uuid,text,text) from public,anon;
grant execute on function public.ensure_quest_suggestions(),public.decide_quest_suggestion(uuid,text,text) to authenticated;
