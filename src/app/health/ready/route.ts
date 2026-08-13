import {NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {legalConfigurationReady} from "@/lib/legal";
import {monitoringConfigurationReady} from "@/lib/monitoring";
import {deploymentEnvironment,deploymentRelease} from "@/lib/deployment-metadata";

export async function GET(){
  const production=deploymentEnvironment()==="production";
  const core=Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY&&process.env.SUPABASE_SECRET_KEY&&process.env.WEBHOOK_ENCRYPTION_KEY&&process.env.CRON_SECRET);
  const requestProtectionConfigured=!production||Boolean(process.env.RATE_LIMIT_SECRET);
  const legal=!production||legalConfigurationReady(),monitoring=!production||monitoringConfigurationReady(),configuration=core&&requestProtectionConfigured&&legal&&monitoring;
  const admin=core?createAdminClient():null;
  const [database,requestProtection]=admin?await Promise.all([admin.from("feature_flags").select("key",{head:true,count:"exact"}).limit(1),admin.from("rate_limit_buckets").select("key_hash",{head:true,count:"exact"}).limit(1)]):[{error:new Error("Database configuration is incomplete")},{error:new Error("Database configuration is incomplete")}];
  const checks={configuration,legal,monitoring,database:!database.error,requestProtection:requestProtectionConfigured&&!requestProtection.error},ready=Object.values(checks).every(Boolean);
  return NextResponse.json({status:ready?"ready":"not_ready",release:deploymentRelease(),checks},{status:ready?200:503,headers:{"cache-control":"no-store"}});
}
