alter table public.activity_evidence add column size_bytes bigint not null default 0 check(size_bytes>=0);
create table public.evidence_upload_reservations(
  storage_path text primary key,user_id uuid not null references auth.users(id) on delete cascade,
  size_bytes bigint not null check(size_bytes between 1 and 10485760),expires_at timestamptz not null,
  attached_at timestamptz,created_at timestamptz not null default now()
);
alter table public.evidence_upload_reservations enable row level security;
revoke all on public.evidence_upload_reservations from anon,authenticated;
create index evidence_reservation_expiry_idx on public.evidence_upload_reservations(expires_at) where attached_at is null;

create or replace function public.reserve_evidence_upload(p_storage_path text,p_size_bytes bigint) returns boolean language plpgsql security definer set search_path='' as $$
declare owner uuid=(select auth.uid());quota bigint;used bigint;reserved bigint;
begin
 if owner is null then raise exception 'UNAUTHENTICATED';end if;
 if p_size_bytes not between 1 and 10485760 or p_storage_path not like owner::text||'/%' then raise exception 'INVALID_UPLOAD_RESERVATION';end if;
 perform pg_advisory_xact_lock(hashtextextended(owner::text,947));
 quota=case when exists(select 1 from public.entitlements where user_id=owner and entitlement in('pro','expandedEvidence') and(expires_at is null or expires_at>now())) then 262144000 else 26214400 end;
 select coalesce(sum(size_bytes),0) into used from public.activity_evidence where user_id=owner and storage_path is not null;
 select coalesce(sum(size_bytes),0) into reserved from public.evidence_upload_reservations where user_id=owner and attached_at is null and expires_at>now();
 if used+reserved+p_size_bytes>quota then raise exception 'EVIDENCE_STORAGE_LIMIT';end if;
 insert into public.evidence_upload_reservations(storage_path,user_id,size_bytes,expires_at) values(p_storage_path,owner,p_size_bytes,now()+interval '24 hours');
 return true;
end $$;

create or replace function public.attach_activity_evidence(p_activity_id uuid,p_type text,p_storage_path text,p_external_url text,p_text_note text) returns uuid language plpgsql security definer set search_path='' as $$
declare owner uuid=(select auth.uid());result uuid;upload_size bigint=0;
begin
 if owner is null or not exists(select 1 from public.activities where id=p_activity_id and user_id=owner) then raise exception 'ACTIVITY_NOT_FOUND';end if;
 if p_type not in('photo','image','document','url','text','timer','integration') then raise exception 'INVALID_EVIDENCE_TYPE';end if;
 if p_storage_path is not null then
  if p_storage_path not like owner::text||'/%' then raise exception 'FORBIDDEN_PATH';end if;
  select size_bytes into upload_size from public.evidence_upload_reservations where storage_path=p_storage_path and user_id=owner and attached_at is null and expires_at>now() for update;
  if upload_size is null then raise exception 'UPLOAD_RESERVATION_REQUIRED';end if;
 end if;
 insert into public.activity_evidence(user_id,activity_id,evidence_type,storage_path,external_url,text_note,is_private,size_bytes) values(owner,p_activity_id,p_type,p_storage_path,p_external_url,p_text_note,true,upload_size) returning id into result;
 if p_storage_path is not null then update public.evidence_upload_reservations set attached_at=now() where storage_path=p_storage_path;end if;
 update public.activities set confidence='evidence_attached' where id=p_activity_id;
 return result;
end $$;

revoke all on function public.reserve_evidence_upload(text,bigint),public.attach_activity_evidence(uuid,text,text,text,text) from public,anon;
grant execute on function public.reserve_evidence_upload(text,bigint),public.attach_activity_evidence(uuid,text,text,text,text) to authenticated;
