create or replace function public.set_goal_organization(p_goal_id uuid,p_tags text[],p_related_goal_id uuid default null,p_relationship_type text default null) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());tag_name text;tag_id uuid;
begin
 if uid is null or not exists(select 1 from public.goals where id=p_goal_id and user_id=uid) then raise exception 'GOAL_NOT_FOUND';end if;
 delete from public.goal_tags where goal_id=p_goal_id and user_id=uid;
 foreach tag_name in array coalesce(p_tags,'{}') loop tag_name:=lower(trim(tag_name));if tag_name<>'' then if length(tag_name)>40 then raise exception 'TAG_TOO_LONG';end if;insert into public.tags(user_id,name) values(uid,tag_name) on conflict(user_id,name) do update set name=excluded.name returning id into tag_id;insert into public.goal_tags(goal_id,tag_id,user_id) values(p_goal_id,tag_id,uid) on conflict do nothing;end if;end loop;
 if p_related_goal_id is not null then if p_relationship_type not in('parent','child','dependency','successor','related') then raise exception 'INVALID_RELATIONSHIP';end if;if not exists(select 1 from public.goals where id=p_related_goal_id and user_id=uid) then raise exception 'RELATED_GOAL_NOT_FOUND';end if;insert into public.goal_relationships(user_id,from_goal_id,to_goal_id,relationship_type) values(uid,p_goal_id,p_related_goal_id,p_relationship_type) on conflict do nothing;end if;
end $$;
revoke all on function public.set_goal_organization(uuid,text[],uuid,text) from public,anon;grant execute on function public.set_goal_organization(uuid,text[],uuid,text) to authenticated;
