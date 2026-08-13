alter table public.journal_entries
  add column goal_id uuid references public.goals(id) on delete set null,
  add column activity_id uuid references public.activities(id) on delete set null,
  add column skill_id uuid references public.skills(id) on delete set null;

drop policy if exists journal_entries_insert on public.journal_entries;
drop policy if exists journal_entries_update on public.journal_entries;

create policy journal_entries_insert on public.journal_entries for insert to authenticated
with check (
  user_id=(select auth.uid())
  and (goal_id is null or exists(select 1 from public.goals where id=goal_id and user_id=(select auth.uid())))
  and (activity_id is null or exists(select 1 from public.activities where id=activity_id and user_id=(select auth.uid())))
  and (skill_id is null or exists(select 1 from public.skills where id=skill_id and user_id=(select auth.uid())))
);
create policy journal_entries_update on public.journal_entries for update to authenticated
using (user_id=(select auth.uid()))
with check (
  user_id=(select auth.uid())
  and (goal_id is null or exists(select 1 from public.goals where id=goal_id and user_id=(select auth.uid())))
  and (activity_id is null or exists(select 1 from public.activities where id=activity_id and user_id=(select auth.uid())))
  and (skill_id is null or exists(select 1 from public.skills where id=skill_id and user_id=(select auth.uid())))
);

create index journal_goal_date_idx on public.journal_entries(user_id,goal_id,occurred_on desc) where goal_id is not null;
create index journal_activity_idx on public.journal_entries(user_id,activity_id) where activity_id is not null;
create index journal_skill_date_idx on public.journal_entries(user_id,skill_id,occurred_on desc) where skill_id is not null;
