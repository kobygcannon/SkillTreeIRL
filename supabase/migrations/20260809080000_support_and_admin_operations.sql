alter table public.admin_users drop constraint if exists admin_users_role_check;
alter table public.admin_users add constraint admin_users_role_check check(role in('support','moderator','admin','superadmin'));
create table public.support_tickets(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 subject text not null check(length(subject) between 3 and 160),message text not null check(length(message) between 10 and 5000),
 status text not null default 'open' check(status in('open','waiting_on_user','in_progress','resolved','closed')),
 priority text not null default 'normal' check(priority in('low','normal','high','urgent')),assigned_to uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),resolved_at timestamptz
);
create table private.support_notes(
 id uuid primary key default gen_random_uuid(),ticket_id uuid not null references public.support_tickets(id) on delete cascade,
 admin_user_id uuid not null references auth.users(id) on delete cascade,note text not null,created_at timestamptz not null default now()
);
alter table public.support_tickets enable row level security;
create policy support_tickets_owner_read on public.support_tickets for select to authenticated using(user_id=(select auth.uid()));
create policy support_tickets_owner_insert on public.support_tickets for insert to authenticated with check(user_id=(select auth.uid()));
grant select,insert on public.support_tickets to authenticated;
create index support_tickets_status_time_idx on public.support_tickets(status,created_at);create index support_tickets_user_time_idx on public.support_tickets(user_id,created_at desc);
create or replace function public.add_support_note(p_ticket_id uuid,p_admin_user_id uuid,p_note text) returns uuid language plpgsql security definer set search_path='' as $$ declare result uuid;begin if not exists(select 1 from public.admin_users where user_id=p_admin_user_id and role in('support','admin','superadmin')) then raise exception 'FORBIDDEN';end if;insert into private.support_notes(ticket_id,admin_user_id,note) values(p_ticket_id,p_admin_user_id,trim(p_note)) returning id into result;return result;end $$;
revoke all on function public.add_support_note(uuid,uuid,text) from public,anon,authenticated;grant execute on function public.add_support_note(uuid,uuid,text) to service_role;
