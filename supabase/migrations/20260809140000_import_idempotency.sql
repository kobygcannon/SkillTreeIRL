alter table public.imports add column if not exists idempotency_key text;
create unique index if not exists imports_user_idempotency_idx on public.imports(user_id, idempotency_key) where idempotency_key is not null;
