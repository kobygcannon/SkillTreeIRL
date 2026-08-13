create or replace function public.log_activity(p_description text,p_occurred_at timestamptz,p_duration_minutes integer,p_quantity numeric,p_unit text,p_effort text,p_goal_ids uuid[],p_skill_allocations jsonb,p_private_note text,p_idempotency_key text) returns uuid language plpgsql security definer set search_path='' as $$
declare
 a_id uuid; allocation jsonb; s_id uuid; s_xp integer; g_id uuid; base_xp integer; duration_factor numeric; repetition_count integer;
 allocation_index integer; allocation_count integer; total_weight numeric; requested_weight numeric; target_total integer; awarded_total integer:=0;
begin
 if length(trim(p_description)) not between 1 and 500 then raise exception 'INVALID_DESCRIPTION'; end if;
 if p_effort not in('tiny','small','moderate','significant','major') then raise exception 'INVALID_EFFORT'; end if;
 if p_idempotency_key is null or length(p_idempotency_key)<8 then raise exception 'IDEMPOTENCY_KEY_REQUIRED'; end if;
 if p_duration_minutes is not null and p_duration_minutes not between 0 and 100000 then raise exception 'INVALID_DURATION'; end if;
 if p_quantity is not null and (p_quantity<0 or p_quantity>1000000000000000) then raise exception 'INVALID_QUANTITY'; end if;
 if p_unit is not null and length(p_unit)>40 then raise exception 'INVALID_UNIT'; end if;
 if p_private_note is not null and length(p_private_note)>2000 then raise exception 'INVALID_PRIVATE_NOTE'; end if;
 if cardinality(coalesce(p_goal_ids,array[]::uuid[]))>25 or jsonb_array_length(coalesce(p_skill_allocations,'[]'::jsonb))>25 then raise exception 'TOO_MANY_LINKS'; end if;
 select id into a_id from public.activities where user_id=(select auth.uid()) and idempotency_key=p_idempotency_key; if a_id is not null then return a_id; end if;
 base_xp=case p_effort when 'tiny' then 5 when 'small' then 10 when 'moderate' then 25 when 'significant' then 50 when 'major' then 100 end;
 duration_factor=case when p_duration_minutes is null then 1 else least(1.5,greatest(.75,p_duration_minutes/45.0)) end;
 select count(*) into repetition_count from public.activities where user_id=(select auth.uid()) and lower(description)=lower(trim(p_description)) and occurred_at>now()-interval '30 days';
 base_xp=greatest(1,round((base_xp*duration_factor*greatest(.6,1-greatest(0,repetition_count-3)*.05))/5.0)*5)::integer;
 allocation_count=jsonb_array_length(coalesce(p_skill_allocations,'[]'::jsonb));
 if allocation_count>0 then
  select sum((value->>'weight')::numeric),count(distinct value->>'skillId') into total_weight,allocation_index from jsonb_array_elements(p_skill_allocations);
  if total_weight is null or total_weight<=0 or allocation_index<>allocation_count or exists(select 1 from jsonb_array_elements(p_skill_allocations) where (value->>'weight')::numeric<=0 or (value->>'weight')::numeric>1) then raise exception 'INVALID_SKILL_ALLOCATION'; end if;
  target_total=greatest(1,round(base_xp*least(1,total_weight))::integer);
 end if;
 insert into public.activities(user_id,description,duration_minutes,quantity,unit,effort,private_note,occurred_at,idempotency_key) values((select auth.uid()),trim(p_description),p_duration_minutes,p_quantity,nullif(trim(p_unit),''),p_effort,p_private_note,coalesce(p_occurred_at,now()),p_idempotency_key) returning id into a_id;
 foreach g_id in array coalesce(p_goal_ids,array[]::uuid[]) loop if not exists(select 1 from public.goals where id=g_id and user_id=(select auth.uid())) then raise exception 'INVALID_GOAL_LINK'; end if; insert into public.activity_goal_links(activity_id,goal_id,user_id) values(a_id,g_id,(select auth.uid())); end loop;
 allocation_index=0;
 for allocation in select value from jsonb_array_elements(coalesce(p_skill_allocations,'[]'::jsonb)) loop
  allocation_index=allocation_index+1;s_id=(allocation->>'skillId')::uuid;requested_weight=(allocation->>'weight')::numeric;
  if not exists(select 1 from public.skills where id=s_id and user_id=(select auth.uid())) then raise exception 'INVALID_SKILL_ALLOCATION'; end if;
  if allocation_index=allocation_count then s_xp=greatest(0,target_total-awarded_total);else s_xp=greatest(0,floor(base_xp*requested_weight/greatest(1,total_weight))::integer);end if;
  awarded_total=awarded_total+s_xp;
  insert into public.activity_skill_links(activity_id,skill_id,user_id,xp_awarded) values(a_id,s_id,(select auth.uid()),s_xp);
  if s_xp>0 then insert into public.xp_transactions(user_id,skill_id,source_type,source_id,amount,reason) values((select auth.uid()),s_id,'activity',a_id,s_xp,'Activity: '||trim(p_description));end if;
 end loop;
 return a_id;
end $$;

revoke all on function public.log_activity(text,timestamptz,integer,numeric,text,text,uuid[],jsonb,text,text) from public,anon;
grant execute on function public.log_activity(text,timestamptz,integer,numeric,text,text,uuid[],jsonb,text,text) to authenticated;
