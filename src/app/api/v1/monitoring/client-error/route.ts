import {NextResponse} from "next/server";
import {authenticated} from "@/domains/shared/http";
import {reportProductionError} from "@/lib/monitoring";
export async function POST(request:Request){const auth=await authenticated();if("error" in auth)return auth.error;const body=await request.json().catch(()=>null) as {message?:string;stack?:string;route?:string}|null;if(!body?.message)return NextResponse.json({error:{code:"VALIDATION_FAILED",message:"Error message is required"}},{status:422});await reportProductionError({source:"client",message:body.message,stack:body.stack,route:body.route});return new NextResponse(null,{status:202})}
