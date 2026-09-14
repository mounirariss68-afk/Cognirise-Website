import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  methodologyEditorialMedia,
  methodologyCmsSeoMetadata,
} from "./MethodologyCmsLayout";
import { methodologySeoSeeds } from "@workspace/api-zod";
test("assessment routes retain their route-owned engines without generic editorial appendices", async () => {
  const root = path.resolve(import.meta.dirname, "../pages");
  const routes = [
    ["AIUseCasePrioritization.tsx", "ai-use-case-prioritization", "getRecommendation"],
    ["AIValueToScale.tsx", "ai-value-to-scale", "DIMENSIONS"],
    ["AgenticOperationsReadiness.tsx", "agentic-operations-readiness", "CONDITIONS"],
    ["HumanAgentOperatingModel.tsx", "human-agent-operating-model", "DESIGN_STEPS"],
    ["IDAOMethodology.tsx", "idao", "IDAO_STAGES"],
  ] as const;
  for (const [file, template, engine] of routes) {
    const source = await readFile(path.join(root, file), "utf8");
    assert.doesNotMatch(source, /MethodologyEditorialSections/);
    assert.match(source, new RegExp(`MethodologyCmsDelivery slug="${template}"`));
    assert.match(source, new RegExp(engine));
  }
});

test("methodology SEO uses the exact CMS revision and preserves preview noindex", () => {
  const fallback = methodologySeoSeeds["ai-value-to-scale"];
  const authoritative = methodologyCmsSeoMetadata({
    framework: {
      seo: {
        title: "Reviewed AI Value-to-Scale | Cognirise",
        description: "Reviewed metadata from the authoritative revision.",
        canonicalUrl: "https://www.cognirise.com/methodologies/ai-value-to-scale",
        noIndex: false,
      },
    },
    preview: false,
  } as never, fallback);
  assert.deepEqual(authoritative, {
    title: "Reviewed AI Value-to-Scale | Cognirise",
    description: "Reviewed metadata from the authoritative revision.",
    canonicalUrl: "https://www.cognirise.com/methodologies/ai-value-to-scale",
    noIndex: false,
    imageUrl: undefined,
  });

  const preview = methodologyCmsSeoMetadata({
    framework: {
      seo: authoritative,
    },
    preview: true,
  } as never, fallback);
  assert.equal(preview.noIndex, true);
  assert.equal(preview.canonicalUrl, null);
});

test("methodology supporting media uses revision-local alternative text over pinned library metadata", () => {
  const resolved = methodologyEditorialMedia({
    preview: true,
    framework: {
      media: [{
        id: "00000000-0000-4000-8000-000000000101",
        versionId: "00000000-0000-4000-8000-000000000201",
        url: "/api/media/pinned-supporting-image",
        altText: "Library metadata that must not replace the page copy",
      }],
    },
  } as never, {
    src: "/images/compiled-supporting-image.png",
    altText: "Edited on this exact methodology revision",
    media: {
      mediaId: "00000000-0000-4000-8000-000000000101",
      mediaVersionId: "00000000-0000-4000-8000-000000000201",
      role: "supporting",
      altText: "Stale pin alt text",
    },
  });
  assert.deepEqual(resolved, {
    src: "/api/media/pinned-supporting-image",
    altText: "Edited on this exact methodology revision",
    imageResolved: true,
  });
});

test("all five methodology routes use one top-level SEO baseline", async () => {
  const root = path.resolve(import.meta.dirname, "../pages");
  const routes = [
    ["IDAOMethodology.tsx", "idao"],
    ["AIUseCasePrioritization.tsx", "ai-use-case-prioritization"],
    ["AIValueToScale.tsx", "ai-value-to-scale"],
    ["AgenticOperationsReadiness.tsx", "agentic-operations-readiness"],
    ["HumanAgentOperatingModel.tsx", "human-agent-operating-model"],
  ] as const;
  for (const [file, template] of routes) {
    const source = await readFile(path.join(root, file), "utf8");
    assert.match(source, new RegExp(`useMethodologyCmsSeo\\(cms, methodologySeoSeed\\("${template}"\\)\\)`));
  }
  const editorialRoot = path.resolve(import.meta.dirname, "../../../../lib/api-zod/src/methodology-editorial");
  for (const file of ["agentic-operations-readiness.ts", "human-agent-operating-model.ts"]) {
    const source = await readFile(path.join(editorialRoot, file), "utf8");
    assert.doesNotMatch(source, /seo:\s*group\(/);
  }
});