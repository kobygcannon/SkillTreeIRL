create policy friendships_delete on public.friendships
for delete to authenticated
using ((select auth.uid()) in (requester_id, addressee_id));

grant delete on public.friendships to authenticated;
