import assert from "node:assert/strict";
import test from "node:test";
import type { CmsRecord } from "@/lib/cms";
import type { FrameworkContent } from "@workspace/api-zod";
import { guardrailsRelatedLink } from "./AgentAuthorityModel";
import { marketAwareDestination } from "@/lib/marketDestination";

type GuardrailsFrameworkContent = Extract<FrameworkContent, { template: "guardrails" }>;
type GuardrailsRecord = CmsRecord<GuardrailsFrameworkContent>;

const record = (relatedLink: unknown): GuardrailsRecord => ({
  template: "guardrails",
  relatedLink,
} as unknown as GuardrailsRecord);

test("Agent Authority only receives a valid Guardrails backlink from a delivered Guardrails record", () => {
  assert.equal(guardrailsRelatedLink(null), null);
  assert.equal(guardrailsRelatedLink(record(undefined)), null);
  assert.equal(guardrailsRelatedLink(record({
    title: "The Guardrails Framework",
    body: "Editable related framework copy.",
    href: "/contact",
  })), null);
  assert.deepEqual(guardrailsRelatedLink(record({
    title: "The Guardrails Framework",
    body: "Authority decides what a handover is allowed to do.",
    href: "/methodologies/guardrails-framework",
  })), {
    title: "The Guardrails Framework",
    body: "Authority decides what a handover is allowed to do.",
    href: "/methodologies/guardrails-framework",
  });
});

test("the Guardrails backlink retains the selected regional market and locale", () => {
  assert.equal(
    marketAwareDestination("/methodologies/guardrails-framework", "ksa", "ar"),
    "/methodologies/guardrails-framework?market=ksa&locale=ar",
  );
});