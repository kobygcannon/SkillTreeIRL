import { NextResponse } from "next/server";
import { authenticated, failure } from "@/domains/shared/http";
import { companyPlanError } from "@/domains/organizations/http";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; objectiveId: string }> },
) {
  try {
    const auth = await authenticated();
    if ("error" in auth) return auth.error;
    const { id, objectiveId } = await params,
      body = (await request.json()) as {
        progressValue?: number;
        summary?: string;
        visibility?: string;
      };
    const progress = Number(body.progressValue);
    if (
      !Number.isFinite(progress) ||
      progress < 0 ||
      !body.summary?.trim() ||
      body.summary.trim().length > 2000 ||
      !["managers", "workspace"].includes(body.visibility || "managers")
    )
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_FAILED",
            message: "Add a valid progress value, update and visibility.",
          },
        },
        { status: 422 },
      );
    const belongs = await auth.supabase
      .from("organization_objectives")
      .select("id")
      .eq("id", objectiveId)
      .eq("organization_id", id)
      .maybeSingle();
    if (belongs.error || !belongs.data)
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Objective not found." } },
        { status: 404 },
      );
    const { data, error } = await auth.supabase.rpc(
      "submit_organization_checkin",
      {
        p_objective_id: objectiveId,
        p_progress_value: progress,
        p_summary: body.summary.trim(),
        p_visibility: body.visibility || "managers",
      },
    );
    if (error) return companyPlanError(error) || failure(error);
    return NextResponse.json({ data: { id: data } }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
