create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  owner_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'active' check (status in ('active','suspended','closed')),
  onboarding_completed_at timestamptz,
  settings jsonb not null default '{"memberProgressVisibility":"managers","allowMemberCreatedObjectives":true}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','manager','member')),
  status text not null default 'active' check (status in ('active','suspended')),
  display_name text not null check (char_length(trim(display_name)) between 1 and 80),
  job_title text,
  joined_at timestamptz not null default now(),
  primary key (organization_id,user_id)
);

create table public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null check (email = lower(email) and position('@' in email) > 1),
  role text not null default 'member' check (role in ('admin','manager','member')),
  token_hash text not null unique,
  invited_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.organization_objectives (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 180),
  description text,
  status text not null default 'active' check (status in ('draft','active','completed','archived')),
  measurement text not null default 'percentage' check (measurement in ('percentage','numeric','binary','milestones')),
  target_value numeric,
  unit text,
  due_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (target_value is null or target_value >= 0)
);

create table public.organization_assignments (
  objective_id uuid not null references public.organization_objectives(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  assigned_by uuid not null references auth.users(id) on delete restrict,
  current_value numeric not null default 0 check (current_value >= 0),
  status text not null default 'assigned' check (status in ('assigned','in_progress','completed','declined')),
  private_notes text,
  assigned_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (objective_id,user_id)
);

create table public.organization_checkins (
  id uuid primary key default gen_random_uuid(),
  objective_id uuid not null references public.organization_objectives(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  progress_value numeric check (progress_value is null or progress_value >= 0),
  summary text not null check (char_length(trim(summary)) between 1 and 2000),
  visibility text not null default 'managers' check (visibility in ('managers','workspace')),
  created_at timestamptz not null default now()
);

create table public.organization_subscriptions (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  provider text not null default 'stripe',
  provider_customer_id text unique,
  provider_subscription_id text unique,
  plan text not null default 'team' check (plan in ('team','business')),
  status text not null default 'inactive' check (status in ('inactive','trialing','active','past_due','cancelled','expired')),
  seat_quantity integer not null default 1 check (seat_quantity between 1 and 10000),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

create index organizations_owner_idx on public.organizations(owner_id);
create index organization_members_user_status_idx on public.organization_members(user_id,status,organization_id);
create index organization_invitations_org_email_idx on public.organization_invitations(organization_id,email) where accepted_at is null and revoked_at is null;
create index organization_objectives_org_status_idx on public.organization_objectives(organization_id,status,updated_at desc);
create index organization_assignments_user_status_idx on public.organization_assignments(user_id,status,objective_id);
create index organization_checkins_objective_created_idx on public.organization_checkins(objective_id,created_at desc);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_invitations enable row level security;
alter table public.organization_objectives enable row level security;
alter table public.organization_assignments enable row level security;
alter table public.organization_checkins enable row level security;
alter table public.organization_subscriptions enable row level security;

create schema if not exists private;
create or replace function private.organization_role(p_organization_id uuid)
returns text language sql stable security definer set search_path = '' as $$
  select role from public.organization_members
  where organization_id=p_organization_id and user_id=(select auth.uid()) and status='active'
$$;
revoke all on function private.organization_role(uuid) from public,anon,authenticated;
grant execute on function private.organization_role(uuid) to authenticated;

create policy organizations_member_read on public.organizations for select to authenticated
using ((select private.organization_role(id)) is not null);
create policy organizations_admin_update on public.organizations for update to authenticated
using ((select private.organization_role(id)) in ('owner','admin'))
with check ((select private.organization_role(id)) in ('owner','admin'));

create policy organization_members_member_read on public.organization_members for select to authenticated
using ((select private.organization_role(organization_id)) is not null);
create policy organization_members_admin_delete on public.organization_members for delete to authenticated
using ((select private.organization_role(organization_id)) in ('owner','admin') and role <> 'owner');

create policy organization_invitations_admin_read on public.organization_invitations for select to authenticated
using ((select private.organization_role(organization_id)) in ('owner','admin'));

create policy organization_objectives_member_read on public.organization_objectives for select to authenticated
using ((select private.organization_role(organization_id)) is not null);
create policy organization_objectives_lead_write on public.organization_objectives for all to authenticated
using ((select private.organization_role(organization_id)) in ('owner','admin','manager'))
with check ((select private.organization_role(organization_id)) in ('owner','admin','manager'));

create policy organization_assignments_visible_read on public.organization_assignments for select to authenticated
using (user_id=(select auth.uid()) or (select private.organization_role((select o.organization_id from public.organization_objectives o where o.id=objective_id))) in ('owner','admin','manager'));
create policy organization_assignments_lead_insert on public.organization_assignments for insert to authenticated
with check ((select private.organization_role((select o.organization_id from public.organization_objectives o where o.id=objective_id))) in ('owner','admin','manager'));
create policy organization_assignments_owner_update on public.organization_assignments for update to authenticated
using (user_id=(select auth.uid()) or (select private.organization_role((select o.organization_id from public.organization_objectives o where o.id=objective_id))) in ('owner','admin','manager'))
with check (user_id=(select auth.uid()) or (select private.organization_role((select o.organization_id from public.organization_objectives o where o.id=objective_id))) in ('owner','admin','manager'));

create policy organization_checkins_visible_read on public.organization_checkins for select to authenticated
using (user_id=(select auth.uid()) or (select private.organization_role((select o.organization_id from public.organization_objectives o where o.id=objective_id))) in ('owner','admin','manager') or (visibility='workspace' and (select private.organization_role((select o.organization_id from public.organization_objectives o where o.id=objective_id))) is not null));
create policy organization_checkins_owner_insert on public.organization_checkins for insert to authenticated
with check (user_id=(select auth.uid()) and exists (select 1 from public.organization_assignments a where a.objective_id=organization_checkins.objective_id and a.user_id=(select auth.uid())));

create policy organization_subscriptions_admin_read on public.organization_subscriptions for select to authenticated
using ((select private.organization_role(organization_id)) in ('owner','admin'));

grant select on public.organizations to authenticated;
grant update(name,settings,onboarding_completed_at,updated_at) on public.organizations to authenticated;
grant select,delete on public.organization_members to authenticated;
grant select on public.organization_invitations to authenticated;
grant select,insert,delete on public.organization_objectives to authenticated;
grant update(title,description,status,measurement,target_value,unit,due_at,updated_at) on public.organization_objectives to authenticated;
grant select,insert on public.organization_assignments to authenticated;
grant update(current_value,status,private_notes,completed_at) on public.organization_assignments to authenticated;
grant select,insert on public.organization_checkins to authenticated;
grant select on public.organization_subscriptions to authenticated;

create or replace function public.create_organization(p_name text,p_slug text,p_job_title text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare current_user_id uuid=(select auth.uid()); result uuid;
begin
  if current_user_id is null then raise exception 'UNAUTHENTICATED'; end if;
  if char_length(trim(p_name)) not between 2 and 120 or p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then raise exception 'INVALID_ORGANIZATION'; end if;
  insert into public.organizations(name,slug,owner_id) values(trim(p_name),p_slug,current_user_id) returning id into result;
  insert into public.organization_members(organization_id,user_id,role,display_name,job_title) values(result,current_user_id,'owner',coalesce((select display_name from public.profiles where id=current_user_id),'Workspace owner'),nullif(trim(p_job_title),''));
  insert into public.organization_subscriptions(organization_id,seat_quantity) values(result,1);
  return result;
end $$;

create or replace function public.create_organization_invitation(p_organization_id uuid,p_email text,p_role text default 'member')
returns text language plpgsql security definer set search_path='' as $$
declare raw_token text; normalized_email text=lower(trim(p_email));
begin
  if (select private.organization_role(p_organization_id)) not in ('owner','admin') then raise exception 'FORBIDDEN'; end if;
  if p_role not in ('admin','manager','member') or position('@' in normalized_email)<=1 then raise exception 'INVALID_INVITATION'; end if;
  update public.organization_invitations set revoked_at=now() where organization_id=p_organization_id and email=normalized_email and accepted_at is null and revoked_at is null;
  raw_token=encode(gen_random_bytes(32),'hex');
  insert into public.organization_invitations(organization_id,email,role,token_hash,invited_by,expires_at)
  values(p_organization_id,normalized_email,p_role,encode(digest(raw_token,'sha256'),'hex'),(select auth.uid()),now()+interval '7 days');
  return raw_token;
end $$;

create or replace function public.accept_organization_invitation(p_token text)
returns uuid language plpgsql security definer set search_path='' as $$
declare invitation public.organization_invitations%rowtype; current_user_id uuid=(select auth.uid()); current_email text=lower(coalesce((select auth.jwt()->>'email'),''));
begin
  if current_user_id is null then raise exception 'UNAUTHENTICATED'; end if;
  select * into invitation from public.organization_invitations where token_hash=encode(digest(p_token,'sha256'),'hex') and accepted_at is null and revoked_at is null and expires_at>now() for update;
  if not found or current_email<>invitation.email then raise exception 'INVITATION_INVALID'; end if;
  insert into public.organization_members(organization_id,user_id,role,display_name) values(invitation.organization_id,current_user_id,invitation.role,coalesce((select display_name from public.profiles where id=current_user_id),'Team member')) on conflict(organization_id,user_id) do update set status='active';
  update public.organization_invitations set accepted_at=now() where id=invitation.id;
  return invitation.organization_id;
end $$;

revoke all on function public.create_organization(text,text,text),public.create_organization_invitation(uuid,text,text),public.accept_organization_invitation(text) from public,anon;
grant execute on function public.create_organization(text,text,text),public.create_organization_invitation(uuid,text,text),public.accept_organization_invitation(text) to authenticated;
