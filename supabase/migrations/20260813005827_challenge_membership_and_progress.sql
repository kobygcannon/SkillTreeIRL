drop policy if exists challenge_members_insert on public.challenge_members;

create or replace function private.can_join_challenge(p_challenge_id uuid,p_member_id uuid)
returns boolean language sql stable security definer set search_path='' set row_security=off as $$
 select exists(select 1 from public.challenges c where c.id=p_challenge_id and (
   c.creator_id=(select auth.uid()) or (p_member_id=(select auth.uid()) and (
     c.visibility='public' or (c.visibility='friends' and exists(select 1 from public.friendships f where f.status='accepted' and ((f.requester_id=c.creator_id and f.addressee_id=(select auth.uid())) or (f.addressee_id=c.creator_id and f.requester_id=(select auth.uid())))))
   ))
 ))
$$;
revoke all on function private.can_join_challenge(uuid,uuid) from public,anon,authenticated;
grant execute on function private.can_join_challenge(uuid,uuid) to authenticated;

create policy challenge_members_insert on public.challenge_members
for insert to authenticated
with check (
  private.can_join_challenge(challenge_id,user_id)
);

create index if not exists activities_user_occurred_active_idx
on public.activities(user_id, occurred_at)
where reversed_at is null;

create index if not exists xp_transactions_user_created_active_idx
on public.xp_transactions(user_id, created_at)
where reversal_of is null;
