import {NextResponse} from "next/server";import {authenticated,failure} from "@/domains/shared/http";
export async function POST(){const auth=await authenticated();if("error" in auth)return auth.error;const {error}=await auth.supabase.auth.signOut({scope:"global"});if(error)return failure(error);return NextResponse.json({data:{signedOut:true}})}
