import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("Shell defers protected, governed, and route-owned methodology metadata effects", async () => {
  const shell = await readFile(new URL("../components/layout/Shell.tsx", import.meta.url), "utf8");
  const preview = await readFile(new URL("./CmsPreview.tsx", import.meta.url), "utf8");
  for (const route of [
    "/methodologies/idao",
    "/methodologies/ai-use-case-prioritization",
    "/methodologies/ai-value-to-scale",
    "/methodologies/agentic-operations-readiness",
    "/methodologies/human-agent-operating-model",
  ]) {
    assert.match(shell, new RegExp(`"${route}"`));
  }
  assert.match(shell, /ROUTE_OWNED_METADATA_PATHS\.has\(currentPath\)/);
  assert.match(shell, /useEffect\(\(\) => \{[\s\S]*?ROUTE_OWNED_METADATA_PATHS\.has\(currentPath\)[\s\S]*?\}, \[currentPath\]\)/);
  assert.match(
    preview,
    /applyMetadata\(\{\s*title: "Protected preview \| Cognirise",\s*description: "Protected CMS saved-version preview\.",\s*canonicalUrl: null,\s*noIndex: true\s*\}\)/,
  );
});

test("shared methodology SEO restores Shell's exact original baselines", async () => {
  const definitions = await readFile(
    new URL("../../../../lib/api-zod/src/methodology-editorial/index.ts", import.meta.url),
    "utf8",
  );
  assert.match(definitions, /title: "IDAO Methodology \| Cognirise"[\s\S]*?Innovate, Demonstrate, Activate and Operate: Cognirise's methodology for moving consequential work from opportunity to sustained operation\./);
  assert.match(definitions, /title: "AI Use-Case Prioritization \| Cognirise"[\s\S]*?A transparent working instrument for comparing AI opportunities across value, feasibility, friction and control burden\./);
  assert.match(definitions, /title: "AI Value-to-Scale Maturity Model \| Cognirise"[\s\S]*?Assess seven evidence-backed conditions for repeatedly moving valuable AI from opportunity into sustained operation\./);
});