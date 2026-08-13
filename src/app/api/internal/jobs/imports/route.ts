import {NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {reportProductionError} from "@/lib/monitoring";
export async function POST(request:Request){
 if(!process.env.CRON_SECRET||request.headers.get("authorization")!==`Bearer ${process.env.CRON_SECRET}`)return NextResponse.json({error:{code:"UNAUTHORIZED"}},{status:401});
 const admin=createAdminClient();if(!admin)return NextResponse.json({error:{code:"NOT_CONFIGURED"}},{status:503});
 const worker=`import-${crypto.randomUUID()}`;
 const {data:jobs,error}=await admin.from("background_jobs").select("id,payload,attempts,max_attempts").eq("job_type","process_import").in("status",["pending","failed"]).lte("run_after",new Date().toISOString()).order("run_after").limit(10);
 if(error)return NextResponse.json({error:{code:"DATABASE_ERROR"}},{status:500});let processed=0;
 for(const job of jobs||[]){
  const {data:claimed}=await admin.from("background_jobs").update({status:"running",locked_at:new Date().toISOString(),locked_by:worker}).eq("id",job.id).in("status",["pending","failed"]).select("id").maybeSingle();if(!claimed)continue;
  try{let count=0;do{const result=await admin.rpc("run_import_batch",{p_import_id:(job.payload as {importId:string}).importId,p_batch_size:250});if(result.error)throw result.error;count=Number(result.data||0);processed+=count}while(count>0);await admin.from("background_jobs").update({status:"completed",completed_at:new Date().toISOString(),attempts:job.attempts+1}).eq("id",job.id)}
  catch(error){const attempts=job.attempts+1;await admin.from("background_jobs").update({status:attempts>=job.max_attempts?"dead":"failed",attempts,last_error:error instanceof Error?error.message.slice(0,500):"Import failed",run_after:new Date(Date.now()+Math.min(3600000,30000*2**attempts)).toISOString(),locked_at:null,locked_by:null}).eq("id",job.id);await reportProductionError({message:error instanceof Error?error.message:"Import worker failed",stack:error instanceof Error?error.stack:undefined,source:"job",route:"import-worker",context:{jobId:job.id,attempts,dead:attempts>=job.max_attempts}})}
 }
 return NextResponse.json({data:{jobs:(jobs||[]).length,rowsProcessed:processed}})
}
export const GET=POST;
