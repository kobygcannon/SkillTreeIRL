import * as Sentry from "@sentry/nextjs";
import {deploymentEnvironment,deploymentRelease} from "@/lib/deployment-metadata";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs")
    await import("../sentry.server.config");
  if (process.env.NEXT_RUNTIME === "edge")
    await import("../sentry.edge.config");
  console.info(
    JSON.stringify({
      level: "info",
      event: "application_started",
      environment: deploymentEnvironment(),
      release: deploymentRelease(),
    }),
  );
}

export const onRequestError = Sentry.captureRequestError;
