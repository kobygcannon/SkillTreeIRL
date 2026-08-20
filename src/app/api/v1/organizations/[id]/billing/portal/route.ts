import { NextResponse } from "next/server";
import { authenticated, failure } from "@/domains/shared/http";
import { stripeClient } from "@/lib/stripe";
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticated();
    if ("error" in auth) return auth.error;
    const { id } = await params,
      stripe = stripeClient(),
      appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!stripe || !appUrl)
      return NextResponse.json(
        {
          error: {
            code: "BILLING_NOT_CONFIGURED",
            message: "Billing is not configured.",
          },
        },
        { status: 503 },
      );
    const { data: member } = await auth.supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", id)
      .eq("user_id", auth.userId)
      .eq("status", "active")
      .maybeSingle();
    if (!member || !["owner", "admin"].includes(member.role))
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Only a workspace owner or admin can manage billing.",
          },
        },
        { status: 403 },
      );
    const { data } = await auth.supabase
      .from("organization_subscriptions")
      .select("provider_customer_id")
      .eq("organization_id", id)
      .maybeSingle();
    if (!data?.provider_customer_id)
      return NextResponse.json(
        {
          error: {
            code: "NO_BILLING_ACCOUNT",
            message:
              "Start a company subscription before opening billing management.",
          },
        },
        { status: 404 },
      );
    const session = await stripe.billingPortal.sessions.create({
      customer: data.provider_customer_id,
      return_url: `${appUrl}/workspace/${id}`,
    });
    return NextResponse.json({ data: { url: session.url } });
  } catch (error) {
    return failure(error);
  }
}
