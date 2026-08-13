import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const expected = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization");

  if (!expected || provided !== `Bearer ${expected}`) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }

  if (process.env.NEXT_PUBLIC_APP_ENV === "production") {
    return NextResponse.json(
      { error: { code: "DISABLED_IN_PRODUCTION" } },
      { status: 403 },
    );
  }

  const eventId = Sentry.captureException(
    new Error("SkillTree IRL staging monitoring verification"),
    { tags: { verification: "staging", component: "monitoring" } },
  );
  await Sentry.flush(2_000);

  return NextResponse.json({ data: { eventId, queued: true } });
}
