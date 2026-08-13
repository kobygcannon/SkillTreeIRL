import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { legalConfigurationReady } from "@/lib/legal";
import { monitoringConfigurationReady } from "@/lib/monitoring";
import {
  deploymentEnvironment,
  deploymentRelease,
} from "@/lib/deployment-metadata";
import { emailNotificationsReady } from "@/lib/notifications/email";

export async function GET() {
  const production = deploymentEnvironment() === "production";
  const core = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
    process.env.SUPABASE_SECRET_KEY &&
    process.env.WEBHOOK_ENCRYPTION_KEY &&
    process.env.CRON_SECRET,
  );
  const requestProtectionConfigured =
    !production || Boolean(process.env.RATE_LIMIT_SECRET);
  const legal = !production || legalConfigurationReady(),
    monitoring = !production || monitoringConfigurationReady(),
    emailNotifications = !production || emailNotificationsReady(),
    webPushNotifications =
      !production ||
      Boolean(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
        process.env.VAPID_PRIVATE_KEY &&
        process.env.VAPID_SUBJECT,
      ),
    configuration =
      core &&
      requestProtectionConfigured &&
      legal &&
      monitoring &&
      emailNotifications &&
      webPushNotifications;
  const admin = core ? createAdminClient() : null;
  const [database, requestProtection] = admin
    ? await Promise.all([
        admin
          .from("feature_flags")
          .select("key", { head: true, count: "exact" })
          .limit(1),
        admin
          .from("rate_limit_buckets")
          .select("key_hash", { head: true, count: "exact" })
          .limit(1),
      ])
    : [
        { error: new Error("Database configuration is incomplete") },
        { error: new Error("Database configuration is incomplete") },
      ];
  const checks = {
      configuration,
      legal,
      monitoring,
      emailNotifications,
      webPushNotifications,
      database: !database.error,
      requestProtection:
        requestProtectionConfigured && !requestProtection.error,
    },
    ready = Object.values(checks).every(Boolean);
  return NextResponse.json(
    {
      status: ready ? "ready" : "not_ready",
      release: deploymentRelease(),
      checks,
    },
    { status: ready ? 200 : 503, headers: { "cache-control": "no-store" } },
  );
}
