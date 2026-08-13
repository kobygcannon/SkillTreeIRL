import { describe, expect, it } from "vitest";
import { safeReturnPath } from "./redirect";

describe("safe authentication return paths", () => {
  it.each([
    ["/app", "/app"],
    ["/goals/abc?tab=history", "/goals/abc?tab=history"],
    ["/settings/security#sessions", "/settings/security#sessions"],
  ])("accepts internal path %s", (input, expected) =>
    expect(safeReturnPath(input)).toBe(expected),
  );
  it.each([
    "https://evil.example/steal",
    "//evil.example/steal",
    "/\\evil.example/steal",
    "\\evil.example",
    "javascript:alert(1)",
    "\u0000/app",
  ])("rejects hostile path %s", (input) =>
    expect(safeReturnPath(input)).toBe("/app"),
  );
  it("uses a caller-selected fallback", () =>
    expect(safeReturnPath(null, "/sign-in")).toBe("/sign-in"));
});
