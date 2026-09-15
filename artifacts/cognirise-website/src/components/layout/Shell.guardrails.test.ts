import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const shellUrl = new URL("./Shell.tsx", import.meta.url);

test("the unconfigured navigation fallback includes Guardrails after Agent Authority", async () => {
  const source = await readFile(shellUrl, "utf8");
  const authority = '{ id: "methodologies.agent-authority", label: "Agent Authority Model", href: "/methodologies/agent-authority-model" }';
  const guardrails = '{ id: "methodologies.guardrails", label: "Guardrails Framework", href: "/methodologies/guardrails-framework" }';

  assert.equal(source.split(guardrails).length - 1, 1);
  assert.ok(source.indexOf(authority) < source.indexOf(guardrails));
});

test("desktop and mobile navigation retain the selected market and locale", async () => {
  const source = await readFile(shellUrl, "utf8");
  assert.equal(
    source.split("href={marketAwareDestination(subItem.href, market, locale)}").length - 1,
    2,
  );
});

test("Guardrails keeps ownership of its governed CMS metadata", async () => {
  const source = await readFile(shellUrl, "utf8");
  assert.match(source, /ROUTE_OWNED_METADATA_PATHS = new Set\(\[\s*"\/methodologies\/guardrails-framework"/);
});