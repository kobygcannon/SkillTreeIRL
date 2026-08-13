alter table public.skills add column merged_into uuid references public.skills(id) on delete restrict;

create table public.skill_merges(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_skill_id uuid not null references public.skills(id) on delete restrict,
  retained_skill_id uuid not null references public.skills(id) on delete restrict,
  source_name text not null,
  retained_name text not null,
  source_xp bigint not null,
  created_at timestamptz not null default now(),
  check(source_skill_id<>retained_skill_id),
  unique(source_skill_id)
);

create table public.tags(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check(length(name) between 1 and 40),
  color text,
  created_at timestamptz not null default now(),
  unique(user_id,name)
);
create table public.goal_tags(goal_id uuid not null references public.goals(id) on delete cascade,tag_id uuid not null references public.tags(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,primary key(goal_id,tag_id));
create table public.goal_relationships(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,from_goal_id uuid not null references public.goals(id) on delete cascade,to_goal_id uuid not null references public.goals(id) on delete cascade,relationship_type text not null check(relationship_type in('parent','child','dependency','successor','related')),created_at timestamptz not null default now(),check(from_goal_id<>to_goal_id),unique(from_goal_id,to_goal_id,relationship_type));

create table public.templates(
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  template_type text not null check(template_type in('goal','skill_tree')),
  name text not null check(length(name) between 1 and 120),
  description text,
  category text not null default 'Other',
  visibility text not null default 'private' check(visibility in('private','unlisted','public','curated')),
  moderation_status text not null default 'approved' check(moderation_status in('pending','approved','rejected','hidden')),
  definition jsonb not null,
  uses integer not null default 0 check(uses>=0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.template_reports(id uuid primary key default gen_random_uuid(),template_id uuid not null references public.templates(id) on delete cascade,reporter_id uuid not null references auth.users(id) on delete cascade,reason text not null check(length(reason) between 3 and 500),created_at timestamptz not null default now(),unique(template_id,reporter_id));

alter table public.skill_merges enable row level security;alter table public.tags enable row level security;alter table public.goal_tags enable row level security;alter table public.goal_relationships enable row level security;alter table public.templates enable row level security;alter table public.template_reports enable row level security;
create policy skill_merges_own_read on public.skill_merges for select to authenticated using(user_id=(select auth.uid()));
create policy tags_own on public.tags for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy goal_tags_own on public.goal_tags for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy goal_relationships_own on public.goal_relationships for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy templates_read on public.templates for select to authenticated using(owner_id=(select auth.uid()) or (visibility in('unlisted','public','curated') and moderation_status='approved'));
create policy templates_own_write on public.templates for insert to authenticated with check(owner_id=(select auth.uid()) and visibility<>'curated');
create policy templates_own_update on public.templates for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()) and visibility<>'curated');
create policy templates_own_delete on public.templates for delete to authenticated using(owner_id=(select auth.uid()));
create policy template_reports_own on public.template_reports for select to authenticated using(reporter_id=(select auth.uid()));
create policy template_reports_insert on public.template_reports for insert to authenticated with check(reporter_id=(select auth.uid()));
grant select on public.skill_merges to authenticated;grant select,insert,update,delete on public.tags,public.goal_tags,public.goal_relationships,public.templates to authenticated;grant select,insert on public.template_reports to authenticated;

create index skills_merged_into_idx on public.skills(merged_into) where merged_into is not null;create index tags_user_name_idx on public.tags(user_id,name);create index goal_tags_user_idx on public.goal_tags(user_id,goal_id);create index goal_relationships_user_idx on public.goal_relationships(user_id,from_goal_id);create index templates_discovery_idx on public.templates(template_type,category,uses desc) where moderation_status='approved' and visibility in('public','curated');

create or replace function public.skill_total_xp(p_skill_id uuid) returns bigint language sql stable security invoker set search_path='' as $$ select coalesce(sum(x.amount),0)::bigint from public.xp_transactions x join public.skills s on s.id=x.skill_id where x.user_id=(select auth.uid()) and (x.skill_id=p_skill_id or s.merged_into=p_skill_id) $$;

drop view public.skill_xp_totals;
create view public.skill_xp_totals with(security_invoker=true) as
select s.id skill_id,s.user_id,s.name,s.category,s.parent_id,s.discovered_at,
 coalesce(x.lifetime_xp,0)::bigint lifetime_xp,coalesce(x.recent_xp,0)::bigint recent_xp,coalesce(a.lifetime_activities,0)::integer lifetime_activities
from public.skills s
left join lateral(select sum(t.amount) lifetime_xp,sum(t.amount) filter(where t.created_at>now()-interval '30 days') recent_xp from public.xp_transactions t join public.skills ledger_skill on ledger_skill.id=t.skill_id where t.skill_id=s.id or ledger_skill.merged_into=s.id)x on true
left join lateral(select count(distinct activity_id) lifetime_activities from public.activity_skill_links where skill_id=s.id)a on true
where s.archived_at is null and s.merged_into is null;
grant select on public.skill_xp_totals to authenticated;

create or replace function public.merge_personal_skills(p_source_skill_id uuid,p_retained_skill_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());source_row public.skills%rowtype;target_row public.skills%rowtype;source_xp bigint;
begin
 if uid is null then raise exception 'Authentication required';end if;
 select * into source_row from public.skills where id=p_source_skill_id and user_id=uid and archived_at is null for update;
 select * into target_row from public.skills where id=p_retained_skill_id and user_id=uid and archived_at is null for update;
 if source_row.id is null or target_row.id is null or source_row.id=target_row.id then raise exception 'Choose two different active personal skills';end if;
 select coalesce(sum(amount),0) into source_xp from public.xp_transactions where skill_id=source_row.id and user_id=uid;
 insert into public.activity_skill_links(activity_id,skill_id,user_id,xp_awarded) select activity_id,target_row.id,uid,xp_awarded from public.activity_skill_links where skill_id=source_row.id on conflict(activity_id,skill_id) do update set xp_awarded=least(5000,public.activity_skill_links.xp_awarded+excluded.xp_awarded);
 delete from public.activity_skill_links where skill_id=source_row.id;
 insert into public.goal_skill_links(goal_id,skill_id,user_id,weight) select goal_id,target_row.id,uid,weight from public.goal_skill_links where skill_id=source_row.id on conflict(goal_id,skill_id) do update set weight=greatest(public.goal_skill_links.weight,excluded.weight);
 delete from public.goal_skill_links where skill_id=source_row.id;
 insert into public.habit_skill_links(habit_id,skill_id,user_id,weight) select habit_id,target_row.id,uid,weight from public.habit_skill_links where skill_id=source_row.id on conflict(habit_id,skill_id) do update set weight=greatest(public.habit_skill_links.weight,excluded.weight);
 delete from public.habit_skill_links where skill_id=source_row.id;
 insert into public.quest_skill_rewards(quest_id,skill_id,user_id,xp) select quest_id,target_row.id,uid,xp from public.quest_skill_rewards where skill_id=source_row.id on conflict(quest_id,skill_id) do update set xp=least(5000,public.quest_skill_rewards.xp+excluded.xp);
 delete from public.quest_skill_rewards where skill_id=source_row.id;
 update public.skills set parent_id=target_row.id where user_id=uid and parent_id=source_row.id and id<>target_row.id;
 update public.skills set parent_id=null where id=target_row.id and parent_id=source_row.id;
 update public.skills set archived_at=now(),merged_into=target_row.id where id=source_row.id;
 insert into public.skill_merges(user_id,source_skill_id,retained_skill_id,source_name,retained_name,source_xp) values(uid,source_row.id,target_row.id,source_row.name,target_row.name,source_xp);
 insert into public.audit_events(user_id,event_type,object_type,object_id,metadata) values(uid,'skill.merged','skill',target_row.id,jsonb_build_object('sourceSkillId',source_row.id,'sourceName',source_row.name,'sourceXp',source_xp));
 return target_row.id;
end $$;
revoke all on function public.merge_personal_skills(uuid,uuid) from public,anon;grant execute on function public.merge_personal_skills(uuid,uuid) to authenticated;

insert into public.templates(owner_id,template_type,name,description,category,visibility,definition) values
(null,'goal','Run your first 5K','A flexible running plan with milestones and practical next actions.','Health','curated','{"goal":{"title":"Run a comfortable 5K","measurement":"numeric","targetValue":5,"unit":"km"},"milestones":["Walk-run for 20 minutes","Complete 3 km continuously","Complete 5 km comfortably"],"skills":["Endurance","Running technique"],"quests":["Schedule three sessions this week","Complete the first walk-run session"]}'),
(null,'goal','Build an emergency fund','Start a private financial resilience goal without exposing exact values publicly.','Money','curated','{"goal":{"title":"Build an emergency fund","measurement":"currency","currency":"GBP","targetValue":3000},"milestones":["Choose the target amount","Automate a monthly transfer","Reach one month of essential costs"],"skills":["Budgeting","Financial planning"],"quests":["Calculate one month of essential expenses","Set up an automatic transfer"]}'),
(null,'skill_tree','Learn web development','A selectable foundation across frontend, backend, data, and deployment.','Learning','curated','{"skills":[{"name":"Web Development","children":["HTML","CSS","JavaScript","Frontend","Backend","Databases","Deployment"]}]}');
