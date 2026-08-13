import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SkillTreeApp, type GoalFilter, type GoalItem, type Habit, type Page, type Quest } from "../page";
import { levelProgress } from "@/domains/xp/level";

const colors: Record<string,string>={Business:"#7c6cf2",Health:"#e48253",Fitness:"#e48253",Finance:"#44a77a",Learning:"#ca9d42",Technology:"#5c73da"};
const pages=new Set<Page>(["today","goals","skills","quests","habits","achievements","history","insights","season","profile","settings","calendar"]);
const goalFilters=new Set<GoalFilter>(["active","later","completed","archived"]);

export default async function AuthenticatedApp({searchParams}:{searchParams:Promise<{view?:string;filter?:string}>}) {
  const supabase=await createClient(); if(!supabase)redirect("/sign-in?error=not_configured");
  const {data:userResult}=await supabase.auth.getUser(); if(!userResult.user)redirect("/sign-in");
  const {data:assurance}=await supabase.auth.mfa.getAuthenticatorAssuranceLevel(); if(assurance?.currentLevel==="aal1"&&assurance.nextLevel==="aal2")redirect("/mfa");
  const [{data:preferenceResult},params]=await Promise.all([supabase.from("user_preferences").select("locale,theme").single(),searchParams]);
  const locale=preferenceResult?.locale||"en-GB", initialTheme=(preferenceResult?.theme||"system") as "system"|"light"|"dark";
  const initialPage=pages.has(params.view as Page)?params.view as Page:"today", initialGoalFilter=goalFilters.has(params.filter as GoalFilter)?params.filter as GoalFilter:"active";
  const profileTimezone=(await supabase.from("profiles").select("timezone").single()).data?.timezone||"UTC";
  const today=new Intl.DateTimeFormat("en-CA",{timeZone:profileTimezone,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const weekday=new Date(`${today}T12:00:00Z`).getUTCDay()||7;
  const [goalResult,questResult,habitResult,profileResult,skillCountResult,achievementCountResult,progressResult]=await Promise.all([
    supabase.from("goals").select("id,title,category,measurement,current_value,target_value,unit,currency,status,priority,deadline,updated_at,archived_at").order("updated_at",{ascending:false}),
    supabase.from("quests").select("id,title,xp_reward,due_at,status,priority,pinned_at,goals(title),quest_dependencies(depends_on_quest_id)").in("status",["planned","ready","in_progress","overdue"]).order("due_at",{ascending:true}),
    supabase.from("habits").select("id,name,frequency,xp_reward,start_date,end_date,habit_occurrences!left(local_date,status)").is("archived_at",null).order("start_date",{ascending:false}),
    supabase.from("profiles").select("display_name,character_xp").single(),supabase.from("skills").select("id",{count:"exact",head:true}).is("archived_at",null),
    supabase.from("achievement_unlocks").select("id",{count:"exact",head:true}),supabase.from("user_progress_summary").select("lifetime_xp,weekly_xp,lifetime_activities").single(),
  ]);
  if(!goalResult.error&&goalResult.data?.length===0)redirect("/onboarding");
  const goals:GoalItem[]=(goalResult.data||[]).map(g=>({id:g.id,title:g.title,category:g.category,measurement:g.measurement,icon:g.category==="Health"?"🏃":g.category==="Finance"?"◒":"✦",current:Number(g.current_value),target:Number(g.target_value||0),unit:g.currency||g.unit||"",status:g.status.slice(0,1).toUpperCase()+g.status.slice(1),color:colors[g.category]||"#7c6cf2",deadline:g.deadline?new Intl.DateTimeFormat(locale,{day:"numeric",month:"short"}).format(new Date(g.deadline)):"No deadline",momentum:"Building"}));
  const questRows=[...(questResult.data||[])].sort((a,b)=>{const rank=(q:typeof a)=>q.pinned_at?0:(q.status==="overdue"&&q.priority==="high")?1:(q.quest_dependencies?.length?2:3);return rank(a)-rank(b)||new Date(a.due_at||"9999-12-31").getTime()-new Date(b.due_at||"9999-12-31").getTime()});
  const quests:Quest[]=questRows.map(q=>({id:q.id,title:q.title,goal:(q.goals as unknown as {title?:string}|null)?.title||"Independent quest",xp:q.xp_reward,due:q.due_at?new Intl.DateTimeFormat(locale,{day:"numeric",month:"short"}).format(new Date(q.due_at)):"Anytime",done:false,status:q.status,pinned:Boolean(q.pinned_at),skill:"linked skills"}));
  const habits:Habit[]=(habitResult.data||[]).map(h=>{const frequency=h.frequency as {days?:number[]};const due=h.start_date<=today&&(!h.end_date||h.end_date>=today)&&(frequency.days||[1,2,3,4,5,6,7]).includes(weekday);const occurrence=((h.habit_occurrences as unknown as Array<{local_date:string;status:string}>)||[]).find(o=>o.local_date===today);return{id:h.id,title:h.name,detail:due?"Due today":"Not due today",xp:h.xp_reward,done:occurrence?.status==="complete",due,icon:"◇"}});
  const lifetimeXp=Number(progressResult.data?.lifetime_xp||profileResult.data?.character_xp||0),progression=levelProgress(lifetimeXp);
  // Request-time inactivity guidance is intentional.
  // eslint-disable-next-line react-hooks/purity
  const stalled=(goalResult.data||[]).find(goal=>Date.now()-new Date(goal.updated_at).getTime()>14*86400000),recommendation=stalled?{title:`Review ${stalled.title}`,detail:"This goal has been quiet for two weeks. Continue it, pause it, archive it, or change the plan—without losing history.",goalId:stalled.id}:quests.length===0?{title:"Plan one useful next action",detail:"Turn your focus goal into a small quest you can realistically finish next."}:undefined;
  return <SkillTreeApp initialGoals={goals} initialQuests={quests} initialHabits={habits} authenticated initialPage={initialPage} initialGoalFilter={initialGoalFilter} initialTheme={initialTheme} locale={locale} userSummary={{displayName:profileResult.data?.display_name||"Adventurer",level:progression.level,levelPercentage:progression.percentage,remainingXp:progression.remainingXp,lifetimeXp,weeklyXp:Number(progressResult.data?.weekly_xp||0),skillCount:skillCountResult.count||0,achievementCount:achievementCountResult.count||0,lifetimeActivities:Number(progressResult.data?.lifetime_activities||0),recommendation}}/>;
}
