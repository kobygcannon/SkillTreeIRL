import type * as Sentry from "@sentry/nextjs";
import {deploymentEnvironment,deploymentRelease} from "@/lib/deployment-metadata";

type SentryEvent = Parameters<NonNullable<NonNullable<Parameters<typeof Sentry.init>[0]>["beforeSend"]>>[0];

const sensitiveHeader = /authorization|cookie|token|secret|api[-_]?key/i;

export function scrubSentryEvent(event: SentryEvent) {
  if (event.request) {
    delete event.request.cookies;
    delete event.request.data;
    delete event.request.query_string;
    if (event.request.headers) {
      event.request.headers = Object.fromEntries(
        Object.entries(event.request.headers).filter(
          ([key]) => !sensitiveHeader.test(key),
        ),
      );
    }
  }
  if (event.user) {
    event.user = event.user.id ? { id: event.user.id } : undefined;
  }
  delete event.contexts?.response;
  return event;
}

export function sentryEnvironment() {
  return process.env.SENTRY_ENVIRONMENT || deploymentEnvironment();
}

export function sentryRelease() {
  return process.env.SENTRY_RELEASE || deploymentRelease();
}

export function sentryTraceSampleRate() {
  const configured = Number(process.env.SENTRY_TRACES_SAMPLE_RATE);
  if (Number.isFinite(configured) && configured >= 0 && configured <= 1)
    return configured;
  return sentryEnvironment() === "production" ? 0.1 : 1;
}
