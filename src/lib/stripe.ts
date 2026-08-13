import Stripe from "stripe";
export function stripeClient(){const key=process.env.STRIPE_SECRET_KEY;if(!key)return null;return new Stripe(key,{appInfo:{name:"SkillTree IRL",version:"1.0.0"},maxNetworkRetries:2,timeout:15000})}
export function billingConfigurationReady(){
 return Boolean(
  process.env.STRIPE_SECRET_KEY &&
  process.env.STRIPE_WEBHOOK_SECRET &&
  process.env.STRIPE_PRO_PRICE_ID,
 );
}
