import {NextResponse} from "next/server";
export function GET(){return NextResponse.json({status:"ok",service:"skilltree-irl",environment:process.env.APP_ENV||process.env.NODE_ENV||"unknown",release:process.env.APP_RELEASE||"unknown",time:new Date().toISOString()},{headers:{"cache-control":"no-store"}})}
