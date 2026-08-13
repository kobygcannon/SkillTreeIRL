import {NextResponse} from "next/server";
import {authenticated,failure} from "@/domains/shared/http";

export async function POST(request:Request){
 try{const auth=await authenticated();if("error" in auth)return auth.error;const body=await request.json() as {sourceSkillId?:string;retainedSkillId?:string};if(!body.sourceSkillId||!body.retainedSkillId||body.sourceSkillId===body.retainedSkillId)return NextResponse.json({error:{code:"VALIDATION_FAILED",message:"Choose two different skills"}},{status:422});const {data,error}=await auth.supabase.rpc("merge_personal_skills",{p_source_skill_id:body.sourceSkillId,p_retained_skill_id:body.retainedSkillId});if(error)return failure(error);return NextResponse.json({data:{retainedSkillId:data}})}catch(error){return failure(error)}
}
