import { NextResponse } from "next/server";
import { authenticated, failure } from "@/domains/shared/http";
import { isValidTimeZone } from "@/lib/i18n";

type HabitBody = { name?: string; frequency?: { days?: number[] }; timezone?: string; goalId?: string | null; skillIds?: string[]; xpReward?: number; minimumTarget?: number | null; minimumUnit?: string | null; startDate?: string; endDate?: string | null; reminderNextRun?: string | null };

export async function PATCH(request: Request, context: RouteContext<"/api/v1/habits/[id]">) {
  try {
    const auth = await authenticated();
    if ("error" in auth) return auth.error;
    const { id } = await context.params;
    const body = await request.json() as HabitBody;
    const name = body.name?.trim(), days = [...new Set(body.frequency?.days || [])].sort();
    const xp = Math.round(Number(body.xpReward)), minimum = body.minimumTarget == null ? null : Number(body.minimumTarget);
    if (!name || name.length > 180 || !days.length || days.some(day => !Number.isInteger(day) || day < 1 || day > 7) || !isValidTimeZone(body.timezone || "UTC") || !Number.isFinite(xp) || xp < 0 || xp > 500 || (minimum !== null && (!Number.isFinite(minimum) || minimum <= 0)) || (minimum !== null && !body.minimumUnit?.trim())) {
      return NextResponse.json({ error: { code: "VALIDATION_FAILED", message: "Check the habit name, preferred days, minimum target, and XP." } }, { status: 422 });
    }
    const { data, error } = await auth.supabase.rpc("configure_habit", {
      p_habit_id: id, p_name: name, p_frequency: { kind: "weekly", days }, p_timezone: body.timezone || "UTC",
      p_goal_id: body.goalId || null, p_skill_ids: [...new Set(body.skillIds || [])], p_xp_reward: xp,
      p_minimum_target: minimum, p_minimum_unit: body.minimumUnit || null, p_start_date: body.startDate,
      p_end_date: body.endDate || null, p_reminder_next_run: body.reminderNextRun || null,
      p_reminder_schedule: body.reminderNextRun ? { kind: "recurring", intervalDays: 1, days } : null,
    });
    if (error) return failure(error);
    return NextResponse.json({ data });
  } catch (error) { return failure(error); }
}
