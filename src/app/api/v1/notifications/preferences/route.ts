import { NextResponse } from "next/server";
import { authenticated, failure } from "@/domains/shared/http";
export async function GET() {
  const auth = await authenticated();
  if ("error" in auth) return auth.error;
  const { data, error } = await auth.supabase
    .from("notification_preferences")
    .select("in_app,email,web_push,reminders,achievements,social,quiet_hours")
    .maybeSingle();
  if (error) return failure(error);
  return NextResponse.json({
    data: data || {
      in_app: true,
      email: false,
      web_push: false,
      reminders: true,
      achievements: true,
      social: true,
      quiet_hours: {},
    },
  });
}
export async function PATCH(request: Request) {
  try {
    const auth = await authenticated();
    if ("error" in auth) return auth.error;
    const body = (await request.json()) as Record<string, unknown>,
      booleanKeys = [
        "in_app",
        "email",
        "web_push",
        "reminders",
        "achievements",
        "social",
      ],
      update: Record<string, unknown> = {
        user_id: auth.userId,
        updated_at: new Date().toISOString(),
      };
    for (const key of booleanKeys) {
      if (body[key] === undefined) continue;
      if (typeof body[key] !== "boolean")
        return NextResponse.json(
          {
            error: {
              code: "VALIDATION_FAILED",
              message: `${key} must be true or false`,
            },
          },
          { status: 422 },
        );
      update[key] = body[key];
    }
    if (body.quiet_hours !== undefined) {
      const quiet = body.quiet_hours as { start?: unknown; end?: unknown };
      const validTime = (value: unknown) =>
        typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
      if (
        !quiet ||
        typeof quiet !== "object" ||
        Array.isArray(quiet) ||
        (Object.keys(quiet).length > 0 &&
          (!validTime(quiet.start) || !validTime(quiet.end)))
      )
        return NextResponse.json(
          {
            error: {
              code: "VALIDATION_FAILED",
              message: "Quiet hours require valid start and end times",
            },
          },
          { status: 422 },
        );
      update.quiet_hours = Object.keys(quiet).length
        ? { start: quiet.start, end: quiet.end }
        : {};
    }
    const { data, error } = await auth.supabase
      .from("notification_preferences")
      .upsert(update)
      .select()
      .single();
    if (error) return failure(error);
    return NextResponse.json({ data });
  } catch (error) {
    return failure(error);
  }
}
