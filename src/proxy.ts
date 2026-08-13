import {NextResponse,type NextRequest} from "next/server";
import {refreshSession} from "@/lib/supabase/proxy";
import {consumeRequestLimit,hasSupabaseSessionCookie,isAllowedMutationOrigin,rateLimitPolicy} from "@/lib/security/request";

function secured(response:NextResponse,requestId:string){
  let configuredSupabase="";try{const origin=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL||"").origin;configuredSupabase=` ${origin} ${origin.replace(/^http/,"ws")}`}catch{}
  response.headers.set("x-request-id",requestId);response.headers.set("x-content-type-options","nosniff");response.headers.set("x-frame-options","DENY");response.headers.set("referrer-policy","strict-origin-when-cross-origin");response.headers.set("permissions-policy","camera=(), microphone=(), geolocation=()");response.headers.set("cross-origin-opener-policy","same-origin");response.headers.set("content-security-policy",`default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co${configuredSupabase}; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests`);return response;
}
function errorResponse(request:NextRequest,status:number,message:string,headers?:HeadersInit){return request.nextUrl.pathname.startsWith("/api/")?NextResponse.json({error:message},{status,headers}):new NextResponse(message,{status,headers})}
function privateIndexPath(pathname:string){return pathname.startsWith("/api/")||["/app","/onboarding","/mfa","/settings","/community","/tools","/templates","/referrals","/admin","/skills/","/activities/","/quests/","/habits/","/journal/","/achievements/"].some(path=>pathname.startsWith(path))||/^\/goals\/[^/]+/.test(pathname)}

export async function proxy(request:NextRequest){
  const started=Date.now(),requestId=request.headers.get("x-request-id")||crypto.randomUUID(),pathname=request.nextUrl.pathname;
  const allowed=isAllowedMutationOrigin({method:request.method,pathname,origin:request.headers.get("origin"),secFetchSite:request.headers.get("sec-fetch-site"),requestOrigin:request.nextUrl.origin,appOrigin:process.env.NEXT_PUBLIC_APP_URL,hasSessionCookie:hasSupabaseSessionCookie(request.cookies.getAll().map(cookie=>cookie.name))});
  let response:NextResponse;
  if(!allowed)response=errorResponse(request,403,"Cross-site mutation blocked");
  else{
    const policy=rateLimitPolicy(request.method,pathname);
    if(policy){
      try{const permitted=await consumeRequestLimit(request,policy);response=permitted?await refreshSession(request):errorResponse(request,429,"Too many requests",{"retry-after":String(policy.windowSeconds)})}
      catch{response=errorResponse(request,503,"Request protection temporarily unavailable",{"retry-after":"30"})}
    }else response=await refreshSession(request);
  }
  secured(response,requestId);
  if(privateIndexPath(pathname))response.headers.set("x-robots-tag","noindex, nofollow, noarchive");
  console.info(JSON.stringify({level:"info",event:"request",requestId,route:pathname,method:request.method,status:response.status,durationMs:Date.now()-started}));
  return response;
}
export const config={matcher:["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]};
