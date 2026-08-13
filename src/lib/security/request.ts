import {createHmac} from "node:crypto";
import type {NextRequest} from "next/server";
import {createAdminClient} from "../supabase/admin";

export type RateLimitPolicy={scope:string;limit:number;windowSeconds:number};
const unsafeMethods=new Set(["POST","PUT","PATCH","DELETE"]);
const csrfExemptPaths=["/api/stripe/webhook","/api/internal/jobs/"];

export function hasSupabaseSessionCookie(cookieNames:string[]){return cookieNames.some(name=>name.startsWith("sb-")&&name.includes("-auth-token"))}
export function isCsrfExempt(pathname:string){return csrfExemptPaths.some(path=>pathname===path||pathname.startsWith(path))}
export function isAllowedMutationOrigin(input:{method:string;pathname:string;origin:string|null;secFetchSite:string|null;requestOrigin:string;appOrigin?:string;hasSessionCookie:boolean}){
  if(!unsafeMethods.has(input.method.toUpperCase())||isCsrfExempt(input.pathname))return true;
  if(input.secFetchSite?.toLowerCase()==="cross-site")return false;
  if(!input.origin)return !input.hasSessionCookie;
  let supplied:string;try{supplied=new URL(input.origin).origin}catch{return false}
  const allowed=new Set([input.requestOrigin]);if(input.appOrigin){try{allowed.add(new URL(input.appOrigin).origin)}catch{return false}}
  return allowed.has(supplied);
}
export function rateLimitPolicy(method:string,pathname:string):RateLimitPolicy|null{
  const verb=method.toUpperCase();
  if(verb==="POST"&&pathname==="/sign-in")return{scope:"authentication",limit:20,windowSeconds:600};
  if(verb==="POST"&&pathname==="/recover")return{scope:"password-recovery",limit:5,windowSeconds:3600};
  if(unsafeMethods.has(verb)&&pathname==="/api/v1/evidence/upload")return{scope:"evidence-upload",limit:20,windowSeconds:60};
  if(verb==="GET"&&pathname==="/api/v1/search")return{scope:"search",limit:60,windowSeconds:60};
  if(verb==="GET"&&pathname.startsWith("/u/"))return{scope:"public-profile",limit:120,windowSeconds:60};
  if(verb==="GET"&&pathname.startsWith("/r/"))return{scope:"public-invitation",limit:60,windowSeconds:60};
  if(pathname.startsWith("/api/v1/integrations/")&&pathname.endsWith("/callback"))return{scope:"integration-callback",limit:30,windowSeconds:600};
  if(unsafeMethods.has(verb)&&pathname.startsWith("/api/v1/"))return{scope:"api-mutation",limit:120,windowSeconds:60};
  return null;
}
export function clientAddress(request:NextRequest){for(const header of ["x-vercel-forwarded-for","cf-connecting-ip","x-real-ip","x-forwarded-for"]){const value=request.headers.get(header)?.split(",")[0]?.trim();if(value)return value}return "unknown"}
export async function consumeRequestLimit(request:NextRequest,policy:RateLimitPolicy){
  const secret=process.env.RATE_LIMIT_SECRET||process.env.WEBHOOK_ENCRYPTION_KEY,admin=createAdminClient();
  if(!secret||!admin)return process.env.APP_ENV!=="production";
  const session=request.cookies.getAll().find(({name})=>name.startsWith("sb-")&&name.includes("-auth-token"))?.value||"anonymous";
  const identity=createHmac("sha256",secret).update(`${clientAddress(request)}\u0000${session}`).digest("hex");
  const keyHash=createHmac("sha256",secret).update(`${policy.scope}\u0000${request.nextUrl.pathname}\u0000${identity}`).digest("hex");
  const {data,error}=await admin.rpc("consume_rate_limit",{p_key_hash:keyHash,p_limit:policy.limit,p_window_seconds:policy.windowSeconds});
  if(error)throw error;return data===true;
}
