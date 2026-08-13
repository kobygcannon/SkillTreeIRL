revoke all on function public.consume_rate_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_rate_limit(text,integer,integer) to service_role;

create index if not exists rate_limit_window_expiry_idx on public.rate_limit_windows(window_start);
