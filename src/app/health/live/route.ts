import {NextResponse} from "next/server";
import {deploymentEnvironment,deploymentRelease} from "@/lib/deployment-metadata";
export function GET(){return NextResponse.json({status:"ok",service:"skilltree-irl",environment:deploymentEnvironment(),release:deploymentRelease(),time:new Date().toISOString()},{headers:{"cache-control":"no-store"}})}
