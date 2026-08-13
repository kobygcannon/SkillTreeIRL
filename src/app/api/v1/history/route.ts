import {NextResponse} from "next/server";import {authenticated,failure} from "@/domains/shared/http";
type Event={id:string;type:string;title:string;occurredAt:string;xp?:number;metadata?:Record<string,unknown>;undo?:{type:string;id:string}};
export async function GET(request:Request){
 const auth=await authenticated();if("error" in auth)return auth.error;const url=new URL(request.url),cursor=url.searchParams.get("cursor"),limit=Math.min(100,Math.max(10,Number(url.searchParams.get("limit")||50))),before=cursor||new Date().toISOString();
 const [activities,progress,achievements,revisions]=await Promise.all([
  auth.supabase.from("activities").select("id,description,occurred_at,reversed_at,activity_skill_links(xp_awarded),quest_completions(quest_id,undone_at)").lt("occurred_at",before).is("reversed_at",null).order("occurred_at",{ascending:false}).limit(limit),
  auth.supabase.from("goal_progress_events").select("id,value,delta,note,occurred_at,reversal_of,goals(title)").lt("occurred_at",before).order("occurred_at",{ascending:false}).limit(limit),
  auth.supabase.from("achievement_unlocks").select("id,achievement_key,xp_awarded,unlocked_at").lt("unlocked_at",before).order("unlocked_at",{ascending:false}).limit(limit),
  auth.supabase.from("goal_revisions").select("id,reason,new_data,created_at,goals(title)").lt("created_at",before).order("created_at",{ascending:false}).limit(limit)
 ]);const error=activities.error||progress.error||achievements.error||revisions.error;if(error)return failure(error);
 const events:Event[]=[
  ...(activities.data||[]).map(a=>{const completion=(a.quest_completions||[]).find(item=>!item.undone_at);return{id:completion?.quest_id||a.id,type:completion?"quest_completion":"activity",title:a.description,occurredAt:a.occurred_at,xp:(a.activity_skill_links||[]).reduce((n:number,x:{xp_awarded:number})=>n+x.xp_awarded,0),undo:{type:completion?"quest_completion":"activity",id:completion?.quest_id||a.id}}}),
  ...(progress.data||[]).map(p=>({id:p.id,type:p.reversal_of?"correction":"goal_progress",title:p.reversal_of?`${(p.goals as unknown as {title?:string}|null)?.title||"Goal"} progress corrected`:`${(p.goals as unknown as {title?:string}|null)?.title||"Goal"} progressed`,occurredAt:p.occurred_at,metadata:{value:p.value,delta:p.delta,note:p.note},undo:p.reversal_of?undefined:{type:"goal_progress",id:p.id}})),
  ...(achievements.data||[]).map(a=>({id:a.id,type:"achievement",title:a.achievement_key,occurredAt:a.unlocked_at,xp:a.xp_awarded})),
  ...(revisions.data||[]).map(r=>({id:r.id,type:"goal_revision",title:`${(r.goals as unknown as {title?:string}|null)?.title||"Goal"} revised`,occurredAt:r.created_at,metadata:{reason:r.reason,changes:r.new_data}}))
 ].sort((a,b)=>b.occurredAt.localeCompare(a.occurredAt)).slice(0,limit);
 return NextResponse.json({data:events,nextCursor:events.length===limit?events[events.length-1].occurredAt:null});
}
