create or replace function public.instantiate_template(p_template_id uuid,p_selected_skills text[] default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());template_row public.templates%rowtype;definition jsonb;goal_def jsonb;new_goal_id uuid;skill_name text;skill_id uuid;parent_skill_id uuid;item jsonb;child_name text;milestone_title text;quest_title text;created_skill_ids uuid[]:=array[]::uuid[];
begin
 if uid is null then raise exception 'Authentication required';end if;
 select * into template_row from public.templates where id=p_template_id and (owner_id=uid or (visibility in('unlisted','public','curated') and moderation_status='approved')) for update;
 if template_row.id is null then raise exception 'Template not found';end if;
 definition:=template_row.definition;
 if template_row.template_type='goal' then
  goal_def:=definition->'goal';
  insert into public.goals(user_id,title,category,status,measurement,current_value,target_value,unit,currency,priority,metadata)
  values(uid,coalesce(goal_def->>'title',template_row.name),template_row.category,'active',coalesce((goal_def->>'measurement')::public.measurement_model,'open_ended'),0,nullif(goal_def->>'targetValue','')::numeric,goal_def->>'unit',goal_def->>'currency','normal',jsonb_build_object('templateId',template_row.id)) returning id into new_goal_id;
  for milestone_title in select jsonb_array_elements_text(coalesce(definition->'milestones','[]')) loop insert into public.goal_milestones(user_id,goal_id,title) values(uid,new_goal_id,milestone_title);end loop;
  for skill_name in select jsonb_array_elements_text(coalesce(definition->'skills','[]')) loop
   insert into public.skills(user_id,name,category) values(uid,skill_name,template_row.category) on conflict(user_id,name) do update set archived_at=null returning id into skill_id;
   insert into public.goal_skill_links(goal_id,skill_id,user_id,weight) values(new_goal_id,skill_id,uid,1) on conflict do nothing;
   created_skill_ids:=array_append(created_skill_ids,skill_id);
  end loop;
  for quest_title in select jsonb_array_elements_text(coalesce(definition->'quests','[]')) loop insert into public.quests(user_id,title,goal_id,status,xp_reward) values(uid,quest_title,new_goal_id,'ready',25);end loop;
 else
  for item in select * from jsonb_array_elements(coalesce(definition->'skills','[]')) loop
   skill_name:=item->>'name';
   if p_selected_skills is null or skill_name=any(p_selected_skills) then insert into public.skills(user_id,name,category) values(uid,skill_name,template_row.category) on conflict(user_id,name) do update set archived_at=null returning id into parent_skill_id;created_skill_ids:=array_append(created_skill_ids,parent_skill_id);else parent_skill_id:=null;end if;
   for child_name in select jsonb_array_elements_text(coalesce(item->'children','[]')) loop
    if p_selected_skills is null or child_name=any(p_selected_skills) then insert into public.skills(user_id,name,category,parent_id) values(uid,child_name,template_row.category,parent_skill_id) on conflict(user_id,name) do update set archived_at=null,parent_id=coalesce(public.skills.parent_id,excluded.parent_id) returning id into skill_id;created_skill_ids:=array_append(created_skill_ids,skill_id);end if;
   end loop;
  end loop;
 end if;
 update public.templates set uses=uses+1 where id=template_row.id;
 insert into public.audit_events(user_id,event_type,object_type,object_id,metadata) values(uid,'template.instantiated','template',template_row.id,jsonb_build_object('goalId',new_goal_id,'skillIds',created_skill_ids));
 return jsonb_build_object('goalId',new_goal_id,'skillIds',created_skill_ids);
end $$;
revoke all on function public.instantiate_template(uuid,text[]) from public,anon;grant execute on function public.instantiate_template(uuid,text[]) to authenticated;
