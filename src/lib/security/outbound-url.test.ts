import {describe,expect,it} from "vitest";
import {assertPublicHttpsUrl,isPublicAddress} from "./outbound-url";

describe("outbound webhook URL security",()=>{
 it.each(["0.0.0.0","10.0.0.1","100.64.0.1","127.0.0.1","169.254.169.254","172.16.0.1","192.168.1.1","198.18.0.1","224.0.0.1","::","::1","fc00::1","fd00::1","fe80::1","2001:db8::1","::ffff:127.0.0.1"])("blocks non-public address %s",address=>expect(isPublicAddress(address)).toBe(false));
 it.each(["1.1.1.1","8.8.8.8","2001:4860:4860::8888"])("accepts public address %s",address=>expect(isPublicAddress(address)).toBe(true));
 it("requires credential-free HTTPS",async()=>{
  await expect(assertPublicHttpsUrl("http://1.1.1.1/hook")).rejects.toThrow(/public HTTPS/);
  await expect(assertPublicHttpsUrl("https://user:pass@1.1.1.1/hook")).rejects.toThrow(/credentials/);
 });
 it("rejects private literal destinations",async()=>await expect(assertPublicHttpsUrl("https://127.0.0.1/hook")).rejects.toThrow(/non-public/));
});
