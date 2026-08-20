import { deploymentEnvironment } from "./deployment-metadata";
import { legalConfigurationReady } from "./legal";
import { monitoringConfigurationReady } from "./monitoring";
import { emailNotificationsReady } from "./notifications/email";
import { billingConfigurationReady } from "./stripe";

export function publicRegistrationReady() {
  if (deploymentEnvironment() !== "production") return true;
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
    process.env.SUPABASE_SECRET_KEY &&
    process.env.WEBHOOK_ENCRYPTION_KEY &&
    process.env.CRON_SECRET &&
    process.env.RATE_LIMIT_SECRET &&
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT &&
    legalConfigurationReady() &&
    monitoringConfigurationReady() &&
    emailNotificationsReady() &&
    billingConfigurationReady(),
  );
}
