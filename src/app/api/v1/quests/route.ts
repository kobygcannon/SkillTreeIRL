import { NextResponse } from "next/server";
import { authenticated, failure } from "@/domains/shared/http";

export async function GET() {
  const auth = await authenticated();
  if ("error" in auth) return auth.error;
  const { data, error } = await auth.supabase.from("quests").select("id,title,description,goal_id,status,xp_reward,due_at,priority,estimated_minutes,recurrence,evidence_required,created_at,updated_at").order("created_at", { ascending: false }).limit(250);
  if (error) return failure(error);
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  try {
    const auth = await authenticated();
    if ("error" in auth) return auth.error;
    const body = await request.json() as { title?:string; description?:string; goalId?:string; skillId?:string; skillIds?:string[]; xpReward?:number; dueAt?:string; evidenceRequired?:boolean; priority?:string; estimatedMinutes?:number; status?:string; recurrence?:unknown };
    const title=body.title?.trim(), xp=Math.round(Number(body.xpReward??25));
    if(!title||title.length>180) return NextResponse.json({error:{code:"VALIDATION_FAILED",message:"Quest title must be between 1 and 180 characters"}},{status:422});
    if(xp<0||xp>5000) return NextResponse.json({error:{code:"VALIDATION_FAILED",message:"XP reward must be between 0 and 5000"}},{status:422});
    const selectedSkills=[...new Set(body.skillIds?.filter(Boolean) || (body.skillId?[body.skillId]:[]))];
    const {data,error}=await auth.supabase.rpc("create_configured_quest",{p_title:title,p_description:body.description||"",p_goal_id:body.goalId||null,p_skill_ids:selectedSkills,p_xp_reward:xp,p_due_at:body.dueAt||null,p_evidence_required:Boolean(body.evidenceRequired),p_priority:body.priority||"normal",p_estimated_minutes:body.estimatedMinutes||null,p_status:body.status||"ready",p_recurrence:body.recurrence||null});
    if(error)return failure(error);
    return NextResponse.json({data:{id:data}},{status:201});
  } catch(error) { return failure(error); }
}
