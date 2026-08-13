create or replace function public.log_activity(p_description text,p_occurred_at timestamptz,p_duration_minutes integer,p_quantity numeric,p_unit text,p_effort text,p_goal_ids uuid[],p_skill_allocations jsonb,p_private_note text,p_idempotency_key text) returns uuid language plpgsql security invoker set search_path='' as $$
declare a_id uuid; allocation jsonb; s_id uuid; s_xp integer; g_id uuid; base_xp integer; duration_factor numeric; repetition_count integer;
begin
 if length(trim(p_description)) not between 1 and 500 then raise exception 'INVALID_DESCRIPTION'; end if;
 if p_effort not in('tiny','small','moderate','significant','major') then raise exception 'INVALID_EFFORT'; end if;
 if p_idempotency_key is null or length(p_idempotency_key)<8 then raise exception 'IDEMPOTENCY_KEY_REQUIRED'; end if;
 select id into a_id from public.activities where user_id=(select auth.uid()) and idempotency_key=p_idempotency_key; if a_id is not null then return a_id; end if;
 base_xp=case p_effort when 'tiny' then 5 when 'small' then 10 when 'moderate' then 25 when 'significant' then 50 when 'major' then 100 end;
 duration_factor=case when p_duration_minutes is null then 1 else least(1.5,greatest(.75,p_duration_minutes/45.0)) end;
 select count(*) into repetition_count from public.activities where user_id=(select auth.uid()) and lower(description)=lower(trim(p_description)) and occurred_at>now()-interval '30 days';
 base_xp=greatest(1,round((base_xp*duration_factor*greatest(.6,1-greatest(0,repetition_count-3)*.05))/5.0)*5)::integer;
 insert into public.activities(user_id,description,duration_minutes,quantity,unit,effort,private_note,occurred_at,idempotency_key) values((select auth.uid()),trim(p_description),p_duration_minutes,p_quantity,p_unit,p_effort,p_private_note,coalesce(p_occurred_at,now()),p_idempotency_key) returning id into a_id;
 foreach g_id in array coalesce(p_goal_ids,array[]::uuid[]) loop if not exists(select 1 from public.goals where id=g_id and user_id=(select auth.uid())) then raise exception 'INVALID_GOAL_LINK'; end if; insert into public.activity_goal_links(activity_id,goal_id,user_id) values(a_id,g_id,(select auth.uid())); end loop;
 for allocation in select value from jsonb_array_elements(coalesce(p_skill_allocations,'[]'::jsonb)) loop
   s_id=(allocation->>'skillId')::uuid; if not exists(select 1 from public.skills where id=s_id and user_id=(select auth.uid())) then raise exception 'INVALID_SKILL_ALLOCATION'; end if;
   s_xp=greatest(1,round(base_xp*least(1,greatest(.1,coalesce((allocation->>'weight')::numeric,1))))::integer);
   insert into public.activity_skill_links(activity_id,skill_id,user_id,xp_awarded) values(a_id,s_id,(select auth.uid()),s_xp);
   insert into public.xp_transactions(user_id,skill_id,source_type,source_id,amount,reason) values((select auth.uid()),s_id,'activity',a_id,s_xp,'Activity: '||trim(p_description));
 end loop;
 return a_id;
end $$;
