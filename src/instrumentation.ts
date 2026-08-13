import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs")
    await import("../sentry.server.config");
  if (process.env.NEXT_RUNTIME === "edge")
    await import("../sentry.edge.config");
  console.info(
    JSON.stringify({
      level: "info",
      event: "application_started",
      environment: process.env.APP_ENV || process.env.NODE_ENV,
      release: process.env.APP_RELEASE || "unknown",
    }),
  );
}

export const onRequestError = Sentry.captureRequestError;
