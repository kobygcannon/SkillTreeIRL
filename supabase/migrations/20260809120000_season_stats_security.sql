create or replace function public.refresh_season_stats(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  active public.seasons;
begin
  if (select auth.uid()) is null or p_user_id <> (select auth.uid()) then
    raise exception 'FORBIDDEN';
  end if;

  select * into active from public.seasons where is_active limit 1;
  if not found then return; end if;

  insert into public.season_user_stats(season_id,user_id,xp_earned,activities,quests_completed,habits_completed)
  select
    active.id,
    p_user_id,
    coalesce((select sum(amount) from public.xp_transactions where user_id=p_user_id and created_at between active.starts_at and active.ends_at),0),
    coalesce((select count(*) from public.activities where user_id=p_user_id and occurred_at between active.starts_at and active.ends_at),0),
    coalesce((select count(*) from public.quest_completions where user_id=p_user_id and completed_at between active.starts_at and active.ends_at),0),
    coalesce((select count(*) from public.habit_occurrences where user_id=p_user_id and status='complete' and created_at between active.starts_at and active.ends_at),0)
  on conflict(season_id,user_id) do update set
    xp_earned=excluded.xp_earned,
    activities=excluded.activities,
    quests_completed=excluded.quests_completed,
    habits_completed=excluded.habits_completed,
    updated_at=now();
end
$$;

revoke all on function public.refresh_season_stats(uuid) from public, anon;
grant execute on function public.refresh_season_stats(uuid) to authenticated;
