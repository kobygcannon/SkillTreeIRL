import {NextResponse} from "next/server";
import {authenticated,failure} from "@/domains/shared/http";
import {levelProgress} from "@/domains/xp/level";
import {completionForecast} from "@/domains/insights/forecast";
import {normalizeLocale,startOfLocaleWeek} from "@/lib/i18n";

type Progress={goal_id:string;delta:number|null;occurred_at:string};
type Goal={id:string;title:string;measurement:string;current_value:number;target_value:number|null;unit:string|null};
const day=86400000;
const atStart=(date:Date)=>{const value=new Date(date);value.setHours(0,0,0,0);return value};
const dateLabel=(date:Date,locale:string)=>new Intl.DateTimeFormat(locale,{month:"long",year:"numeric"}).format(date);

export async function GET(){
 const auth=await authenticated();if("error" in auth)return auth.error;
 const preference=await auth.supabase.from("user_preferences").select("locale").single();if(preference.error)return failure(preference.error);
 const locale=normalizeLocale(preference.data.locale),now=new Date(),today=atStart(now),weekStart=startOfLocaleWeek(today,locale),since30=new Date(today.getTime()-29*day),since14=new Date(today.getTime()-13*day);
 const [summary,skills,activities,progress,goals,questCompletions,habitOccurrences,xp]=await Promise.all([
  auth.supabase.from("user_progress_summary").select("*").single(),
  auth.supabase.from("skill_xp_totals").select("skill_id,name,category,lifetime_xp,recent_xp").order("recent_xp",{ascending:false}).limit(8),
  auth.supabase.from("activities").select("id,occurred_at").is("reversed_at",null).gte("occurred_at",since30.toISOString()),
  auth.supabase.from("goal_progress_events").select("goal_id,delta,occurred_at,reversal_of").is("reversal_of",null).gte("occurred_at",since30.toISOString()).order("occurred_at"),
  auth.supabase.from("goals").select("id,title,measurement,current_value,target_value,unit").in("status",["active","focus"]),
  auth.supabase.from("quest_completions").select("completed_at,undone_at").is("undone_at",null).gte("completed_at",weekStart.toISOString()),
  auth.supabase.from("habit_occurrences").select("local_date,status").eq("status","complete").gte("local_date",weekStart.toISOString().slice(0,10)),
  auth.supabase.from("xp_transactions").select("amount,created_at,reversal_of").is("reversal_of",null).gte("created_at",weekStart.toISOString())
 ]);
 const error=summary.error||skills.error||activities.error||progress.error||goals.error||questCompletions.error||habitOccurrences.error||xp.error;if(error)return failure(error);
 const activityRows=activities.data||[],progressRows=(progress.data||[]) as Progress[],goalRows=(goals.data||[]) as Goal[],xpRows=xp.data||[];
 const activeDays=new Set(activityRows.map(item=>item.occurred_at.slice(0,10))).size,recent14=activityRows.filter(item=>item.occurred_at>=since14.toISOString()).length,todayKey=today.toISOString().slice(0,10);
 const forecasts=goalRows.flatMap(goal=>{
  if(!["numeric","currency","percentage","frequency","duration"].includes(goal.measurement)||!goal.target_value||Number(goal.current_value)>=Number(goal.target_value))return[];
  const estimate=completionForecast({current:Number(goal.current_value),target:Number(goal.target_value),now,unit:goal.unit,events:progressRows.filter(item=>item.goal_id===goal.id).map(item=>({delta:Number(item.delta||0),occurredAt:item.occurred_at}))});if(!estimate)return[];
  return[{goalId:goal.id,title:goal.title,range:dateLabel(estimate.from,locale)===dateLabel(estimate.to,locale)?dateLabel(estimate.from,locale):`${dateLabel(estimate.from,locale)} – ${dateLabel(estimate.to,locale)}`,explanation:`Based on ${estimate.samples} positive updates: recent pace ${estimate.recentRate.toLocaleString(locale,{maximumFractionDigits:2})} and longer-term pace ${estimate.longRate.toLocaleString(locale,{maximumFractionDigits:2})} ${estimate.unit} per day.`}];
 });
 const daily={activities:activityRows.filter(item=>item.occurred_at.slice(0,10)===todayKey).length,xp:xpRows.filter(item=>item.created_at.slice(0,10)===todayKey).reduce((sum,item)=>sum+Number(item.amount),0),quests:(questCompletions.data||[]).filter(item=>item.completed_at.slice(0,10)===todayKey).length,habits:(habitOccurrences.data||[]).filter(item=>item.local_date===todayKey).length,goals:new Set(progressRows.filter(item=>item.occurred_at.slice(0,10)===todayKey).map(item=>item.goal_id)).size};
 const strongest=(skills.data||[])[0];
 const weekly={xp:xpRows.reduce((sum,item)=>sum+Number(item.amount),0),strongestSkill:strongest?.name||null,goals:new Set(progressRows.filter(item=>item.occurred_at>=weekStart.toISOString()).map(item=>item.goal_id)).size,activeDays:new Set(activityRows.filter(item=>item.occurred_at>=weekStart.toISOString()).map(item=>item.occurred_at.slice(0,10))).size,nextFocus:goalRows[0]?.title||null};
 const lifetimeXp=Number(summary.data.lifetime_xp);
 return NextResponse.json({data:{...summary.data,...levelProgress(lifetimeXp),activeDays30:activeDays,activities14:recent14,goalsMoved30:new Set(progressRows.map(item=>item.goal_id)).size,strongestSkills:skills.data,forecasts,daily,weekly}})
}
