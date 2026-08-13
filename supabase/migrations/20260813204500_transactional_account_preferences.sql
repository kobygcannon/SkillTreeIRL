create or replace function public.update_account_preferences(
  p_preferences jsonb default '{}'::jsonb,
  p_profile jsonb default '{}'::jsonb
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
  if jsonb_typeof(p_preferences) <> 'object' or jsonb_typeof(p_profile) <> 'object' then raise exception 'INVALID_SETTINGS'; end if;
  if exists(select 1 from jsonb_object_keys(p_preferences) key where key not in ('theme','gamification','focus_limit','locale','celebrations','reduced_motion')) then raise exception 'INVALID_PREFERENCE_KEY'; end if;
  if exists(select 1 from jsonb_object_keys(p_profile) key where key not in ('display_name','timezone')) then raise exception 'INVALID_PROFILE_KEY'; end if;

  if p_preferences <> '{}'::jsonb then
    update public.user_preferences set
      theme=case when p_preferences ? 'theme' then p_preferences->>'theme' else theme end,
      gamification=case when p_preferences ? 'gamification' then p_preferences->>'gamification' else gamification end,
      focus_limit=case when p_preferences ? 'focus_limit' then (p_preferences->>'focus_limit')::smallint else focus_limit end,
      locale=case when p_preferences ? 'locale' then p_preferences->>'locale' else locale end,
      celebrations=case when p_preferences ? 'celebrations' then (p_preferences->>'celebrations')::boolean else celebrations end,
      reduced_motion=case when p_preferences ? 'reduced_motion' then (p_preferences->>'reduced_motion')::boolean else reduced_motion end
    where user_id=current_user_id;
    if not found then raise exception 'PREFERENCES_NOT_FOUND'; end if;
  end if;

  if p_profile <> '{}'::jsonb then
    update public.profiles set
      display_name=case when p_profile ? 'display_name' then btrim(p_profile->>'display_name') else display_name end,
      timezone=case when p_profile ? 'timezone' then p_profile->>'timezone' else timezone end,
      updated_at=now()
    where id=current_user_id;
    if not found then raise exception 'PROFILE_NOT_FOUND'; end if;
  end if;
end;
$$;

revoke execute on function public.update_account_preferences(jsonb,jsonb) from public, anon;
grant execute on function public.update_account_preferences(jsonb,jsonb) to authenticated;
