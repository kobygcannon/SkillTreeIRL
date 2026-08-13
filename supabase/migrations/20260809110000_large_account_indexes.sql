create index if not exists xp_user_time_idx on public.xp_transactions(user_id, created_at desc);
create index if not exists progress_user_time_idx on public.goal_progress_events(user_id, occurred_at desc);
create index if not exists revisions_user_time_idx on public.goal_revisions(user_id, created_at desc);
create index if not exists achievements_user_time_idx on public.achievement_unlocks(user_id, unlocked_at desc);
