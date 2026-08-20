import {NextResponse} from "next/server";
import {authenticated,failure} from "@/domains/shared/http";
import {billingConfigurationReady,stripeClient} from "@/lib/stripe";

export async function POST(){
 try{
  const auth=await authenticated();if("error" in auth)return auth.error;
  const stripe=stripeClient(),price=process.env.STRIPE_PRO_PRICE_ID,appUrl=process.env.NEXT_PUBLIC_APP_URL;
  if(!billingConfigurationReady()||!stripe||!price||!appUrl)return NextResponse.json({error:{code:"BILLING_NOT_CONFIGURED",message:"SkillTree Pro checkout is not available in this environment yet."}},{status:503});
  const {data:existing,error:readError}=await auth.supabase.from("subscriptions").select("provider_customer_id,status").maybeSingle();
  if(readError)throw readError;
  let customer=existing?.provider_customer_id||undefined;
  if(!customer){
   const {data:user,error:userError}=await auth.supabase.auth.getUser();if(userError)throw userError;
   const created=await stripe.customers.create({email:user.user?.email,metadata:{skilltree_user_id:auth.userId}},{idempotencyKey:`customer:${auth.userId}`});customer=created.id;
   const {error:saveError}=await auth.supabase.from("subscriptions").upsert({user_id:auth.userId,provider:"stripe",provider_customer_id:customer,plan:"free",status:"active"},{onConflict:"user_id"});
   if(saveError)throw saveError;
  }
  const session=await stripe.checkout.sessions.create({mode:"subscription",customer,line_items:[{price,quantity:1}],success_url:`${appUrl}/app?billing=success`,cancel_url:`${appUrl}/app?billing=cancelled`,allow_promotion_codes:true,integration_identifier:"skilltree_ir_lprodapp",subscription_data:{trial_period_days:14,metadata:{skilltree_user_id:auth.userId}},metadata:{skilltree_user_id:auth.userId}},{idempotencyKey:`checkout:${auth.userId}:${Math.floor(Date.now()/300000)}`});
  return NextResponse.json({data:{url:session.url}})
 }catch(error){return failure(error)}
}
