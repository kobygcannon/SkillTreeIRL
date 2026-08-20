import { NextResponse } from "next/server";
import { authenticated, failure } from "@/domains/shared/http";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  try {
    const auth = await authenticated();
    if ("error" in auth) return auth.error;
    const { id, userId } = await params;
    const body = (await request.json()) as { action?: string; role?: string };
    if (
      !["change_role", "suspend", "reactivate"].includes(body.action || "") ||
      (body.action === "change_role" &&
        !["admin", "manager", "member"].includes(body.role || ""))
    )
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_FAILED",
            message: "Choose a supported member action and role.",
          },
        },
        { status: 422 },
      );
    const { error } = await auth.supabase.rpc("manage_organization_member", {
      p_organization_id: id,
      p_user_id: userId,
      p_action: body.action,
      p_role: body.role || null,
    });
    if (error) {
      if (
        ["OWNER_IMMUTABLE", "OWNER_REQUIRED", "FORBIDDEN"].some((code) =>
          error.message.includes(code),
        )
      )
        return NextResponse.json(
          {
            error: {
              code: "FORBIDDEN",
              message:
                "Only an authorised owner can make that membership change.",
            },
          },
          { status: 403 },
        );
      return failure(error);
    }
    return NextResponse.json({ data: { updated: true } });
  } catch (error) {
    return failure(error);
  }
}
