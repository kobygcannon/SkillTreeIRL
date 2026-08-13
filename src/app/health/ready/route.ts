import {NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {legalConfigurationReady} from "@/lib/legal";
import {monitoringConfigurationReady} from "@/lib/monitoring";

export async function GET(){
  const production=process.env.APP_ENV==="production";
  const core=Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY&&process.env.SUPABASE_SECRET_KEY&&process.env.WEBHOOK_ENCRYPTION_KEY&&process.env.CRON_SECRET&&(!production||process.env.RATE_LIMIT_SECRET));
  const legal=!production||legalConfigurationReady(),monitoring=!production||monitoringConfigurationReady(),configuration=core&&legal&&monitoring;
  if(!configuration)return NextResponse.json({status:"not_ready",release:process.env.APP_RELEASE||"unknown",checks:{configuration:false,legal,monitoring,database:false,requestProtection:false}},{status:503,headers:{"cache-control":"no-store"}});
  const admin=createAdminClient();if(!admin)return NextResponse.json({status:"not_ready",release:process.env.APP_RELEASE||"unknown",checks:{configuration:true,legal,monitoring,database:false,requestProtection:false}},{status:503,headers:{"cache-control":"no-store"}});
  const [database,requestProtection]=await Promise.all([admin.from("feature_flags").select("key",{head:true,count:"exact"}).limit(1),admin.from("rate_limit_buckets").select("key_hash",{head:true,count:"exact"}).limit(1)]),ready=!database.error&&!requestProtection.error;
  return NextResponse.json({status:ready?"ready":"not_ready",release:process.env.APP_RELEASE||"unknown",checks:{configuration:true,legal,monitoring,database:!database.error,requestProtection:!requestProtection.error}},{status:ready?200:503,headers:{"cache-control":"no-store"}});
}
