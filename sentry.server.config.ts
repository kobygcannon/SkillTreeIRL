import * as Sentry from "@sentry/nextjs";
import {
  scrubSentryEvent,
  sentryEnvironment,
  sentryRelease,
  sentryTraceSampleRate,
} from "./src/lib/sentry-config";

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.APP_ENV === "staging" || process.env.APP_ENV === "production",
  environment: sentryEnvironment(),
  release: sentryRelease(),
  tracesSampleRate: sentryTraceSampleRate(),
  sendDefaultPii: false,
  beforeSend: scrubSentryEvent,
});
