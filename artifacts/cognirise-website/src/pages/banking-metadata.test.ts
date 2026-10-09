import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";


test("shared methodology SEO restores Shell's exact original baselines", async () => {
  const definitions = await readFile(
    new URL("../../../../lib/api-zod/src/methodology-editorial/index.ts", import.meta.url),
    "utf8",
  );
  assert.match(definitions, /title: "IDAO Methodology \| Cognirise"[\s\S]*?Innovate, Demonstrate, Activate and Operate: Cognirise's methodology for moving consequential work from opportunity to sustained operation\./);
  assert.match(definitions, /title: "AI Use-Case Prioritization \| Cognirise"[\s\S]*?A transparent working instrument for comparing AI opportunities across value, feasibility, friction and control burden\./);
  assert.match(definitions, /title: "AI Value-to-Scale Maturity Model \| Cognirise"[\s\S]*?Assess seven evidence-backed conditions for repeatedly moving valuable AI from opportunity into sustained operation\./);
});