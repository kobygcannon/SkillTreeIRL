create or replace function public.prevent_immutable_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Ledger rows remain immutable during normal use. A cascading account
  -- deletion is the sole exception: the owning auth row is already absent
  -- from the deleting statement's view, so retaining its ledger would both
  -- violate the user's erasure request and block the foreign-key cascade.
  if tg_op = 'DELETE'
     and not exists (
       select 1 from auth.users where id = old.user_id
     ) then
    return old;
  end if;

  raise exception 'IMMUTABLE_LEDGER';
end
$$;
