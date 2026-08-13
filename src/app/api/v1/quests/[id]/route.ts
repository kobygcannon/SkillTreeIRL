import { NextResponse } from "next/server";
import { authenticated, failure } from "@/domains/shared/http";

const states = ["planned", "ready", "in_progress", "skipped", "cancelled", "overdue"];
const priorities = ["high", "normal", "low"];

export async function PATCH(request: Request, context: RouteContext<"/api/v1/quests/[id]">) {
  try {
    const auth = await authenticated();
    if ("error" in auth) return auth.error;
    const { id } = await context.params;
    const body = await request.json() as Record<string, unknown>;
    if (body.action === "toggleSubtask" && body.subtaskId) {
      const { data, error } = await auth.supabase.from("quest_subtasks")
        .update({ completed_at: body.completed ? new Date().toISOString() : null })
        .eq("quest_id", id).eq("id", String(body.subtaskId))
        .select("id,title,completed_at,sort_order").single();
      if (error) return failure(error);
      return NextResponse.json({ data });
    }
    const title = String(body.title || "").trim();
    const status = String(body.status || "ready");
    const priority = String(body.priority || "normal");
    const xpReward = Math.round(Number(body.xpReward));
    const estimatedMinutes = body.estimatedMinutes == null || body.estimatedMinutes === "" ? null : Math.round(Number(body.estimatedMinutes));
    if (!title || title.length > 180 || !states.includes(status) || !priorities.includes(priority) || !Number.isFinite(xpReward) || xpReward < 0 || xpReward > 5000 || (estimatedMinutes !== null && (!Number.isFinite(estimatedMinutes) || estimatedMinutes < 1 || estimatedMinutes > 100000))) {
      return NextResponse.json({ error: { code: "VALIDATION_FAILED", message: "Check the quest title, state, priority, XP, and estimate." } }, { status: 422 });
    }
    const recurrence = body.recurrence && typeof body.recurrence === "object" ? body.recurrence : null;
    const { data, error } = await auth.supabase.rpc("update_configured_quest", {
      p_quest_id: id, p_title: title, p_description: String(body.description || ""),
      p_goal_id: body.goalId || null, p_skill_ids: Array.isArray(body.skillIds) ? [...new Set(body.skillIds.map(String).filter(Boolean))] : [], p_status: status, p_xp_reward: xpReward,
      p_due_at: body.dueAt || null, p_priority: priority, p_estimated_minutes: estimatedMinutes,
      p_recurrence: recurrence, p_evidence_required: Boolean(body.evidenceRequired),
    });
    if (error) return failure(error);
    return NextResponse.json({ data });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request, context: RouteContext<"/api/v1/quests/[id]">) {
  try {
    const auth = await authenticated();
    if ("error" in auth) return auth.error;
    const { id } = await context.params;
    const body = await request.json() as { action?: string; title?: string; dependsOnQuestId?: string };
    if (body.action === "pin" || body.action === "unpin") {
      const { error } = await auth.supabase.rpc("set_pinned_quest", { p_quest_id: id, p_pinned: body.action === "pin" });
      if (error) return failure(error);
      return NextResponse.json({ data: { pinned: body.action === "pin" } });
    }
    if (body.action === "addDependency" && body.dependsOnQuestId) {
      const { error } = await auth.supabase.rpc("add_quest_dependency", { p_quest_id: id, p_depends_on_quest_id: body.dependsOnQuestId });
      if (error) return failure(error);
      return NextResponse.json({ data: { saved: true } }, { status: 201 });
    }
    if (body.action === "addSubtask") {
      const title = body.title?.trim();
      if (!title || title.length > 180) return NextResponse.json({ error: { code: "VALIDATION_FAILED", message: "Subtask title must be between 1 and 180 characters." } }, { status: 422 });
      const { data, error } = await auth.supabase.from("quest_subtasks").insert({ quest_id: id, user_id: auth.userId, title }).select("id,title,completed_at,sort_order").single();
      if (error) return failure(error);
      return NextResponse.json({ data }, { status: 201 });
    }
    return NextResponse.json({ error: { code: "VALIDATION_FAILED", message: "Choose a valid quest action." } }, { status: 422 });
  } catch (error) { return failure(error); }
}

export async function DELETE(request: Request, context: RouteContext<"/api/v1/quests/[id]">) {
  try {
    const auth = await authenticated();
    if ("error" in auth) return auth.error;
    const { id } = await context.params;
    const url = new URL(request.url);
    const kind = url.searchParams.get("kind"), targetId = url.searchParams.get("targetId");
    if (!targetId || !["dependency", "subtask"].includes(kind || "")) return NextResponse.json({ error: { code: "VALIDATION_FAILED", message: "Choose an item to remove." } }, { status: 422 });
    const query = kind === "dependency"
      ? auth.supabase.from("quest_dependencies").delete().eq("quest_id", id).eq("depends_on_quest_id", targetId)
      : auth.supabase.from("quest_subtasks").delete().eq("quest_id", id).eq("id", targetId);
    const { error } = await query;
    if (error) return failure(error);
    return new NextResponse(null, { status: 204 });
  } catch (error) { return failure(error); }
}
