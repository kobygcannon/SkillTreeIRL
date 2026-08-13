import {NextResponse} from "next/server";
import type Stripe from "stripe";
import {stripeClient} from "@/lib/stripe";
import {createAdminClient} from "@/lib/supabase/admin";
type DbResult={error:{message:string}|null};
function assertDb(result:DbResult,operation:string){if(result.error)throw new Error(`${operation}: ${result.error.message}`)}
function subscriptionStatus(status:Stripe.Subscription.Status){if(status==="trialing")return"trialing";if(status==="active")return"active";if(status==="past_due"||status==="unpaid"||status==="paused")return"past_due";if(status==="canceled")return"cancelled";return"expired"}
function periodEnd(subscription:Stripe.Subscription){const ends=subscription.items.data.map(item=>item.current_period_end);return ends.length?Math.max(...ends):Math.floor(Date.now()/1000)}
export async function POST(request:Request){
 const stripe=stripeClient(),admin=createAdminClient(),secret=process.env.STRIPE_WEBHOOK_SECRET,signature=request.headers.get("stripe-signature");
 if(!stripe||!admin||!secret||!signature)return NextResponse.json({error:"Webhook not configured"},{status:503});
 const raw=await request.text();let event:Stripe.Event;
 try{event=stripe.webhooks.constructEvent(raw,signature,secret)}catch{return NextResponse.json({error:"Invalid signature"},{status:400})}
 const {error:claimError}=await admin.from("stripe_webhook_events").insert({id:event.id,event_type:event.type});
 if(claimError){if(claimError.code!=="23505")return NextResponse.json({error:"Could not claim event"},{status:500});const {data:existing,error:readError}=await admin.from("stripe_webhook_events").select("status").eq("id",event.id).single();if(readError)return NextResponse.json({error:"Could not read event state"},{status:500});if(existing?.status!=="failed")return NextResponse.json({received:true,duplicate:true});assertDb(await admin.from("stripe_webhook_events").update({status:"processing",error_message:null,processed_at:null}).eq("id",event.id),"Reset webhook event")}
 try{
  if(event.type==="checkout.session.completed"){
   const session=event.data.object as Stripe.Checkout.Session,userId=session.metadata?.skilltree_user_id;
   if(userId&&session.customer&&session.subscription){assertDb(await admin.from("subscriptions").upsert({user_id:userId,provider:"stripe",provider_customer_id:String(session.customer),provider_subscription_id:String(session.subscription),plan:"pro",status:"active",updated_at:new Date().toISOString()},{onConflict:"user_id"}),"Save checkout subscription");assertDb(await admin.from("referrals").update({status:"converted",converted_at:new Date().toISOString()}).eq("referred_id",userId).neq("status","converted"),"Convert referral")}
  }
  if(event.type.startsWith("customer.subscription.")){
   const subscription=event.data.object as Stripe.Subscription;let resolvedUser=subscription.metadata.skilltree_user_id;
   if(!resolvedUser){const {data,error}=await admin.from("subscriptions").select("user_id").eq("provider_customer_id",String(subscription.customer)).maybeSingle();if(error)throw error;resolvedUser=data?.user_id}
   if(resolvedUser){
    const status=subscriptionStatus(subscription.status),expiresAt=new Date(periodEnd(subscription)*1000).toISOString(),price=subscription.items.data[0]?.price,interval=price?.recurring?.interval;
    assertDb(await admin.from("subscriptions").upsert({user_id:resolvedUser,provider:"stripe",provider_customer_id:String(subscription.customer),provider_subscription_id:subscription.id,plan:status==="active"||status==="trialing"?"pro":"free",status,current_period_end:expiresAt,cancel_at_period_end:subscription.cancel_at_period_end,billing_interval:interval==="year"?"year":interval==="month"?"month":null,unit_amount:price?.unit_amount??null,currency:price?.currency?.toUpperCase()||null,updated_at:new Date().toISOString()},{onConflict:"user_id"}),"Save subscription");
    if(status==="active"||status==="trialing")assertDb(await admin.from("entitlements").upsert({user_id:resolvedUser,entitlement:"pro",source:"stripe",expires_at:expiresAt},{onConflict:"user_id,entitlement"}),"Grant entitlement");else assertDb(await admin.from("entitlements").delete().eq("user_id",resolvedUser).eq("entitlement","pro"),"Revoke entitlement")
    if(status==="active"||status==="trialing")assertDb(await admin.from("referrals").update({status:"converted",converted_at:new Date().toISOString()}).eq("referred_id",resolvedUser).neq("status","converted"),"Convert referral")
   }
  }
  assertDb(await admin.from("stripe_webhook_events").update({status:"processed",processed_at:new Date().toISOString()}).eq("id",event.id),"Complete webhook event");return NextResponse.json({received:true})
 }catch(error){await admin.from("stripe_webhook_events").update({status:"failed",error_message:error instanceof Error?error.message.slice(0,500):"Processing failed",processed_at:new Date().toISOString()}).eq("id",event.id);return NextResponse.json({error:"Webhook processing failed"},{status:500})}
}
