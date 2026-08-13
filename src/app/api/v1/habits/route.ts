import { NextResponse } from "next/server";
import { authenticated, failure } from "@/domains/shared/http";

export async function GET() {
  const auth=await authenticated(); if("error" in auth)return auth.error;
  const {data,error}=await auth.supabase.from("habits").select("id,name,frequency,timezone,xp_reward,minimum_target,minimum_unit,goal_id,start_date,end_date,archived_at,updated_at").is("archived_at",null).order("start_date",{ascending:false}).limit(250);
  if(error)return failure(error); return NextResponse.json({data});
}

export async function POST(request:Request) {
  try {
    const auth=await authenticated(); if("error" in auth)return auth.error;
    const body=await request.json() as {name?:string;frequency?:{days?:number[]};timezone?:string;xpReward?:number;goalId?:string;skillId?:string;skillIds?:string[];minimumTarget?:number;minimumUnit?:string;startDate?:string;endDate?:string;reminderNextRun?:string};
    const name=body.name?.trim(),xp=Math.round(Number(body.xpReward??10)),days=[...new Set(body.frequency?.days||[1,2,3,4,5,6,7])].sort();
    const minimum=body.minimumTarget==null?null:Number(body.minimumTarget);
    if(!name||name.length>180||xp<0||xp>500||!days.length||days.some(day=>!Number.isInteger(day)||day<1||day>7)||(minimum!==null&&(!Number.isFinite(minimum)||minimum<=0||!body.minimumUnit?.trim())))return NextResponse.json({error:{code:"VALIDATION_FAILED",message:"Check the habit name, preferred days, minimum target, and XP."}},{status:422});
    const skillIds=[...new Set(body.skillIds?.filter(Boolean)||(body.skillId?[body.skillId]:[]))],frequency={kind:"weekly",days},startDate=body.startDate||new Date().toISOString().slice(0,10);
    const {data,error}=await auth.supabase.rpc("create_configured_habit",{p_name:name,p_frequency:frequency,p_timezone:body.timezone||"UTC",p_goal_id:body.goalId||null,p_skill_ids:skillIds,p_xp_reward:xp,p_minimum_target:minimum,p_minimum_unit:body.minimumUnit||null,p_start_date:startDate,p_end_date:body.endDate||null,p_reminder_next_run:body.reminderNextRun||null,p_reminder_schedule:body.reminderNextRun?{kind:"recurring",intervalDays:1,days}:null});
    if(error)return failure(error); return NextResponse.json({data:{id:data}},{status:201});
  } catch(error) { return failure(error); }
}
