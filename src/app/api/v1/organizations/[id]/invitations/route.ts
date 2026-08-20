import { NextResponse } from "next/server";
import { authenticated, failure } from "@/domains/shared/http";
import { sendTransactionalEmails } from "@/lib/notifications/email";
import { reportProductionError } from "@/lib/monitoring";
import { companyPlanError } from "@/domains/organizations/http";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticated();
    if ("error" in auth) return auth.error;
    const { id } = await params,
      body = (await request.json()) as { email?: string; role?: string };
    if (
      !body.email?.includes("@") ||
      !["admin", "manager", "member"].includes(body.role || "member")
    )
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_FAILED",
            message: "Enter a valid email address and role.",
          },
        },
        { status: 422 },
      );
    const { data, error } = await auth.supabase.rpc(
      "create_organization_invitation",
      {
        p_organization_id: id,
        p_email: body.email,
        p_role: body.role || "member",
      },
    );
    if (error) return companyPlanError(error) || failure(error);
    const origin =
      process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const inviteUrl = `${origin}/workspace/join?token=${data}`;
    const organization = await auth.supabase
      .from("organizations")
      .select("name")
      .eq("id", id)
      .single();
    if (organization.error) return failure(organization.error);
    let emailDelivered = true;
    try {
      await sendTransactionalEmails(
        [
          {
            to: body.email.trim().toLowerCase(),
            title: `Join ${organization.data.name} on SkillTree IRL`,
            body: `You have been invited as a ${body.role || "member"}. This private invitation expires in 7 days and only works with the invited email address.`,
            actionLabel: "Accept invitation",
            actionUrl: inviteUrl,
          },
        ],
        `organization-invite/${id}/${Date.now()}`,
      );
    } catch (error) {
      emailDelivered = false;
      await reportProductionError({
        message: "Organization invitation email failed",
        source: "provider",
        severity: "warning",
        fingerprint: "organization-invitation-email-failed",
        route: "/api/v1/organizations/[id]/invitations",
        method: "POST",
        context: {
          organizationId: id,
          providerError: error instanceof Error ? error.name : "unknown",
        },
      });
    }
    return NextResponse.json(
      {
        data: {
          inviteUrl,
          expiresInDays: 7,
          emailDelivered,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return failure(error);
  }
}
