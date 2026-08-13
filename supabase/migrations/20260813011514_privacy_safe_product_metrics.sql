create table public.product_events(
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null check(event_type in('signup_completed','goal_created','activity_logged','xp_earned','quest_completed','habit_completed','profile_shared','trial_started','subscription_purchased','subscription_cancelled','focus_session_completed')),
  entity_id uuid,
  occurred_at timestamptz not null default now()
);

alter table public.product_events enable row level security;
revoke all on public.product_events from anon,authenticated;
create index product_events_type_time_idx on public.product_events(event_type,occurred_at);
create index product_events_user_time_idx on public.product_events(user_id,occurred_at);

create or replace function public.capture_product_event() returns trigger
language plpgsql security definer set search_path=''
as $$
declare event_name text; event_user uuid; event_entity uuid;
begin
  event_name := tg_argv[0];
  if tg_table_name = 'profiles' then event_user := new.id; event_entity := new.id;
  else event_user := new.user_id; event_entity := new.id;
  end if;
  if tg_table_name = 'xp_transactions' and ((to_jsonb(new)->>'amount')::numeric <= 0) then return new; end if;
  if tg_table_name = 'quest_completions' and (to_jsonb(new)->>'undone_at') is not null then return new; end if;
  if tg_table_name = 'habit_occurrences' and (to_jsonb(new)->>'status') <> 'complete' then return new; end if;
  if tg_table_name = 'focus_sessions' and (to_jsonb(new)->>'status') <> 'completed' then return new; end if;
  insert into public.product_events(user_id,event_type,entity_id,occurred_at) values(event_user,event_name,event_entity,now());
  return new;
end $$;
revoke all on function public.capture_product_event() from public,anon,authenticated;

create trigger metric_signup after insert on public.profiles for each row execute function public.capture_product_event('signup_completed');
create trigger metric_goal after insert on public.goals for each row execute function public.capture_product_event('goal_created');
create trigger metric_activity after insert on public.activities for each row execute function public.capture_product_event('activity_logged');
create trigger metric_xp after insert on public.xp_transactions for each row execute function public.capture_product_event('xp_earned');
create trigger metric_quest after insert on public.quest_completions for each row execute function public.capture_product_event('quest_completed');
create trigger metric_habit after insert on public.habit_occurrences for each row execute function public.capture_product_event('habit_completed');

create view public.product_metrics with(security_invoker=true) as
select
 count(distinct user_id) filter(where occurred_at>=now()-interval '7 days') as wau,
 count(distinct user_id) filter(where occurred_at>=now()-interval '30 days') as mau,
 count(*) filter(where event_type='activity_logged' and occurred_at>=now()-interval '7 days') as activities_week,
 count(*) filter(where event_type='goal_created' and occurred_at>=now()-interval '30 days') as goals_created_30d,
 count(*) filter(where event_type='quest_completed' and occurred_at>=now()-interval '30 days') as quests_completed_30d,
 count(*) filter(where event_type='habit_completed' and occurred_at>=now()-interval '30 days') as habits_completed_30d
from public.product_events;
revoke all on public.product_metrics from anon,authenticated;
