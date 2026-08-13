import { NextResponse } from "next/server";
import { authenticated, failure } from "@/domains/shared/http";
export async function GET(request: Request) {
  const auth = await authenticated();
  if ("error" in auth) return auth.error;
  const cursor = new URL(request.url).searchParams.get("cursor");
  let query = auth.supabase
    .from("activities")
    .select(
      "id,description,duration_minutes,quantity,unit,effort,confidence,occurred_at,created_at",
    )
    .is("reversed_at", null)
    .order("occurred_at", { ascending: false })
    .limit(50);
  if (cursor) query = query.lt("occurred_at", cursor);
  const { data, error } = await query;
  if (error) return failure(error);
  return NextResponse.json({
    data,
    nextCursor: data?.length === 50 ? data[49].occurred_at : null,
  });
}
export async function POST(request: Request) {
  try {
    const auth = await authenticated();
    if ("error" in auth) return auth.error;
    const body = (await request.json()) as Record<string, unknown>,
      description = String(body.description || "").trim(),
      duration =
        body.durationMinutes == null ? null : Number(body.durationMinutes),
      quantity = body.quantity == null ? null : Number(body.quantity),
      unit = body.unit == null ? null : String(body.unit).trim(),
      note = body.privateNote == null ? null : String(body.privateNote),
      goals = Array.isArray(body.goalIds) ? body.goalIds : [],
      allocations = Array.isArray(body.skillAllocations)
        ? body.skillAllocations
        : [];
    const key = request.headers.get("idempotency-key");
    if (!key || key.length < 8)
      return NextResponse.json(
        {
          error: {
            code: "IDEMPOTENCY_KEY_REQUIRED",
            message: "A unique activity key is required",
          },
        },
        { status: 400 },
      );
    if (!description || description.length > 500)
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_FAILED",
            message:
              "Activity description must be between 1 and 500 characters",
          },
        },
        { status: 422 },
      );
    if (
      duration !== null &&
      (!Number.isInteger(duration) || duration < 0 || duration > 100000)
    )
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_FAILED",
            message:
              "Duration must be a whole number between 0 and 100,000 minutes",
          },
        },
        { status: 422 },
      );
    if (
      quantity !== null &&
      (!Number.isFinite(quantity) || quantity < 0 || quantity > 1e15)
    )
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_FAILED",
            message: "Quantity must be a positive finite number",
          },
        },
        { status: 422 },
      );
    if (unit && unit.length > 40)
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_FAILED",
            message: "Unit must be 40 characters or fewer",
          },
        },
        { status: 422 },
      );
    if (note && note.length > 2000)
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_FAILED",
            message: "Private note must be 2,000 characters or fewer",
          },
        },
        { status: 422 },
      );
    if (goals.length > 25 || allocations.length > 25)
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_FAILED",
            message: "Link no more than 25 goals or skills to one activity",
          },
        },
        { status: 422 },
      );
    const occurredAt = body.occurredAt
      ? new Date(String(body.occurredAt))
      : new Date();
    if (Number.isNaN(occurredAt.getTime()))
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_FAILED",
            message: "Choose a valid activity date and time",
          },
        },
        { status: 422 },
      );
    const { data, error } = await auth.supabase.rpc("log_activity", {
      p_description: description,
      p_occurred_at: occurredAt.toISOString(),
      p_duration_minutes: duration,
      p_quantity: quantity,
      p_unit: unit,
      p_effort: body.effort || "moderate",
      p_goal_ids: goals,
      p_skill_allocations: allocations,
      p_private_note: note,
      p_idempotency_key: key,
    });
    if (error) return failure(error);
    return NextResponse.json({ data: { activityId: data } }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
