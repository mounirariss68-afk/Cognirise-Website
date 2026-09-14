import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appUrl = new URL("./App.tsx", import.meta.url);

test("the Guardrails framework has one canonical methodology route adjacent to Agent Authority", async () => {
  const source = await readFile(appUrl, "utf8");
  const authority = '<Route path="/methodologies/agent-authority-model" component={AgentAuthorityModel} />';
  const guardrails = '<Route path="/methodologies/guardrails-framework" component={GuardrailsFramework} />';

  assert.match(source, /import GuardrailsFramework from "@\/pages\/GuardrailsFramework";/);
  assert.equal(source.split(guardrails).length - 1, 1);
  assert.ok(source.indexOf(authority) < source.indexOf(guardrails));
});