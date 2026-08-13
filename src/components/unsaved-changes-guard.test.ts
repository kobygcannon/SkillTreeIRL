import {describe,expect,it} from "vitest";
import {readFileSync} from "node:fs";
import {join} from "node:path";
describe("unsaved changes guard",()=>{const source=readFileSync(join(process.cwd(),"src","components","unsaved-changes-guard.tsx"),"utf8");it("protects reloads and in-app navigation",()=>{expect(source).toContain("beforeunload");expect(source).toContain("Leave this screen?");expect(source).toContain("document.addEventListener(\"submit\"")})});
