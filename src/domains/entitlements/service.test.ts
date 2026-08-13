import {describe,expect,it} from "vitest";
import {resolveCapabilities} from "./service";
describe("entitlement policy",()=>{
  const now=new Date("2026-08-13T12:00:00Z");
  it("keeps the free experience useful but bounded",()=>{const result=resolveCapabilities([],now);expect(result.plan).toBe("free");expect(result.maxActiveGoals).toBe(10);expect(result.evidenceStorageBytes).toBe(25*1024*1024);expect(result.capabilities.has("imports")).toBe(false)});
  it("unlocks the complete Pro capability set",()=>{const result=resolveCapabilities([{entitlement:"pro",expires_at:"2026-09-01T00:00:00Z"}],now);expect(result.plan).toBe("pro");expect(result.maxActiveGoals).toBe(Number.MAX_SAFE_INTEGER);expect(result.capabilities.has("imports")).toBe(true);expect(result.capabilities.has("yearReviews")).toBe(true)});
  it("does not honor expired grants",()=>expect(resolveCapabilities([{entitlement:"pro",expires_at:"2026-08-12T00:00:00Z"}],now).plan).toBe("free"));
  it("supports narrowly granted capabilities",()=>{const result=resolveCapabilities([{entitlement:"integrations",expires_at:null}],now);expect(result.plan).toBe("free");expect(result.capabilities.has("integrations")).toBe(true);expect(result.capabilities.has("imports")).toBe(false)});
});
