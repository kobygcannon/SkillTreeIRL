create or replace function public.create_challenge(
  p_title text,
  p_description text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_metric text,
  p_target numeric,
  p_visibility text,
  p_invitees uuid[] default '{}'
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  challenge_id uuid;
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
  if nullif(btrim(p_title),'') is null or length(btrim(p_title)) > 160 then raise exception 'INVALID_TITLE'; end if;
  if p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at then raise exception 'INVALID_DATES'; end if;
  if p_metric not in ('activities','xp','distance','duration','custom') then raise exception 'INVALID_METRIC'; end if;
  if p_visibility not in ('invite_only','friends','public') then raise exception 'INVALID_VISIBILITY'; end if;
  if p_target is null or p_target <= 0 then raise exception 'INVALID_TARGET'; end if;

  insert into public.challenges(creator_id,title,description,starts_at,ends_at,metric,target,visibility)
  values(current_user_id,btrim(p_title),nullif(btrim(p_description),''),p_starts_at,p_ends_at,p_metric,p_target,p_visibility)
  returning id into challenge_id;

  insert into public.challenge_members(challenge_id,user_id,status,joined_at)
  select challenge_id,user_id,
    case when user_id=current_user_id then 'accepted' else 'invited' end,
    case when user_id=current_user_id then now() else null end
  from (select distinct unnest(array_prepend(current_user_id,coalesce(p_invitees,'{}'::uuid[]))) as user_id) members;

  return challenge_id;
end;
$$;

revoke execute on function public.create_challenge(text,text,timestamptz,timestamptz,text,numeric,text,uuid[]) from public, anon;
grant execute on function public.create_challenge(text,text,timestamptz,timestamptz,text,numeric,text,uuid[]) to authenticated;
