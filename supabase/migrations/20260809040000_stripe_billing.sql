create table public.stripe_webhook_events(id text primary key,event_type text not null,status text not null default 'processing' check(status in('processing','processed','failed')),error_message text,received_at timestamptz not null default now(),processed_at timestamptz);
alter table public.stripe_webhook_events enable row level security;revoke all on public.stripe_webhook_events from anon,authenticated;
create index stripe_events_received_idx on public.stripe_webhook_events(received_at desc);
