import { NextResponse } from "next/server";

export function companyPlanError(error: { message?: string } | null) {
  if (!error?.message?.includes("COMPANY_PLAN_REQUIRED")) return null;
  return NextResponse.json(
    {
      error: {
        code: "COMPANY_PLAN_REQUIRED",
        message:
          "Start or renew the Company plan to use team collaboration. Existing workspace data remains available.",
      },
    },
    { status: 402 },
  );
}
