import { NextResponse } from "next/server";
import { authenticated, failure } from "@/domains/shared/http";
import { userCan } from "@/domains/entitlements/service";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret } from "@/lib/security/tokens";
import { reportProductionError } from "@/lib/monitoring";
type GitHubEvent = {
  id: string;
  type: string;
  created_at: string;
  repo?: { name?: string };
  payload?: { commits?: unknown[] };
};

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticated();
    if ("error" in auth) return auth.error;
    if (!(await userCan(auth.userId, "integrations")))
      return NextResponse.json(
        {
          error: {
            code: "PRO_REQUIRED",
            message: "Connected integrations are available with SkillTree Pro.",
          },
        },
        { status: 403 },
      );
    const { id } = await params,
      { data: integration } = await auth.supabase
        .from("integrations")
        .select("id,provider,status,metadata")
        .eq("id", id)
        .single();
    if (
      !integration ||
      integration.provider !== "github" ||
      integration.status !== "connected"
    )
      return NextResponse.json(
        {
          error: {
            code: "NOT_CONNECTED",
            message: "Connect GitHub before syncing",
          },
        },
        { status: 409 },
      );
    const login = String(
      (integration.metadata as { login?: string })?.login || "",
    );
    if (!login)
      return NextResponse.json(
        { error: { code: "PROFILE_MISSING", message: "Reconnect GitHub" } },
        { status: 409 },
      );
    const admin = createAdminClient();
    if (!admin)
      return NextResponse.json(
        {
          error: {
            code: "NOT_CONFIGURED",
            message: "Integration service is unavailable",
          },
        },
        { status: 503 },
      );
    const tokenResult = await admin.rpc("get_integration_access_token", {
      p_integration_id: id,
    });
    if (tokenResult.error || !tokenResult.data)
      return NextResponse.json(
        { error: { code: "CREDENTIALS_MISSING", message: "Reconnect GitHub" } },
        { status: 409 },
      );
    const response = await fetch(
      `https://api.github.com/users/${encodeURIComponent(login)}/events?per_page=100`,
      {
        headers: {
          accept: "application/vnd.github+json",
          authorization: `Bearer ${decryptSecret(String(tokenResult.data))}`,
          "x-github-api-version": "2022-11-28",
          "user-agent": "SkillTree-IRL",
        },
        cache: "no-store",
      },
    );
    if (!response.ok) {
      await auth.supabase
        .from("integrations")
        .update({ status: "degraded", error_code: `GITHUB_HTTP_${response.status}` })
        .eq("id", id);
      await reportProductionError({
        message: "GitHub integration provider is degraded",
        source: "provider",
        route: "integration-sync",
        severity: "error",
        fingerprint: "provider-degradation-github",
        context: { provider: "github", status: response.status, integrationId: id },
      });
      return NextResponse.json(
        {
          error: {
            code: "PROVIDER_ERROR",
            message: "GitHub sync is temporarily unavailable",
          },
        },
        { status: 502 },
      );
    }
    const events = (await response.json()) as GitHubEvent[];
    let processed = 0,
      failed = 0;
    for (const event of events) {
      if (!event.id || !event.type) continue;
      const commits = Array.isArray(event.payload?.commits)
          ? event.payload.commits.length
          : 0,
        description =
          event.type === "PushEvent"
            ? `GitHub: pushed ${commits || "new"} commit${commits === 1 ? "" : "s"} to ${event.repo?.name || "a repository"}`
            : `GitHub: ${event.type.replace(/Event$/, "")} in ${event.repo?.name || "a repository"}`;
      const result = await admin.rpc("record_integration_activity", {
        p_integration_id: id,
        p_external_id: event.id,
        p_event_type: event.type,
        p_payload: event,
        p_description: description,
        p_occurred_at: event.created_at,
      });
      if (result.error) failed++;
      else processed++;
    }
    const { error: updateError } = await admin
      .from("integrations")
      .update({
        last_synced_at: new Date().toISOString(),
        error_code: failed ? "PARTIAL_IMPORT" : null,
        status: failed ? "degraded" : "connected",
      })
      .eq("id", id);
    if (updateError) throw updateError;
    if (failed) {
      await reportProductionError({
        message: "GitHub integration imported only part of the provider response",
        source: "provider",
        route: "integration-sync",
        severity: "error",
        fingerprint: "provider-degradation-github",
        context: { provider: "github", processed, failed, integrationId: id },
      });
      return NextResponse.json(
        {
          error: {
            code: "PARTIAL_IMPORT",
            message: "Some GitHub events could not be imported safely",
            details: { processed, failed, total: events.length },
          },
        },
        { status: 502 },
      );
    }
    return NextResponse.json({
      data: { processed, failed, total: events.length },
    });
  } catch (error) {
    return failure(error);
  }
}
