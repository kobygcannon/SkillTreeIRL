import { NextResponse } from "next/server";
import { authenticated, failure } from "@/domains/shared/http";
import { companyPlanError } from "@/domains/organizations/http";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticated();
    if ("error" in auth) return auth.error;
    const { id } = await params,
      body = (await request.json()) as {
        title?: string;
        description?: string;
        measurement?: string;
        targetValue?: number;
        unit?: string;
        dueAt?: string;
        assignees?: string[];
      };
    if (!body.title?.trim())
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_FAILED",
            message: "Objective title is required.",
          },
        },
        { status: 422 },
      );
    const { data: objectiveId, error } = await auth.supabase.rpc(
      "create_organization_objective",
      {
        p_organization_id: id,
        p_title: body.title.trim(),
        p_description: body.description?.trim() || null,
        p_measurement: body.measurement || "percentage",
        p_target_value: body.targetValue ?? 100,
        p_unit: body.unit?.trim() || "%",
        p_due_at: body.dueAt || null,
        p_assignees: [...new Set(body.assignees || [])],
      },
    );
    if (error) {
      if (error.message.includes("INVALID_ASSIGNEE"))
        return NextResponse.json(
          {
            error: {
              code: "INVALID_ASSIGNEE",
              message:
                "Objectives can only be assigned to active workspace members.",
            },
          },
          { status: 422 },
        );
      return companyPlanError(error) || failure(error);
    }
    const { data, error: readError } = await auth.supabase
      .from("organization_objectives")
      .select()
      .eq("id", objectiveId)
      .single();
    if (readError) return failure(readError);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
