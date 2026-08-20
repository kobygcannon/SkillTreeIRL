import { NextResponse } from "next/server";
import { authenticated, failure } from "@/domains/shared/http";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticated();
    if ("error" in auth) return auth.error;
    const { id } = await params;
    const objectiveIds =
      (
        await auth.supabase
          .from("organization_objectives")
          .select("id")
          .eq("organization_id", id)
      ).data?.map((x) => x.id) || [];
    const [organization, members, objectives, assignments, subscription] =
      await Promise.all([
        auth.supabase
          .from("organizations")
          .select(
            "id,name,slug,status,onboarding_completed_at,settings,created_at",
          )
          .eq("id", id)
          .single(),
        auth.supabase
          .from("organization_members")
          .select("user_id,display_name,role,status,job_title,joined_at")
          .eq("organization_id", id)
          .order("joined_at"),
        auth.supabase
          .from("organization_objectives")
          .select("*")
          .eq("organization_id", id)
          .order("updated_at", { ascending: false }),
        objectiveIds.length
          ? auth.supabase
              .from("organization_assignments")
              .select("objective_id,user_id,current_value,status,completed_at")
              .in("objective_id", objectiveIds)
          : Promise.resolve({ data: [], error: null }),
        auth.supabase
          .from("organization_subscriptions")
          .select(
            "plan,status,seat_quantity,current_period_end,cancel_at_period_end",
          )
          .eq("organization_id", id)
          .maybeSingle(),
      ]);
    const error =
      organization.error ||
      members.error ||
      objectives.error ||
      assignments.error ||
      subscription.error;
    if (error) return failure(error);
    return NextResponse.json({
      data: {
        currentUserId: auth.userId,
        organization: organization.data,
        members: members.data || [],
        objectives: objectives.data || [],
        assignments: assignments.data || [],
        subscription: subscription.data,
      },
    });
  } catch (error) {
    return failure(error);
  }
}
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticated();
    if ("error" in auth) return auth.error;
    const { id } = await params,
      body = (await request.json()) as {
        name?: string;
        onboardingCompleted?: boolean;
        settings?: Record<string, unknown>;
      };
    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (body.name !== undefined) update.name = body.name.trim();
    if (body.onboardingCompleted)
      update.onboarding_completed_at = new Date().toISOString();
    if (body.settings !== undefined) update.settings = body.settings;
    const { data, error } = await auth.supabase
      .from("organizations")
      .update(update)
      .eq("id", id)
      .select()
      .single();
    if (error) return failure(error);
    return NextResponse.json({ data });
  } catch (error) {
    return failure(error);
  }
}
