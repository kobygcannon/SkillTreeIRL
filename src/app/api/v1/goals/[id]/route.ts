import {NextResponse} from "next/server";import {authenticated,failure} from "@/domains/shared/http";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const auth=await authenticated();if("error" in auth)return auth.error;const {id}=await params;
 const [goal,progress,activityLinks,tags,relationships,availableGoals]=await Promise.all([
  auth.supabase.from("goals").select("*,goal_milestones(*),goal_skill_links(skill_id,weight,skills(name,category)),goal_dependencies!goal_dependencies_goal_id_fkey(depends_on_goal_id,dependency_type),goal_reviews(*)").eq("id",id).single(),
  auth.supabase.from("goal_progress_events").select("id,value,delta,note,occurred_at").eq("goal_id",id).order("occurred_at",{ascending:false}).limit(25),
  auth.supabase.from("activity_goal_links").select("activity_id,activities(id,description,occurred_at,duration_minutes,effort)").eq("goal_id",id).limit(25),
  auth.supabase.from("goal_tags").select("tag_id,tags(name,color)").eq("goal_id",id),
  auth.supabase.from("goal_relationships").select("id,to_goal_id,relationship_type,goals!goal_relationships_to_goal_id_fkey(title,status)").eq("from_goal_id",id),
  auth.supabase.from("goals").select("id,title,status").neq("id",id).order("title").limit(100)
 ]);
 const error=goal.error||progress.error||activityLinks.error||tags.error||relationships.error||availableGoals.error;if(error){if(goal.error)return NextResponse.json({error:{code:"GOAL_NOT_FOUND",message:"Goal was not found"}},{status:404});return failure(error)}
 const activities=(activityLinks.data||[]).flatMap(link=>link.activities||[]).sort((a,b)=>String(b.occurred_at||"").localeCompare(String(a.occurred_at||"")));
 return NextResponse.json({data:{...goal.data,goal_progress_events:progress.data||[],activities,goal_tags:tags.data||[],goal_relationships:relationships.data||[],available_goals:availableGoals.data||[]}})
}
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){try{const auth=await authenticated();if("error" in auth)return auth.error;const {id}=await params;const body=await request.json() as Record<string,unknown>;const allowed=["title","description","category","priority","deadline","metadata","parent_id"] as const;const update:Record<string,unknown>={updated_at:new Date().toISOString()};for(const key of allowed)if(body[key]!==undefined)update[key]=body[key];if(typeof update.title==="string"&&(!update.title.trim()||update.title.length>180))return NextResponse.json({error:{code:"VALIDATION_FAILED",message:"Title must be between 1 and 180 characters"}},{status:422});const {data,error}=await auth.supabase.from("goals").update(update).eq("id",id).select().single();if(error)return failure(error);return NextResponse.json({data})}catch(error){return failure(error)}}
