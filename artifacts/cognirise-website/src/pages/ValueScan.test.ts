import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./ValueScan.tsx", import.meta.url), "utf8");

test("uses approved BrandButton variants without losing Value Scan CTA behavior", () => {
  assert.match(source, /import \{ BrandButton \} from "@\/components\/ui\/brand-button"/);
  assert.match(source, /<BrandButton variant="primary" onClick=\{\(\) => goTo\("start"\)\} icon=\{<ArrowDown size=\{15\} \/>\}>Explore the session<\/BrandButton>/);
  assert.match(source, /<BrandButton type="submit" variant="submit" disabled=\{submitEnquiry\.isPending\} isLoading=\{submitEnquiry\.isPending\}/);
  assert.match(source, /<BrandButton variant="inverse" className="mt-5" onClick=\{\(\) => goTo\("start"\)\} icon=\{<ArrowRight size=\{16\} \/>\}>Return to intake form<\/BrandButton>/);
  assert.doesNotMatch(source, /vs-primary/);
});