import {NextResponse} from "next/server";
import {authenticated,failure} from "@/domains/shared/http";

type ActivityRow={occurred_at:string;duration_minutes:number|null;quantity:number|null;unit:string|null};
type XpRow={amount:number;created_at:string};
type MemberRow={user_id:string;status:string;progress:number;joined_at:string|null};

export async function GET(){
 const auth=await authenticated();if("error" in auth)return auth.error;
 const {data,error}=await auth.supabase.from("challenges").select("*,challenge_members(user_id,status,progress,joined_at)").order("starts_at",{ascending:false}).limit(100);
 if(error)return failure(error);if(!data?.length)return NextResponse.json({data:[],userId:auth.userId});
 const earliest=data.reduce((value,item)=>item.starts_at<value?item.starts_at:value,data[0].starts_at),latest=data.reduce((value,item)=>item.ends_at>value?item.ends_at:value,data[0].ends_at);
 const [activities,xp]=await Promise.all([
  auth.supabase.from("activities").select("occurred_at,duration_minutes,quantity,unit").is("reversed_at",null).gte("occurred_at",earliest).lte("occurred_at",latest),
  auth.supabase.from("xp_transactions").select("amount,created_at").is("reversal_of",null).gte("created_at",earliest).lte("created_at",latest)
 ]);
 if(activities.error||xp.error)return failure(activities.error||xp.error);
 const enriched=data.map(challenge=>{
  const mine=(challenge.challenge_members as MemberRow[]).find(member=>member.user_id===auth.userId),within=(activities.data as ActivityRow[]||[]).filter(item=>item.occurred_at>=challenge.starts_at&&item.occurred_at<=challenge.ends_at);
  const calculated=challenge.metric==="xp"?(xp.data as XpRow[]||[]).filter(item=>item.created_at>=challenge.starts_at&&item.created_at<=challenge.ends_at).reduce((sum,item)=>sum+Number(item.amount),0):challenge.metric==="duration"?within.reduce((sum,item)=>sum+Number(item.duration_minutes||0),0):challenge.metric==="distance"?within.filter(item=>["km","mi","m"].includes(String(item.unit||"").toLowerCase())).reduce((sum,item)=>sum+Number(item.quantity||0),0):within.length;
  return{...challenge,my_status:mine?.status||null,my_progress:mine?.status==="accepted"?calculated:0};
 });
 return NextResponse.json({data:enriched,userId:auth.userId});
}

export async function POST(request:Request){try{const auth=await authenticated();if("error" in auth)return auth.error;const body=await request.json() as {title?:string;description?:string;startsAt?:string;endsAt?:string;metric?:string;target?:number;visibility?:string;invitees?:string[]};if(!body.title?.trim()||!body.startsAt||!body.endsAt)return NextResponse.json({error:{code:"VALIDATION_FAILED",message:"Title, start and end dates are required"}},{status:422});if(new Date(body.endsAt)<=new Date(body.startsAt))return NextResponse.json({error:{code:"VALIDATION_FAILED",message:"Challenge end must be after its start"}},{status:422});const allowedMetrics=["activities","xp","distance","duration","custom"],allowedVisibility=["invite_only","friends","public"];if(!allowedMetrics.includes(body.metric||"activities")||!allowedVisibility.includes(body.visibility||"invite_only")||!Number.isFinite(Number(body.target))||Number(body.target)<=0)return NextResponse.json({error:{code:"VALIDATION_FAILED",message:"Choose a valid measure, visibility, and positive target"}},{status:422});const {data,error}=await auth.supabase.from("challenges").insert({creator_id:auth.userId,title:body.title.trim(),description:body.description?.trim()||null,starts_at:body.startsAt,ends_at:body.endsAt,metric:body.metric||"activities",target:Number(body.target),visibility:body.visibility||"invite_only"}).select().single();if(error)return failure(error);const members=[auth.userId,...new Set(body.invitees||[])];const {error:memberError}=await auth.supabase.from("challenge_members").insert(members.map(userId=>({challenge_id:data.id,user_id:userId,status:userId===auth.userId?"accepted":"invited",joined_at:userId===auth.userId?new Date().toISOString():null})));if(memberError)return failure(memberError);return NextResponse.json({data},{status:201})}catch(error){return failure(error)}}
