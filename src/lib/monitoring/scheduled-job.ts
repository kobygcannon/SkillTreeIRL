import * as Sentry from "@sentry/nextjs";

type JobResponse = Response | Promise<Response>;
export async function monitorScheduledJob(
  slug: string,
  schedule: string,
  run: () => JobResponse,
) {
  const config = {
    schedule: { type: "crontab" as const, value: schedule },
    checkinMargin: 10,
    maxRuntime: 10,
    timezone: "UTC",
    failureIssueThreshold: 1,
    recoveryThreshold: 1,
    isolateTrace: true,
  };
  try {
    const response = await run();
    if (response.status !== 401 && response.status !== 403)
      Sentry.captureCheckIn(
        { monitorSlug: slug, status: response.status >= 500 ? "error" : "ok" },
        config,
      );
    return response;
  } catch (error) {
    Sentry.captureCheckIn({ monitorSlug: slug, status: "error" }, config);
    Sentry.captureException(error, {
      tags: { source: "scheduled-job", job: slug },
    });
    throw error;
  }
}
