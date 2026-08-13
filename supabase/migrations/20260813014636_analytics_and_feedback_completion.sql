alter table public.support_tickets add column category text not null default 'other' check(category in('bug','feature_request','confusing','other'));
alter table public.support_tickets add column diagnostic_context jsonb not null default '{}';
alter table public.subscriptions add column billing_interval text check(billing_interval in('month','year','one_time'));
alter table public.subscriptions add column unit_amount integer check(unit_amount is null or unit_amount>=0);
alter table public.subscriptions add column currency char(3);

create or replace function private.capture_lifecycle_product_event()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare event_name text; event_user uuid;
begin
  if tg_table_name='profiles' then
    if new.visibility in('public','unlisted') and old.visibility is distinct from new.visibility then event_name:='profile_shared';event_user:=new.id; else return new; end if;
  elsif tg_table_name='focus_sessions' then
    if new.status='completed' and old.status is distinct from new.status then event_name:='focus_session_completed';event_user:=new.user_id; else return new; end if;
  elsif tg_table_name='subscriptions' then
    if new.status='trialing' and (tg_op='INSERT' or old.status is distinct from new.status) then event_name:='trial_started';
    elsif new.status='active' and (tg_op='INSERT' or old.status is distinct from new.status) then event_name:='subscription_purchased';
    elsif new.status='cancelled' and (tg_op='INSERT' or old.status is distinct from new.status) then event_name:='subscription_cancelled';
    else return new;
    end if;
    event_user:=new.user_id;
  end if;
  insert into public.product_events(user_id,event_type,entity_id) values(event_user,event_name,new.id);
  return new;
end
$$;
revoke all on function private.capture_lifecycle_product_event() from public,anon,authenticated;
create trigger metric_profile_shared after update of visibility on public.profiles for each row execute function private.capture_lifecycle_product_event();
create trigger metric_focus_completed after update of status on public.focus_sessions for each row execute function private.capture_lifecycle_product_event();
create trigger metric_subscription_lifecycle after insert or update of status on public.subscriptions for each row execute function private.capture_lifecycle_product_event();

drop view public.product_metrics;
create view public.product_metrics with(security_invoker=true) as
select
 (select count(distinct user_id) from public.product_events where occurred_at>=now()-interval '7 days') as wau,
 (select count(distinct user_id) from public.product_events where occurred_at>=now()-interval '30 days') as mau,
 (select count(distinct user_id) from public.product_events where event_type='goal_created') as activated_goal,
 (select count(distinct user_id) from public.product_events where event_type='activity_logged') as activated_activity,
 (select count(distinct user_id) from public.product_events where event_type='xp_earned') as activated_xp,
 (select count(*) from public.product_events where event_type='activity_logged' and occurred_at>=now()-interval '7 days') as activities_week,
 (select count(*) from public.goals where status in('active','focus')) as active_goals,
 (select count(*) from(select user_id from public.product_events where occurred_at>=now()-interval '30 days' group by user_id having count(distinct date_trunc('week',occurred_at))>=2) returning_cohort) as returning_users,
 (select count(*) from public.goal_progress_events where occurred_at>=now()-interval '30 days' and reversal_of is null) as goals_progressed_30d,
 (select count(*) from public.goals where status='completed' and updated_at>=now()-interval '30 days') as goals_completed_30d,
 (select count(*) from public.product_events where event_type='focus_session_completed' and occurred_at>=now()-interval '30 days') as sessions_30d,
 (select count(distinct skill_id) from public.xp_transactions where created_at>=now()-interval '30 days' and amount>0) as skills_developed_30d,
 (select count(distinct p.user_id) from public.product_events p where p.event_type='subscription_purchased' and exists(select 1 from public.product_events t where t.user_id=p.user_id and t.event_type='trial_started')) as trial_conversions,
 (select coalesce(sum(case when billing_interval='year' then unit_amount/12.0 else unit_amount end),0) from public.subscriptions where status in('active','trialing') and plan='pro') as mrr_minor,
 (select count(*) from public.product_events where event_type='subscription_cancelled' and occurred_at>=now()-interval '30 days') as churn_30d,
 (select count(*) filter(where billing_interval='year')::numeric/nullif(count(*),0) from public.subscriptions where status in('active','trialing') and plan='pro') as annual_conversion;
revoke all on public.product_metrics from anon,authenticated;
