import { describe, expect, it } from "vitest";
import { isAuthenticationServiceUnavailable } from "./auth-error";

describe("authentication provider error classification", () => {
  it("recognises retryable provider and network failures", () => {
    expect(
      isAuthenticationServiceUnavailable({
        name: "AuthRetryableFetchError",
        message: "Failed to fetch",
        status: 0,
      }),
    ).toBe(true);
    expect(isAuthenticationServiceUnavailable({ status: 503 })).toBe(true);
    expect(
      isAuthenticationServiceUnavailable({ message: "connect ECONNREFUSED" }),
    ).toBe(true);
  });

  it("keeps missing and invalid sessions as authentication failures", () => {
    expect(
      isAuthenticationServiceUnavailable({
        name: "AuthSessionMissingError",
        status: 400,
      }),
    ).toBe(false);
    expect(
      isAuthenticationServiceUnavailable({ name: "AuthApiError", status: 401 }),
    ).toBe(false);
    expect(isAuthenticationServiceUnavailable(null)).toBe(false);
  });
});
