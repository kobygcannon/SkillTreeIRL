import Stripe from "stripe";
export function stripeClient(){const key=process.env.STRIPE_SECRET_KEY;if(!key)return null;return new Stripe(key,{appInfo:{name:"SkillTree IRL",version:"1.0.0"},maxNetworkRetries:2,timeout:15000})}
export function stripeMode():"disabled"|"test"|"live"{const key=process.env.STRIPE_SECRET_KEY||"";if(key.startsWith("sk_live_")||key.startsWith("rk_live_"))return"live";if(key.startsWith("sk_test_")||key.startsWith("rk_test_"))return"test";return"disabled"}
export function billingConfigurationReady(){
 const configured=Boolean(
  process.env.STRIPE_SECRET_KEY &&
  process.env.STRIPE_WEBHOOK_SECRET &&
  process.env.STRIPE_PRO_PRICE_ID,
 );
 const production=(process.env.APP_ENV||process.env.VERCEL_ENV)==="production";
 return configured&&(!production||stripeMode()==="live");
}
