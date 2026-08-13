import {createServerClient} from "@supabase/ssr";
import {NextResponse,type NextRequest} from "next/server";

export async function refreshSession(request:NextRequest){
  let response=NextResponse.next({request});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)return response;
  const supabase=createServerClient(url,key,{cookies:{getAll:()=>request.cookies.getAll(),setAll(values){values.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});values.forEach(({name,value,options})=>response.cookies.set(name,value,options))}}});
  const {data}=await supabase.auth.getUser();
  const signedIn=Boolean(data.user);
  if(!signedIn&&request.cookies.getAll().some(({name})=>name.startsWith("sb-")&&name.includes("-auth-token")))await supabase.auth.signOut({scope:"local"});
  const pathname=request.nextUrl.pathname,protectedPath=["/app","/onboarding","/mfa","/settings","/community","/tools","/templates","/referrals","/admin","/skills","/activities","/quests","/habits","/journal","/achievements"].some(path=>pathname.startsWith(path))||(/^\/goals\/[^/]+/.test(pathname));
  const redirect=(target:URL)=>{const redirected=NextResponse.redirect(target);response.cookies.getAll().forEach(cookie=>redirected.cookies.set(cookie));return redirected};
  if(protectedPath&&!signedIn){const target=request.nextUrl.clone(),next=`${request.nextUrl.pathname}${request.nextUrl.search}`;target.pathname="/sign-in";target.search="";target.searchParams.set("next",next);return redirect(target)}
  return response;
}
