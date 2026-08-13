export function deploymentEnvironment() {
  return (
    process.env.APP_ENV ||
    process.env.NEXT_PUBLIC_APP_ENV ||
    process.env.VERCEL_ENV ||
    process.env.NODE_ENV ||
    "unknown"
  );
}

export function deploymentRelease() {
  return (
    process.env.APP_RELEASE ||
    process.env.SENTRY_RELEASE ||
    process.env.NEXT_PUBLIC_APP_RELEASE ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    "unknown"
  );
}
