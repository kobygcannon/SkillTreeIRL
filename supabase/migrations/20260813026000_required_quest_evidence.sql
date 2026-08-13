create or replace function public.complete_quest(p_quest_id uuid,p_idempotency_key text) returns uuid language plpgsql security definer set search_path='' as $$
declare q public.quests;a_id uuid;c_id uuid;r record;
begin
 if p_idempotency_key is null or length(p_idempotency_key)<8 then raise exception 'IDEMPOTENCY_KEY_REQUIRED';end if;
 select * into q from public.quests where id=p_quest_id and user_id=(select auth.uid()) for update;if not found then raise exception 'QUEST_NOT_FOUND';end if;
 select id into c_id from public.quest_completions where quest_id=q.id;if c_id is not null then return c_id;end if;
 if q.evidence_required then raise exception 'EVIDENCE_REQUIRED';end if;
 insert into public.activities(user_id,description,effort,occurred_at,idempotency_key) values((select auth.uid()),q.title,'moderate',now(),p_idempotency_key||':activity') returning id into a_id;
 insert into public.quest_completions(user_id,quest_id,activity_id,idempotency_key) values((select auth.uid()),q.id,a_id,p_idempotency_key) returning id into c_id;update public.quests set status='completed' where id=q.id;
 for r in select * from public.quest_skill_rewards where quest_id=q.id loop insert into public.xp_transactions(user_id,skill_id,source_type,source_id,amount,reason) values((select auth.uid()),r.skill_id,'quest',c_id,r.xp,'Quest completed: '||q.title) on conflict do nothing;end loop;return c_id;
end $$;

create or replace function public.complete_quest_with_evidence(p_quest_id uuid,p_idempotency_key text,p_evidence_type text,p_storage_path text,p_external_url text,p_text_note text) returns uuid language plpgsql security definer set search_path='' as $$
declare q public.quests;a_id uuid;c_id uuid;r record;owner uuid=(select auth.uid());upload_size bigint=0;
begin
 if p_idempotency_key is null or length(p_idempotency_key)<8 then raise exception 'IDEMPOTENCY_KEY_REQUIRED';end if;
 select * into q from public.quests where id=p_quest_id and user_id=owner for update;if not found then raise exception 'QUEST_NOT_FOUND';end if;
 select id into c_id from public.quest_completions where quest_id=q.id;if c_id is not null then return c_id;end if;
 if q.evidence_required and p_evidence_type is null then raise exception 'EVIDENCE_REQUIRED';end if;
 if p_evidence_type is not null and p_evidence_type not in('photo','image','document','url','text','timer','integration') then raise exception 'INVALID_EVIDENCE_TYPE';end if;
 if p_evidence_type is not null and p_storage_path is null and p_external_url is null and p_text_note is null then raise exception 'EVIDENCE_REQUIRED';end if;
 if p_external_url is not null and p_external_url!~*'^https://' then raise exception 'INVALID_EVIDENCE_URL';end if;
 if p_text_note is not null and length(p_text_note)>2000 then raise exception 'INVALID_EVIDENCE_NOTE';end if;
 if p_storage_path is not null then if p_storage_path not like owner::text||'/%' then raise exception 'FORBIDDEN_PATH';end if;select size_bytes into upload_size from public.evidence_upload_reservations where storage_path=p_storage_path and user_id=owner and attached_at is null and expires_at>now() for update;if upload_size is null then raise exception 'UPLOAD_RESERVATION_REQUIRED';end if;end if;
 insert into public.activities(user_id,description,effort,occurred_at,idempotency_key) values(owner,q.title,'moderate',now(),p_idempotency_key||':activity') returning id into a_id;
 insert into public.quest_completions(user_id,quest_id,activity_id,idempotency_key) values(owner,q.id,a_id,p_idempotency_key) returning id into c_id;update public.quests set status='completed' where id=q.id;
 if p_evidence_type is not null then insert into public.activity_evidence(user_id,activity_id,evidence_type,storage_path,external_url,text_note,is_private,size_bytes) values(owner,a_id,p_evidence_type,p_storage_path,p_external_url,p_text_note,true,upload_size);if p_storage_path is not null then update public.evidence_upload_reservations set attached_at=now() where storage_path=p_storage_path;end if;update public.activities set confidence='evidence_attached' where id=a_id;end if;
 for r in select * from public.quest_skill_rewards where quest_id=q.id loop insert into public.xp_transactions(user_id,skill_id,source_type,source_id,amount,reason,confidence_level) values(owner,r.skill_id,'quest',c_id,r.xp,'Quest completed: '||q.title,case when p_evidence_type is null then 'self_reported' else 'evidence_attached' end) on conflict do nothing;end loop;return c_id;
end $$;

revoke all on function public.complete_quest(uuid,text),public.complete_quest_with_evidence(uuid,text,text,text,text,text) from public,anon;
grant execute on function public.complete_quest(uuid,text),public.complete_quest_with_evidence(uuid,text,text,text,text,text) to authenticated;
