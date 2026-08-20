import { NextResponse } from "next/server";
import { authenticated, failure } from "@/domains/shared/http";
import { cancelStripeSubscription, stripeClient } from "@/lib/stripe";
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
            "plan,status,seat_quantity,current_period_end,cancel_at_period_end,provider_customer_id,provider_subscription_id",
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
    const subscriptionData = subscription.data;
    const collaborationEnabled = Boolean(
      subscriptionData?.status === "active" ||
      (subscriptionData?.status === "trialing" &&
        subscriptionData.current_period_end &&
        Date.parse(subscriptionData.current_period_end) > Date.now()),
    );
    return NextResponse.json({
      data: {
        currentUserId: auth.userId,
        organization: organization.data,
        members: members.data || [],
        objectives: objectives.data || [],
        assignments: assignments.data || [],
        collaborationEnabled,
        subscription: subscriptionData
          ? {
              plan: subscriptionData.plan,
              status: subscriptionData.status,
              seat_quantity: subscriptionData.seat_quantity,
              current_period_end: subscriptionData.current_period_end,
              cancel_at_period_end: subscriptionData.cancel_at_period_end,
              billingConnected: Boolean(
                subscriptionData.provider_customer_id &&
                subscriptionData.provider_subscription_id,
              ),
            }
          : null,
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticated();
    if ("error" in auth) return auth.error;
    const { id } = await params;
    const { data: claims } = await auth.supabase.auth.getClaims();
    const issuedAt = Number(claims?.claims?.iat || 0);
    if (Date.now() / 1000 - issuedAt > 600)
      return NextResponse.json(
        {
          error: {
            code: "RECENT_AUTH_REQUIRED",
            message: "Sign in again before closing a workspace.",
          },
        },
        { status: 403 },
      );
    const { data: organization, error: organizationError } = await auth.supabase
      .from("organizations")
      .select(
        "name,owner_id,organization_subscriptions(provider_subscription_id,status)",
      )
      .eq("id", id)
      .single();
    if (organizationError) return failure(organizationError);
    if (organization.owner_id !== auth.userId)
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Only the workspace owner can close it.",
          },
        },
        { status: 403 },
      );
    if (request.headers.get("x-delete-confirmation") !== organization.name)
      return NextResponse.json(
        {
          error: {
            code: "CONFIRMATION_REQUIRED",
            message: `Type ${organization.name} to confirm workspace closure.`,
          },
        },
        { status: 400 },
      );
    const subscription = Array.isArray(organization.organization_subscriptions)
      ? organization.organization_subscriptions[0]
      : organization.organization_subscriptions;
    if (
      subscription?.provider_subscription_id &&
      ["trialing", "active", "past_due"].includes(subscription.status)
    ) {
      const stripe = stripeClient();
      if (!stripe)
        return NextResponse.json(
          {
            error: {
              code: "BILLING_UNAVAILABLE",
              message:
                "Billing is temporarily unavailable, so the workspace was not closed or charged again.",
            },
          },
          { status: 503 },
        );
      await cancelStripeSubscription(
        stripe,
        subscription.provider_subscription_id,
      );
    }
    const { error } = await auth.supabase.rpc("close_organization", {
      p_organization_id: id,
    });
    if (error) return failure(error);
    return NextResponse.json({ data: { closed: true } });
  } catch (error) {
    return failure(error);
  }
}
