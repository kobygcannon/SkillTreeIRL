create or replace function public.update_public_profile(p_profile jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  result jsonb;
begin
  if current_user_id is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
  if jsonb_typeof(p_profile) <> 'object' then raise exception 'INVALID_PROFILE'; end if;
  if exists(
    select 1 from jsonb_object_keys(p_profile) key
    where key not in ('public_slug','visibility','bio','accent','featured_achievement_keys','avatar_style','tree_style','profile_layout')
  ) then raise exception 'INVALID_PROFILE_KEY'; end if;

  update public.profiles set
    public_slug=case when p_profile ? 'public_slug' then nullif(p_profile->>'public_slug','') else public_slug end,
    visibility=case when p_profile ? 'visibility' then p_profile->>'visibility' else visibility end,
    bio=case when p_profile ? 'bio' then nullif(p_profile->>'bio','') else bio end,
    accent=case when p_profile ? 'accent' then p_profile->>'accent' else accent end,
    featured_achievement_keys=case when p_profile ? 'featured_achievement_keys' then array(select jsonb_array_elements_text(p_profile->'featured_achievement_keys')) else featured_achievement_keys end,
    avatar_style=case when p_profile ? 'avatar_style' then p_profile->>'avatar_style' else avatar_style end,
    tree_style=case when p_profile ? 'tree_style' then p_profile->>'tree_style' else tree_style end,
    profile_layout=case when p_profile ? 'profile_layout' then p_profile->>'profile_layout' else profile_layout end,
    updated_at=now()
  where id=current_user_id
  returning jsonb_build_object(
    'public_slug',public_slug,'visibility',visibility,'bio',bio,'accent',accent,
    'featured_achievement_keys',featured_achievement_keys,'avatar_style',avatar_style,
    'tree_style',tree_style,'profile_layout',profile_layout
  ) into result;
  if result is null then raise exception 'PROFILE_NOT_FOUND'; end if;

  perform public.refresh_public_profile();
  return result;
end;
$$;

revoke execute on function public.update_public_profile(jsonb) from public, anon;
grant execute on function public.update_public_profile(jsonb) to authenticated;
