import { NextResponse } from "next/server";
import { authenticated, failure } from "@/domains/shared/http";
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
    if (error) return failure(error);
    const origin =
      process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    return NextResponse.json(
      {
        data: {
          inviteUrl: `${origin}/workspace/join?token=${data}`,
          expiresInDays: 7,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return failure(error);
  }
}
