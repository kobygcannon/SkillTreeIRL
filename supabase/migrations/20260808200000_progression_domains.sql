create table public.activity_skill_links (activity_id uuid not null references public.activities(id) on delete cascade, skill_id uuid not null references public.skills(id) on delete restrict, user_id uuid not null references auth.users(id) on delete cascade, xp_awarded integer not null check(xp_awarded between 0 and 5000), primary key(activity_id,skill_id));
create table public.activity_evidence (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, activity_id uuid not null references public.activities(id) on delete cascade, evidence_type text not null check(evidence_type in('photo','image','document','url','text','timer','integration')), storage_path text, external_url text, text_note text, is_private boolean not null default true, created_at timestamptz not null default now(), check(num_nonnulls(storage_path,external_url,text_note)=1));
create table public.habit_skill_links (habit_id uuid not null references public.habits(id) on delete cascade, skill_id uuid not null references public.skills(id) on delete restrict, user_id uuid not null references auth.users(id) on delete cascade, weight numeric not null default 1 check(weight>0), primary key(habit_id,skill_id));
create table public.goal_milestones (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, goal_id uuid not null references public.goals(id) on delete cascade, title text not null, threshold_value numeric, completed_at timestamptz, xp_reward integer not null default 0 check(xp_reward between 0 and 1000), sort_order integer not null default 0);
create table public.goal_dependencies (goal_id uuid not null references public.goals(id) on delete cascade, depends_on_goal_id uuid not null references public.goals(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade, dependency_type text not null default 'available' check(dependency_type in('blocked','available','optional')), primary key(goal_id,depends_on_goal_id), check(goal_id<>depends_on_goal_id));
create table public.goal_reviews (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, goal_id uuid not null references public.goals(id) on delete cascade, summary text, momentum text check(momentum in('building','high','steady','cooling','inactive')), blockers text, next_action text, created_at timestamptz not null default now());
create table public.achievement_definitions (id uuid primary key default gen_random_uuid(), key text not null unique, title text not null, description text not null, category text not null, rarity_eligible boolean not null default true, xp_reward integer not null default 0 check(xp_reward between 0 and 1000), criteria jsonb not null);
create table public.journal_entries (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, title text, body text not null, mood text, occurred_on date not null default current_date, created_at timestamptz not null default now(), updated_at timestamptz not null default now());

do $$ declare t text; begin foreach t in array array['activity_skill_links','activity_evidence','habit_skill_links','goal_milestones','goal_dependencies','goal_reviews','journal_entries'] loop execute format('alter table public.%I enable row level security',t); execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid())=user_id)',t||'_select',t); execute format('create policy %I on public.%I for insert to authenticated with check ((select auth.uid())=user_id)',t||'_insert',t); execute format('create policy %I on public.%I for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id)',t||'_update',t); end loop; end $$;
alter table public.achievement_definitions enable row level security; create policy achievement_definitions_read on public.achievement_definitions for select to authenticated using(true);
grant select,insert,update,delete on public.activity_skill_links,public.activity_evidence,public.habit_skill_links,public.goal_milestones,public.goal_dependencies,public.goal_reviews,public.journal_entries to authenticated; grant select on public.achievement_definitions to authenticated;
create index activity_skill_skill_idx on public.activity_skill_links(skill_id,activity_id); create index evidence_activity_idx on public.activity_evidence(activity_id); create index milestones_goal_idx on public.goal_milestones(goal_id,sort_order); create index reviews_goal_time_idx on public.goal_reviews(goal_id,created_at desc); create index journal_user_date_idx on public.journal_entries(user_id,occurred_on desc);

create or replace function public.log_activity(p_description text,p_occurred_at timestamptz,p_duration_minutes integer,p_quantity numeric,p_unit text,p_effort text,p_goal_ids uuid[],p_skill_allocations jsonb,p_private_note text,p_idempotency_key text) returns uuid language plpgsql security invoker set search_path='' as $$
declare a_id uuid; allocation jsonb; s_id uuid; s_xp integer; g_id uuid;
begin
 if length(trim(p_description)) not between 1 and 500 then raise exception 'INVALID_DESCRIPTION'; end if;
 if p_idempotency_key is null or length(p_idempotency_key)<8 then raise exception 'IDEMPOTENCY_KEY_REQUIRED'; end if;
 select id into a_id from public.activities where user_id=(select auth.uid()) and idempotency_key=p_idempotency_key;
 if a_id is not null then return a_id; end if;
 insert into public.activities(user_id,description,duration_minutes,quantity,unit,effort,private_note,occurred_at,idempotency_key) values((select auth.uid()),trim(p_description),p_duration_minutes,p_quantity,p_unit,p_effort,p_private_note,coalesce(p_occurred_at,now()),p_idempotency_key) returning id into a_id;
 foreach g_id in array coalesce(p_goal_ids,array[]::uuid[]) loop
   if not exists(select 1 from public.goals where id=g_id and user_id=(select auth.uid())) then raise exception 'INVALID_GOAL_LINK'; end if;
   insert into public.activity_goal_links(activity_id,goal_id,user_id) values(a_id,g_id,(select auth.uid()));
 end loop;
 for allocation in select value from jsonb_array_elements(coalesce(p_skill_allocations,'[]'::jsonb)) loop
   s_id=(allocation->>'skillId')::uuid; s_xp=(allocation->>'xp')::integer;
   if s_xp not between 1 and 5000 or not exists(select 1 from public.skills where id=s_id and user_id=(select auth.uid())) then raise exception 'INVALID_SKILL_ALLOCATION'; end if;
   insert into public.activity_skill_links(activity_id,skill_id,user_id,xp_awarded) values(a_id,s_id,(select auth.uid()),s_xp);
   insert into public.xp_transactions(user_id,skill_id,source_type,source_id,amount,reason) values((select auth.uid()),s_id,'activity',a_id,s_xp,'Activity: '||trim(p_description));
 end loop;
 return a_id;
end $$;
revoke all on function public.log_activity(text,timestamptz,integer,numeric,text,text,uuid[],jsonb,text,text) from public,anon; grant execute on function public.log_activity(text,timestamptz,integer,numeric,text,text,uuid[],jsonb,text,text) to authenticated;

create or replace function public.complete_habit(p_habit_id uuid,p_local_date date,p_status text,p_detail text,p_idempotency_key text) returns uuid language plpgsql security invoker set search_path='' as $$
declare h public.habits; occurrence_id uuid; r record; award integer;
begin
 if p_idempotency_key is null or length(p_idempotency_key)<8 then raise exception 'IDEMPOTENCY_KEY_REQUIRED'; end if;
 select * into h from public.habits where id=p_habit_id and user_id=(select auth.uid()) for update; if not found then raise exception 'HABIT_NOT_FOUND'; end if;
 select id into occurrence_id from public.habit_occurrences where habit_id=h.id and local_date=p_local_date; if occurrence_id is not null then return occurrence_id; end if;
 if p_status not in('complete','partial','skipped') then raise exception 'INVALID_STATUS'; end if;
 insert into public.habit_occurrences(user_id,habit_id,local_date,status,detail) values((select auth.uid()),h.id,p_local_date,p_status,p_detail) returning id into occurrence_id;
 award=case when p_status='complete' then h.xp_reward when p_status='partial' then greatest(1,floor(h.xp_reward/2.0))::integer else 0 end;
 if award>0 then for r in select * from public.habit_skill_links where habit_id=h.id loop insert into public.xp_transactions(user_id,skill_id,source_type,source_id,amount,reason) values((select auth.uid()),r.skill_id,'habit',occurrence_id,greatest(1,floor(award*r.weight)::integer),'Habit: '||h.name) on conflict do nothing; end loop; end if;
 return occurrence_id;
end $$;
revoke all on function public.complete_habit(uuid,date,text,text,text) from public,anon; grant execute on function public.complete_habit(uuid,date,text,text,text) to authenticated;

create or replace function public.reverse_xp(p_transaction_id uuid,p_reason text) returns uuid language plpgsql security invoker set search_path='' as $$ declare original public.xp_transactions; reversal_id uuid; begin if length(trim(p_reason))<3 then raise exception 'REVERSAL_REASON_REQUIRED'; end if; select * into original from public.xp_transactions where id=p_transaction_id and user_id=(select auth.uid()); if not found then raise exception 'TRANSACTION_NOT_FOUND'; end if; if original.reversal_of is not null then raise exception 'CANNOT_REVERSE_REVERSAL'; end if; select id into reversal_id from public.xp_transactions where reversal_of=original.id; if reversal_id is not null then return reversal_id; end if; insert into public.xp_transactions(user_id,skill_id,source_type,source_id,amount,reason,confidence_level,reversal_of) values((select auth.uid()),original.skill_id,'adjustment',gen_random_uuid(),-original.amount,trim(p_reason),original.confidence_level,original.id) returning id into reversal_id; return reversal_id; end $$;
revoke all on function public.reverse_xp(uuid,text) from public,anon; grant execute on function public.reverse_xp(uuid,text) to authenticated;
