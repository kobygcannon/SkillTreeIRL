import * as Sentry from "@sentry/nextjs";
import {
  scrubSentryEvent,
  sentryEnvironment,
  sentryRelease,
  sentryTraceSampleRate,
} from "@/lib/sentry-config";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled:
    process.env.NEXT_PUBLIC_APP_ENV === "staging" ||
    process.env.NEXT_PUBLIC_APP_ENV === "production",
  environment: process.env.NEXT_PUBLIC_APP_ENV || sentryEnvironment(),
  release: process.env.NEXT_PUBLIC_APP_RELEASE || sentryRelease(),
  tracesSampleRate: sentryTraceSampleRate(),
  sendDefaultPii: false,
  beforeSend: scrubSentryEvent,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
