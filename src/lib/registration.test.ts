import { afterEach, describe, expect, it, vi } from "vitest";
import { publicRegistrationReady } from "./registration";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("public registration readiness", () => {
  it("stays available in non-production environments", () => {
    vi.stubEnv("APP_ENV", "staging");
    expect(publicRegistrationReady()).toBe(true);
  });
  it("fails closed when production legal or billing configuration is incomplete", () => {
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("LEGAL_ENTITY_ADDRESS", "");
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    expect(publicRegistrationReady()).toBe(false);
  });
});
