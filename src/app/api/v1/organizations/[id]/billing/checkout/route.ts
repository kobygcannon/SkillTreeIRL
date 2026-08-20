import { NextResponse } from "next/server";
import { authenticated, failure } from "@/domains/shared/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { companyBillingConfigurationReady, stripeClient } from "@/lib/stripe";
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticated();
    if ("error" in auth) return auth.error;
    const { id } = await params,
      stripe = stripeClient(),
      admin = createAdminClient(),
      price = process.env.STRIPE_TEAM_PRICE_ID,
      appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (
      !companyBillingConfigurationReady() ||
      !stripe ||
      !admin ||
      !price ||
      !appUrl
    )
      return NextResponse.json(
        {
          error: {
            code: "BILLING_NOT_CONFIGURED",
            message:
              "Company checkout is being activated and is not available in this environment yet.",
          },
        },
        { status: 503 },
      );
    const { data: member, error: memberError } = await auth.supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", id)
      .eq("user_id", auth.userId)
      .eq("status", "active")
      .single();
    if (memberError || !["owner", "admin"].includes(member?.role))
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Only a workspace owner or admin can manage billing.",
          },
        },
        { status: 403 },
      );
    const [
      { count, error: countError },
      { data: subscription, error: subscriptionError },
      { data: user, error: userError },
    ] = await Promise.all([
      admin
        .from("organization_members")
        .select("user_id", { count: "exact", head: true })
        .eq("organization_id", id)
        .eq("status", "active"),
      admin
        .from("organization_subscriptions")
        .select(
          "provider_customer_id,provider_subscription_id,status,current_period_end",
        )
        .eq("organization_id", id)
        .single(),
      auth.supabase.auth.getUser(),
    ]);
    if (countError || subscriptionError || userError)
      throw countError || subscriptionError || userError;
    if (subscription?.provider_subscription_id)
      return NextResponse.json(
        {
          error: {
            code: "SUBSCRIPTION_EXISTS",
            message:
              "This workspace already has Stripe billing. Use Manage billing instead.",
          },
        },
        { status: 409 },
      );
    let customer = subscription?.provider_customer_id || undefined;
    if (!customer) {
      const created = await stripe.customers.create(
        {
          email: user.user?.email,
          metadata: { skilltree_organization_id: id },
        },
        { idempotencyKey: `organization-customer:${id}` },
      );
      customer = created.id;
      const saved = await admin
        .from("organization_subscriptions")
        .update({
          provider_customer_id: customer,
          updated_at: new Date().toISOString(),
        })
        .eq("organization_id", id);
      if (saved.error) throw saved.error;
    }
    const remainingTrialDays = subscription?.current_period_end
        ? Math.ceil(
            (Date.parse(subscription.current_period_end) - Date.now()) /
              86_400_000,
          )
        : 0,
      quantity = Math.max(3, count || 1),
      session = await stripe.checkout.sessions.create(
        {
          mode: "subscription",
          customer,
          line_items: [{ price, quantity }],
          success_url: `${appUrl}/workspace/${id}?billing=success`,
          cancel_url: `${appUrl}/workspace/${id}?billing=cancelled`,
          allow_promotion_codes: true,
          subscription_data: {
            ...(remainingTrialDays >= 2
              ? { trial_period_days: Math.min(14, remainingTrialDays) }
              : {}),
            metadata: { skilltree_organization_id: id },
          },
          metadata: { skilltree_organization_id: id },
        },
        {
          idempotencyKey: `organization-checkout:${id}:${quantity}:${Math.floor(Date.now() / 300000)}`,
        },
      );
    return NextResponse.json({ data: { url: session.url, seats: quantity } });
  } catch (error) {
    return failure(error);
  }
}
