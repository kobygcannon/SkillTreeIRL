import { NextResponse } from "next/server";
import { authenticated, failure } from "@/domains/shared/http";

export async function GET() {
  try {
    const auth = await authenticated();
    if ("error" in auth) return auth.error;
    const { data, error } = await auth.supabase
      .from("organization_members")
      .select(
        "role,status,job_title,organizations(id,name,slug,status,onboarding_completed_at,settings,created_at,organization_subscriptions(plan,status,seat_quantity,current_period_end,cancel_at_period_end))",
      )
      .eq("user_id", auth.userId)
      .eq("status", "active");
    if (error) return failure(error);
    return NextResponse.json({ data: data || [] });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await authenticated();
    if ("error" in auth) return auth.error;
    const body = (await request.json()) as {
      name?: string;
      slug?: string;
      jobTitle?: string;
    };
    const name = body.name?.trim(),
      slug = (body.slug || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    if (!name || name.length < 2 || name.length > 120 || !slug)
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_FAILED",
            message: "Enter a company name and a valid workspace address.",
          },
        },
        { status: 422 },
      );
    const { data, error } = await auth.supabase.rpc("create_organization", {
      p_name: name,
      p_slug: slug,
      p_job_title: body.jobTitle?.trim() || null,
    });
    if (error) {
      if (error.code === "23505")
        return NextResponse.json(
          {
            error: {
              code: "SLUG_TAKEN",
              message: "That workspace address is already in use.",
            },
          },
          { status: 409 },
        );
      return failure(error);
    }
    return NextResponse.json({ data: { id: data } }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
