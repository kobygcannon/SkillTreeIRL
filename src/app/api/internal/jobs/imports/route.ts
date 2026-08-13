import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { reportProductionError } from "@/lib/monitoring";
import { monitorScheduledJob } from "@/lib/monitoring/scheduled-job";
async function run(request: Request) {
  if (
    !process.env.CRON_SECRET ||
    request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  )
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED" } },
      { status: 401 },
    );
  const admin = createAdminClient();
  if (!admin)
    return NextResponse.json(
      { error: { code: "NOT_CONFIGURED" } },
      { status: 503 },
    );
  const worker = `import-${crypto.randomUUID()}`;
  const staleBefore = new Date(Date.now() - 15 * 60_000).toISOString();
  const { error: recoveryError } = await admin
    .from("background_jobs")
    .update({
      status: "failed",
      locked_at: null,
      locked_by: null,
      last_error: "Worker lease expired; retrying safely",
      run_after: new Date().toISOString(),
    })
    .eq("job_type", "process_import")
    .eq("status", "running")
    .lt("locked_at", staleBefore);
  if (recoveryError)
    return NextResponse.json(
      { error: { code: "JOB_RECOVERY_FAILED" } },
      { status: 500 },
    );
  const { data: jobs, error } = await admin
    .from("background_jobs")
    .select("id,payload,attempts,max_attempts")
    .eq("job_type", "process_import")
    .in("status", ["pending", "failed"])
    .lte("run_after", new Date().toISOString())
    .order("run_after")
    .limit(10);
  if (error)
    return NextResponse.json(
      { error: { code: "DATABASE_ERROR" } },
      { status: 500 },
    );
  let processed = 0;
  for (const job of jobs || []) {
    if (job.attempts >= job.max_attempts) {
      const { error: deadError } = await admin
        .from("background_jobs")
        .update({ status: "dead" })
        .eq("id", job.id);
      await reportProductionError({
        message: "Import job exhausted all retry attempts",
        source: "job",
        route: "import-worker",
        severity: "fatal",
        fingerprint: "dead-letter-import",
        context: {
          jobId: job.id,
          attempts: job.attempts,
          stateUpdateFailed: deadError?.message || null,
        },
      });
      continue;
    }
    const attempt = job.attempts + 1;
    const { data: claimed, error: claimError } = await admin
      .from("background_jobs")
      .update({
        status: "running",
        locked_at: new Date().toISOString(),
        locked_by: worker,
        attempts: attempt,
      })
      .eq("id", job.id)
      .in("status", ["pending", "failed"])
      .select("id")
      .maybeSingle();
    if (claimError) {
      await reportProductionError({
        message: claimError.message,
        source: "job",
        route: "import-worker",
        severity: attempt >= job.max_attempts ? "fatal" : "error",
        fingerprint:
          attempt >= job.max_attempts
            ? "dead-letter-import"
            : "import-worker-retry",
        context: { jobId: job.id, stage: "claim" },
      });
      continue;
    }
    if (!claimed) continue;
    try {
      let count = 0;
      do {
        const result = await admin.rpc("run_import_batch", {
          p_import_id: (job.payload as { importId: string }).importId,
          p_batch_size: 250,
        });
        if (result.error) throw result.error;
        count = Number(result.data || 0);
        processed += count;
      } while (count > 0);
      const { error: completeError } = await admin
        .from("background_jobs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          locked_at: null,
          locked_by: null,
        })
        .eq("id", job.id);
      if (completeError) throw completeError;
    } catch (error) {
      await admin
        .from("background_jobs")
        .update({
          status: attempt >= job.max_attempts ? "dead" : "failed",
          last_error:
            error instanceof Error
              ? error.message.slice(0, 500)
              : "Import failed",
          run_after: new Date(
            Date.now() + Math.min(3600000, 30000 * 2 ** attempt),
          ).toISOString(),
          locked_at: null,
          locked_by: null,
        })
        .eq("id", job.id);
      await reportProductionError({
        message:
          error instanceof Error ? error.message : "Import worker failed",
        stack: error instanceof Error ? error.stack : undefined,
        source: "job",
        route: "import-worker",
        context: {
          jobId: job.id,
          attempts: attempt,
          dead: attempt >= job.max_attempts,
        },
      });
    }
  }
  return NextResponse.json({
    data: { jobs: (jobs || []).length, rowsProcessed: processed },
  });
}
export function POST(request: Request) {
  return monitorScheduledJob("skilltree-imports", "10 6 * * *", () =>
    run(request),
  );
}
export const GET = POST;
