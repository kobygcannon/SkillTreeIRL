import {NextResponse} from "next/server";
import type Stripe from "stripe";
import {stripeClient} from "@/lib/stripe";
import {createAdminClient} from "@/lib/supabase/admin";
function subscriptionStatus(status:Stripe.Subscription.Status){if(status==="trialing")return"trialing";if(status==="active")return"active";if(status==="past_due"||status==="unpaid"||status==="paused")return"past_due";if(status==="canceled")return"cancelled";return"expired"}
function periodEnd(subscription:Stripe.Subscription){const ends=subscription.items.data.map(item=>item.current_period_end);return ends.length?Math.max(...ends):Math.floor(Date.now()/1000)}
export async function POST(request:Request){
 const stripe=stripeClient(),admin=createAdminClient(),secret=process.env.STRIPE_WEBHOOK_SECRET,signature=request.headers.get("stripe-signature");
 if(!stripe||!admin||!secret||!signature)return NextResponse.json({error:"Webhook not configured"},{status:503});
 const raw=await request.text();let event:Stripe.Event;
 try{event=stripe.webhooks.constructEvent(raw,signature,secret)}catch{return NextResponse.json({error:"Invalid signature"},{status:400})}
 const {error:claimError}=await admin.from("stripe_webhook_events").insert({id:event.id,event_type:event.type});
 if(claimError){if(claimError.code!=="23505")return NextResponse.json({error:"Could not claim event"},{status:500});const {data:existing}=await admin.from("stripe_webhook_events").select("status").eq("id",event.id).single();if(existing?.status!=="failed")return NextResponse.json({received:true,duplicate:true});await admin.from("stripe_webhook_events").update({status:"processing",error_message:null,processed_at:null}).eq("id",event.id)}
 try{
  if(event.type==="checkout.session.completed"){
   const session=event.data.object as Stripe.Checkout.Session,userId=session.metadata?.skilltree_user_id;
   if(userId){await admin.from("subscriptions").upsert({user_id:userId,provider:"stripe",provider_customer_id:String(session.customer),provider_subscription_id:String(session.subscription),plan:"pro",status:"active",updated_at:new Date().toISOString()},{onConflict:"user_id"});await admin.from("referrals").update({status:"converted",converted_at:new Date().toISOString()}).eq("referred_id",userId).neq("status","converted")}
  }
  if(event.type.startsWith("customer.subscription.")){
   const subscription=event.data.object as Stripe.Subscription;let resolvedUser=subscription.metadata.skilltree_user_id;
   if(!resolvedUser){const {data}=await admin.from("subscriptions").select("user_id").eq("provider_customer_id",String(subscription.customer)).maybeSingle();resolvedUser=data?.user_id}
   if(resolvedUser){
    const status=subscriptionStatus(subscription.status),expiresAt=new Date(periodEnd(subscription)*1000).toISOString(),price=subscription.items.data[0]?.price,interval=price?.recurring?.interval;
    await admin.from("subscriptions").upsert({user_id:resolvedUser,provider:"stripe",provider_customer_id:String(subscription.customer),provider_subscription_id:subscription.id,plan:status==="active"||status==="trialing"?"pro":"free",status,current_period_end:expiresAt,cancel_at_period_end:subscription.cancel_at_period_end,billing_interval:interval==="year"?"year":interval==="month"?"month":null,unit_amount:price?.unit_amount??null,currency:price?.currency?.toUpperCase()||null,updated_at:new Date().toISOString()},{onConflict:"user_id"});
    if(status==="active"||status==="trialing")await admin.from("entitlements").upsert({user_id:resolvedUser,entitlement:"pro",source:"stripe",expires_at:expiresAt},{onConflict:"user_id,entitlement"});else await admin.from("entitlements").delete().eq("user_id",resolvedUser).eq("entitlement","pro")
    if(status==="active"||status==="trialing")await admin.from("referrals").update({status:"converted",converted_at:new Date().toISOString()}).eq("referred_id",resolvedUser).neq("status","converted")
   }
  }
  await admin.from("stripe_webhook_events").update({status:"processed",processed_at:new Date().toISOString()}).eq("id",event.id);return NextResponse.json({received:true})
 }catch(error){await admin.from("stripe_webhook_events").update({status:"failed",error_message:error instanceof Error?error.message.slice(0,500):"Processing failed",processed_at:new Date().toISOString()}).eq("id",event.id);return NextResponse.json({error:"Webhook processing failed"},{status:500})}
}
