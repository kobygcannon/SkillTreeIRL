import {authenticated,failure} from "@/domains/shared/http";
import {createAdminClient} from "@/lib/supabase/admin";
import {NextResponse} from "next/server";

type AdminRole="support"|"moderator"|"admin"|"superadmin";
type AdminResult={admin:NonNullable<ReturnType<typeof createAdminClient>>;userId:string;role:AdminRole;error?:never}|{error:NextResponse;admin?:never;userId?:never;role?:never};

export async function authorizedAdmin(roles:AdminRole[]=["admin","superadmin"]):Promise<AdminResult>{
 const auth=await authenticated();
 if("error" in auth&&auth.error)return {error:auth.error};
 const admin=createAdminClient();
 if(!admin)return {error:NextResponse.json({error:{code:"NOT_CONFIGURED",message:"Admin service is unavailable"}},{status:503})};
 const {data,error}=await admin.from("admin_users").select("role").eq("user_id",auth.userId).maybeSingle();
 if(error)return {error:failure(error)};
 if(!data||!roles.includes(data.role as AdminRole))return {error:NextResponse.json({error:{code:"FORBIDDEN",message:"Admin access is required"}},{status:403})};
 return {admin,userId:auth.userId,role:data.role as AdminRole};
}
