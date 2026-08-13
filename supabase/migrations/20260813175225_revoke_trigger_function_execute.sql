-- These functions exist exclusively as database triggers. PostgreSQL grants
-- EXECUTE to PUBLIC by default, which would otherwise expose privileged trigger
-- behavior through the Data API even though no client should call it directly.
revoke all on function public.evaluate_achievements() from public, anon, authenticated;
revoke all on function public.spawn_recurring_quest() from public, anon, authenticated;
