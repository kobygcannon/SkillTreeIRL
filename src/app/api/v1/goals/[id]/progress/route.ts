import { NextResponse } from "next/server";
import { authenticated, failure } from "@/domains/shared/http";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticated();
    if ("error" in auth) return auth.error;
    const { id } = await params;
    const body = await request.json() as { value?: number; delta?: number; note?: unknown };
    const key = request.headers.get("idempotency-key");
    if (!key) return NextResponse.json({error:{code:"IDEMPOTENCY_KEY_REQUIRED",message:"A unique progress key is required"}},{status:400});

    const hasDelta = body.delta !== undefined;
    const hasValue = body.value !== undefined;
    if (hasDelta === hasValue) {
      return NextResponse.json({error:{code:"VALIDATION_FAILED",message:"Send either an amount to add or a new total"}},{status:422});
    }
    if (body.note !== undefined && body.note !== null && (typeof body.note !== "string" || body.note.length > 1000)) {
      return NextResponse.json({error:{code:"VALIDATION_FAILED",message:"Progress notes must be 1,000 characters or fewer"}},{status:422});
    }
    const usesDelta = hasDelta;
    const amount = Number(usesDelta ? body.delta : body.value);
    if (!Number.isFinite(amount) || amount < 0 || (usesDelta && amount <= 0)) {
      return NextResponse.json({error:{code:"VALIDATION_FAILED",message:usesDelta ? "Enter an amount greater than zero" : "Enter a valid progress total"}},{status:422});
    }

    const call = usesDelta
      ? await auth.supabase.rpc("add_goal_progress",{p_goal_id:id,p_delta:amount,p_note:typeof body.note === "string" ? body.note : null,p_idempotency_key:key})
      : await auth.supabase.rpc("record_goal_progress",{p_goal_id:id,p_value:amount,p_note:typeof body.note === "string" ? body.note : null,p_idempotency_key:key});
    if (call.error) return failure(call.error);

    const { data: goal, error: readError } = await auth.supabase.from("goals").select("current_value").eq("id",id).single();
    if (readError) return failure(readError);
    return NextResponse.json({data:{eventId:call.data,value:Number(goal.current_value)}},{status:201});
  } catch (error) {
    return failure(error);
  }
}
