import { NextResponse } from "next/server";
import { authenticated, failure } from "@/domains/shared/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { cancelStripeSubscription, stripeClient } from "@/lib/stripe";

export async function DELETE(request: Request) {
  try {
    const auth = await authenticated();
    if ("error" in auth) return auth.error;
    const confirmation = request.headers.get("x-delete-confirmation");
    if (confirmation !== "DELETE MY SKILLTREE")
      return NextResponse.json(
        {
          error: {
            code: "CONFIRMATION_REQUIRED",
            message: "Type DELETE MY SKILLTREE to confirm permanent deletion",
          },
        },
        { status: 400 },
      );
    const { data: claims } = await auth.supabase.auth.getClaims();
    const iat = Number(claims?.claims?.iat || 0);
    if (Date.now() / 1000 - iat > 600)
      return NextResponse.json(
        {
          error: {
            code: "RECENT_AUTH_REQUIRED",
            message: "Sign in again before deleting your account",
          },
        },
        { status: 403 },
      );
    const admin = createAdminClient();
    if (!admin)
      return NextResponse.json(
        {
          error: {
            code: "SERVICE_NOT_CONFIGURED",
            message: "Account deletion is not configured",
          },
        },
        { status: 503 },
      );
    const [{ count: ownedWorkspaces, error: workspaceError }, subscription] =
      await Promise.all([
        admin
          .from("organizations")
          .select("id", { count: "exact", head: true })
          .eq("owner_id", auth.userId),
        admin
          .from("subscriptions")
          .select("provider_subscription_id,status")
          .eq("user_id", auth.userId)
          .maybeSingle(),
      ]);
    if (workspaceError || subscription.error)
      return failure(workspaceError || subscription.error);
    if (ownedWorkspaces)
      return NextResponse.json(
        {
          error: {
            code: "WORKSPACE_OWNERSHIP_REQUIRES_ACTION",
            message:
              "Close each company workspace from its Plan & billing section before deleting your account.",
          },
        },
        { status: 409 },
      );
    if (
      subscription.data?.provider_subscription_id &&
      ["trialing", "active", "past_due"].includes(subscription.data.status)
    ) {
      const stripe = stripeClient();
      if (!stripe)
        return NextResponse.json(
          {
            error: {
              code: "BILLING_UNAVAILABLE",
              message:
                "Billing is temporarily unavailable, so your subscription and account were left unchanged.",
            },
          },
          { status: 503 },
        );
      await cancelStripeSubscription(
        stripe,
        subscription.data.provider_subscription_id,
      );
    }
    const cleanup = await admin.rpc("prepare_user_deletion", {
      p_user_id: auth.userId,
    });
    if (cleanup.error) return failure(cleanup.error);
    await auth.supabase.auth.signOut({ scope: "global" });
    const { error } = await admin.auth.admin.deleteUser(auth.userId);
    if (error) return failure(error);
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    return failure(error);
  }
}
