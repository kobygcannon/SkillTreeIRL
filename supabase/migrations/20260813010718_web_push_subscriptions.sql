alter table public.notification_preferences add column web_push boolean not null default false;

create table public.push_subscriptions(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth_key text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,endpoint)
);

alter table public.push_subscriptions enable row level security;
create policy push_subscriptions_owner on public.push_subscriptions for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
grant select,insert,update,delete on public.push_subscriptions to authenticated;
create index push_subscriptions_user_idx on public.push_subscriptions(user_id);
