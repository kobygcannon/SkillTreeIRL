create table public.focus_sessions(
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete set null, quest_id uuid references public.quests(id) on delete set null,
  status text not null default 'running' check(status in('planned','running','completed','cancelled')),
  planned_minutes integer check(planned_minutes between 1 and 1440), started_at timestamptz, ended_at timestamptz,
  notes text, idempotency_key text not null, created_at timestamptz not null default now(),
  unique(user_id,idempotency_key),check(ended_at is null or started_at is null or ended_at>=started_at)
);
create table public.reminders(
  id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
  reminder_type text not null check(reminder_type in('goal','quest','habit','review','inactivity','custom')),
  entity_id uuid,title text not null,schedule jsonb not null,timezone text not null,enabled boolean not null default true,
  next_run_at timestamptz,last_sent_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.year_reviews(
  id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
  year integer not null check(year between 2000 and 2200),snapshot jsonb not null,generated_at timestamptz not null default now(),unique(user_id,year)
);
create table public.notification_preferences(
  user_id uuid primary key references auth.users(id) on delete cascade,in_app boolean not null default true,email boolean not null default false,
  reminders boolean not null default true,achievements boolean not null default true,social boolean not null default true,quiet_hours jsonb not null default '{}',updated_at timestamptz not null default now()
);

do $$ declare t text;begin foreach t in array array['focus_sessions','reminders','year_reviews'] loop execute format('alter table public.%I enable row level security',t);execute format('create policy %I on public.%I for select to authenticated using((select auth.uid())=user_id)',t||'_select',t);execute format('create policy %I on public.%I for insert to authenticated with check((select auth.uid())=user_id)',t||'_insert',t);execute format('create policy %I on public.%I for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id)',t||'_update',t);execute format('create policy %I on public.%I for delete to authenticated using((select auth.uid())=user_id)',t||'_delete',t);end loop;end $$;
alter table public.notification_preferences enable row level security;
create policy notification_preferences_owner on public.notification_preferences for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
grant select,insert,update,delete on public.focus_sessions,public.reminders,public.year_reviews,public.notification_preferences to authenticated;
create index focus_sessions_user_time_idx on public.focus_sessions(user_id,created_at desc);create unique index one_running_focus_session_per_user on public.focus_sessions(user_id) where status='running';
create index reminders_due_idx on public.reminders(next_run_at) where enabled;create index year_reviews_user_year_idx on public.year_reviews(user_id,year desc);

create or replace function public.generate_year_review(p_year integer) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; start_at timestamptz; end_at timestamptz; review jsonb;
begin
 if auth.uid() is null or p_year not between 2000 and 2200 then raise exception 'INVALID_REQUEST';end if;
 start_at=make_timestamptz(p_year,1,1,0,0,0,'UTC');end_at=make_timestamptz(p_year+1,1,1,0,0,0,'UTC');
 review=jsonb_build_object(
  'year',p_year,
  'xp',coalesce((select sum(amount) from public.xp_transactions where user_id=(select auth.uid()) and created_at>=start_at and created_at<end_at),0),
  'activities',coalesce((select count(*) from public.activities where user_id=(select auth.uid()) and occurred_at>=start_at and occurred_at<end_at),0),
  'questsCompleted',coalesce((select count(*) from public.quest_completions where user_id=(select auth.uid()) and completed_at>=start_at and completed_at<end_at),0),
  'habitsCompleted',coalesce((select count(*) from public.habit_occurrences where user_id=(select auth.uid()) and status='complete' and created_at>=start_at and created_at<end_at),0),
  'goalsCompleted',coalesce((select count(*) from public.goals where user_id=(select auth.uid()) and status='completed' and updated_at>=start_at and updated_at<end_at),0),
  'topSkills',coalesce((select jsonb_agg(to_jsonb(x)) from(select s.name,sum(t.amount) xp from public.xp_transactions t join public.skills s on s.id=t.skill_id where t.user_id=(select auth.uid()) and t.created_at>=start_at and t.created_at<end_at group by s.id,s.name order by xp desc limit 5)x),'[]'::jsonb)
 );
 insert into public.year_reviews(user_id,year,snapshot) values((select auth.uid()),p_year,review) on conflict(user_id,year) do update set snapshot=excluded.snapshot,generated_at=now() returning id into result;return result;
end $$;
revoke all on function public.generate_year_review(integer) from public,anon;grant execute on function public.generate_year_review(integer) to authenticated;
