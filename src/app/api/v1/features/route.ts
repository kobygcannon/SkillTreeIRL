import {NextResponse} from "next/server";import {authenticated} from "@/domains/shared/http";import {userFeatures} from "@/lib/features";
export async function GET(){const auth=await authenticated();if("error" in auth)return auth.error;return NextResponse.json({data:await userFeatures(auth.userId)})}
