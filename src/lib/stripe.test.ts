import { afterEach, describe, expect, it } from "vitest";
import {
  billingConfigurationReady,
  companyBillingConfigurationReady,
  stripeMode,
} from "./stripe";

const original = {
  key: process.env.STRIPE_SECRET_KEY,
  webhook: process.env.STRIPE_WEBHOOK_SECRET,
  price: process.env.STRIPE_PRO_PRICE_ID,
  teamPrice: process.env.STRIPE_TEAM_PRICE_ID,
  appEnv: process.env.APP_ENV,
};

afterEach(() => {
  for (const [name, value] of Object.entries({
    STRIPE_SECRET_KEY: original.key,
    STRIPE_WEBHOOK_SECRET: original.webhook,
    STRIPE_PRO_PRICE_ID: original.price,
    STRIPE_TEAM_PRICE_ID: original.teamPrice,
    APP_ENV: original.appEnv,
  })) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

describe("billingConfigurationReady", () => {
  it("requires the API key, webhook secret, and Pro price", () => {
    delete process.env.STRIPE_SECRET_KEY;
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    process.env.STRIPE_PRO_PRICE_ID = "price_test";
    expect(billingConfigurationReady()).toBe(false);
    expect(stripeMode()).toBe("disabled");
  });

  it("accepts a complete server-side billing configuration", () => {
    process.env.STRIPE_SECRET_KEY = "rk_test_value";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    process.env.STRIPE_PRO_PRICE_ID = "price_test";
    expect(billingConfigurationReady()).toBe(true);
    expect(stripeMode()).toBe("test");
    expect(companyBillingConfigurationReady()).toBe(false);
    process.env.STRIPE_TEAM_PRICE_ID = "price_team";
    expect(companyBillingConfigurationReady()).toBe(true);
  });
  it("never treats test credentials as production-ready", () => {
    process.env.APP_ENV = "production";
    process.env.STRIPE_SECRET_KEY = "sk_test_value";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    process.env.STRIPE_PRO_PRICE_ID = "price_test";
    expect(billingConfigurationReady()).toBe(false);
    process.env.STRIPE_SECRET_KEY = "sk_live_value";
    expect(billingConfigurationReady()).toBe(true);
    expect(stripeMode()).toBe("live");
  });
});
