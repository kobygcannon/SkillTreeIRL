drop policy if exists organization_members_admin_update on public.organization_members;
drop policy if exists organization_invitations_admin_update on public.organization_invitations;
revoke update on public.organizations,public.organization_members,public.organization_invitations,public.organization_objectives,public.organization_assignments from authenticated;
grant update(name,settings,onboarding_completed_at,updated_at) on public.organizations to authenticated;
grant update(title,description,status,measurement,target_value,unit,due_at,updated_at) on public.organization_objectives to authenticated;
grant update(current_value,status,private_notes,completed_at) on public.organization_assignments to authenticated;
