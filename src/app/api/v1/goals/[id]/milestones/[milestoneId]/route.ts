import {NextResponse} from "next/server";
import {authenticated,failure} from "@/domains/shared/http";

export async function PATCH(request:Request,{params}:{params:Promise<{id:string;milestoneId:string}>}){
  try{
    const auth=await authenticated();if("error" in auth)return auth.error;
    const {id,milestoneId}=await params;
    const body=await request.json() as {completed?:boolean;title?:string};
    const changes:Record<string,unknown>={};
    if(typeof body.completed==="boolean")changes.completed_at=body.completed?new Date().toISOString():null;
    if(body.title?.trim())changes.title=body.title.trim();
    if(!Object.keys(changes).length)return NextResponse.json({error:{code:"VALIDATION_FAILED",message:"Nothing to update"}},{status:422});
    const {data,error}=await auth.supabase.from("goal_milestones").update(changes).eq("id",milestoneId).eq("goal_id",id).select().single();
    if(error)return failure(error);return NextResponse.json({data});
  }catch(error){return failure(error)}
}

export async function DELETE(_request:Request,{params}:{params:Promise<{id:string;milestoneId:string}>}){
  try{const auth=await authenticated();if("error" in auth)return auth.error;const {id,milestoneId}=await params;const {error}=await auth.supabase.from("goal_milestones").delete().eq("id",milestoneId).eq("goal_id",id);if(error)return failure(error);return new NextResponse(null,{status:204})}catch(error){return failure(error)}
}
