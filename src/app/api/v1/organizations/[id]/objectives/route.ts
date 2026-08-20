import { NextResponse } from "next/server";
import { authenticated, failure } from "@/domains/shared/http";
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
    const { data, error } = await auth.supabase
      .from("organization_objectives")
      .insert({
        organization_id: id,
        title: body.title.trim(),
        description: body.description?.trim() || null,
        measurement: body.measurement || "percentage",
        target_value: body.targetValue ?? 100,
        unit: body.unit?.trim() || "%",
        due_at: body.dueAt || null,
        created_by: auth.userId,
      })
      .select()
      .single();
    if (error) return failure(error);
    const assignees = [...new Set(body.assignees || [])];
    if (assignees.length) {
      const assigned = await auth.supabase
        .from("organization_assignments")
        .insert(
          assignees.map((user_id) => ({
            objective_id: data.id,
            user_id,
            assigned_by: auth.userId,
          })),
        );
      if (assigned.error) return failure(assigned.error);
    }
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
