import { NextResponse } from "next/server";
import { authenticated, failure } from "@/domains/shared/http";
import { companyPlanError } from "@/domains/organizations/http";
export async function POST(request: Request) {
  try {
    const auth = await authenticated();
    if ("error" in auth) return auth.error;
    const body = (await request.json()) as { token?: string };
    if (!body.token)
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_FAILED",
            message: "Invitation token is required.",
          },
        },
        { status: 422 },
      );
    const { data, error } = await auth.supabase.rpc(
      "accept_organization_invitation",
      { p_token: body.token },
    );
    if (error)
      return (
        companyPlanError(error) ||
        NextResponse.json(
          {
            error: {
              code: "INVITATION_INVALID",
              message:
                "This invitation is invalid, expired, or belongs to another email address.",
            },
          },
          { status: 400 },
        )
      );
    return NextResponse.json({ data: { organizationId: data } });
  } catch (error) {
    return failure(error);
  }
}
