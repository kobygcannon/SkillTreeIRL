import {NextResponse} from "next/server";
import {authenticated,failure} from "@/domains/shared/http";

export async function PATCH(request:Request,{params}:RouteContext<"/api/v1/challenges/[id]/membership">){
 try{
  const auth=await authenticated();
  if("error" in auth)return auth.error;
  const {id}=await params;
  const body=await request.json() as {status?:string};
  if(!body.status||!["accepted","declined","left"].includes(body.status))return NextResponse.json({error:{code:"VALIDATION_FAILED",message:"Choose accepted, declined, or left"}},{status:422});
  const {data:existing,error:readError}=await auth.supabase.from("challenge_members").select("status").eq("challenge_id",id).eq("user_id",auth.userId).maybeSingle();
  if(readError)return failure(readError);
  if(existing){
   const {data,error}=await auth.supabase.from("challenge_members").update({status:body.status,joined_at:body.status==="accepted"?new Date().toISOString():null}).eq("challenge_id",id).eq("user_id",auth.userId).select().single();
   if(error)return failure(error);
   return NextResponse.json({data});
  }
  if(body.status!=="accepted")return NextResponse.json({error:{code:"NOT_FOUND",message:"Challenge invitation not found"}},{status:404});
  const {data,error}=await auth.supabase.from("challenge_members").insert({challenge_id:id,user_id:auth.userId,status:"accepted",joined_at:new Date().toISOString()}).select().single();
  if(error)return failure(error);
  return NextResponse.json({data},{status:201});
 }catch(error){return failure(error)}
}
