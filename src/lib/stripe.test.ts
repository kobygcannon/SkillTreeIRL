import {afterEach,describe,expect,it} from "vitest";
import {billingConfigurationReady} from "./stripe";

const original={
 key:process.env.STRIPE_SECRET_KEY,
 webhook:process.env.STRIPE_WEBHOOK_SECRET,
 price:process.env.STRIPE_PRO_PRICE_ID,
};

afterEach(()=>{
 for(const [name,value] of Object.entries({STRIPE_SECRET_KEY:original.key,STRIPE_WEBHOOK_SECRET:original.webhook,STRIPE_PRO_PRICE_ID:original.price})){
  if(value===undefined)delete process.env[name];else process.env[name]=value;
 }
});

describe("billingConfigurationReady",()=>{
 it("requires the API key, webhook secret, and Pro price",()=>{
  delete process.env.STRIPE_SECRET_KEY;
  process.env.STRIPE_WEBHOOK_SECRET="whsec_test";
  process.env.STRIPE_PRO_PRICE_ID="price_test";
  expect(billingConfigurationReady()).toBe(false);
 });

 it("accepts a complete server-side billing configuration",()=>{
  process.env.STRIPE_SECRET_KEY="rk_test_value";
  process.env.STRIPE_WEBHOOK_SECRET="whsec_test";
  process.env.STRIPE_PRO_PRICE_ID="price_test";
  expect(billingConfigurationReady()).toBe(true);
 });
});
