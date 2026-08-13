import * as Sentry from "@sentry/nextjs";

type ErrorReport={message:string;stack?:string;digest?:string;route?:string;method?:string;source:"server"|"client"|"job"|"provider";severity?:"warning"|"error"|"fatal";fingerprint?:string;context?:Record<string,string|number|boolean|null>};
const sensitive=/password|token|secret|authorization|cookie|journal|evidence|note|body/i;
function sanitize(report:ErrorReport){return{...report,message:report.message.slice(0,500),stack:report.stack?.slice(0,4000),context:Object.fromEntries(Object.entries(report.context||{}).filter(([key])=>!sensitive.test(key)).slice(0,30))}}
export function monitoringConfigurationReady(){
  const dsn=(process.env.SENTRY_DSN||process.env.NEXT_PUBLIC_SENTRY_DSN)?.trim();
  if(dsn){try{return new URL(dsn).protocol==="https:"}catch{return false}}
  const endpoint=process.env.ERROR_MONITOR_URL?.trim(),token=process.env.ERROR_MONITOR_TOKEN?.trim();
  if(!endpoint||!token)return false;
  try{return new URL(endpoint).protocol==="https:"}catch{return false}
}
export async function reportProductionError(report:ErrorReport){const safe=sanitize(report);if(process.env.SENTRY_DSN||process.env.NEXT_PUBLIC_SENTRY_DSN){const error=new Error(safe.message);if(safe.stack)error.stack=safe.stack;Sentry.captureException(error,{level:safe.severity||"error",fingerprint:safe.fingerprint?[safe.fingerprint]:undefined,tags:{source:safe.source,route:safe.route||"unknown",method:safe.method||"unknown",severity:safe.severity||"error"},extra:{digest:safe.digest,...safe.context}});return}const endpoint=process.env.ERROR_MONITOR_URL,token=process.env.ERROR_MONITOR_TOKEN;if(!endpoint){console.error(JSON.stringify({level:safe.severity||"error",event:"application_error",...safe,environment:process.env.APP_ENV||process.env.NODE_ENV,release:process.env.APP_RELEASE||"unknown"}));return}try{await fetch(endpoint,{method:"POST",headers:{"content-type":"application/json",...(token?{authorization:`Bearer ${token}`}:{})},body:JSON.stringify({...safe,environment:process.env.APP_ENV||process.env.NODE_ENV,release:process.env.APP_RELEASE||"unknown",occurredAt:new Date().toISOString()}),signal:AbortSignal.timeout(5000)})}catch(error){console.error("Error monitor delivery failed",error instanceof Error?error.message:"unknown")}}
