insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('evidence','evidence',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf','text/plain']) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy evidence_insert_own on storage.objects for insert to authenticated with check(bucket_id='evidence' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy evidence_select_own on storage.objects for select to authenticated using(bucket_id='evidence' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy evidence_delete_own on storage.objects for delete to authenticated using(bucket_id='evidence' and (storage.foldername(name))[1]=(select auth.uid())::text);
create unique index evidence_storage_path_unique on public.activity_evidence(storage_path) where storage_path is not null;
