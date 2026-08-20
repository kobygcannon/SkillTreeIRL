import { describe, expect, it } from "vitest";
import { companyPlanError } from "./http";

describe("company plan errors", () => {
  it("maps the authoritative entitlement error without leaking database details", async () => {
    const response = companyPlanError({
      message: "P0001: COMPANY_PLAN_REQUIRED internal detail",
    });
    expect(response?.status).toBe(402);
    expect(await response?.json()).toEqual({
      error: {
        code: "COMPANY_PLAN_REQUIRED",
        message:
          "Start or renew the Company plan to use team collaboration. Existing workspace data remains available.",
      },
    });
  });
  it("leaves unrelated database errors to the shared handler", () => {
    expect(companyPlanError({ message: "unrelated" })).toBeNull();
  });
});
