import {createAdminClient} from "../../lib/supabase/admin";

export type Capability="advancedInsights"|"historicalAnalysis"|"yearReviews"|"advancedSkillTree"|"customTemplates"|"advancedRecurrence"|"expandedEvidence"|"integrations"|"imports"|"developerTools";
export type EntitlementRow={entitlement:string;expires_at:string|null};
export type UserCapabilities={plan:"free"|"pro";maxActiveGoals:number;evidenceStorageBytes:number;capabilities:ReadonlySet<Capability>};
const proCapabilities:Capability[]=["advancedInsights","historicalAnalysis","yearReviews","advancedSkillTree","customTemplates","advancedRecurrence","expandedEvidence","integrations","imports","developerTools"];

export function resolveCapabilities(rows:EntitlementRow[],now=new Date()):UserCapabilities{
  const active=new Set(rows.filter(row=>!row.expires_at||new Date(row.expires_at)>now).map(row=>row.entitlement)),pro=active.has("pro"),capabilities=new Set<Capability>();
  if(pro)proCapabilities.forEach(capability=>capabilities.add(capability));
  for(const capability of proCapabilities)if(active.has(capability))capabilities.add(capability);
  return{plan:pro?"pro":"free",maxActiveGoals:pro||active.has("unlimited_active_goals")?Number.MAX_SAFE_INTEGER:10,evidenceStorageBytes:pro||active.has("expandedEvidence")?250*1024*1024:25*1024*1024,capabilities};
}

export async function capabilitiesForUser(userId:string){
  const admin=createAdminClient();if(!admin)throw new Error("Entitlement service is not configured");
  const {data,error}=await admin.from("entitlements").select("entitlement,expires_at").eq("user_id",userId);if(error)throw error;
  return resolveCapabilities(data||[]);
}

export async function userCan(userId:string,capability:Capability){return(await capabilitiesForUser(userId)).capabilities.has(capability)}
