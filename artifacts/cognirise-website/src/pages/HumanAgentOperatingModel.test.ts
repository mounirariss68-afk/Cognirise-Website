import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const websiteRoot = path.resolve(import.meta.dirname, "../..");
const pagePath = path.join(websiteRoot, "src/pages/HumanAgentOperatingModel.tsx");
const seedPath = path.resolve(websiteRoot, "../../lib/api-zod/src/methodology-editorial/human-agent-operating-model.ts");

test("Human–Agent Operating Model baseline editorial is retained in its fixed seed", async () => {
  const seed = await readFile(seedPath, "utf8");

  for (const literal of [
    "Redesign the work, not just the technology.",
    "A rollout installs a tool. An operating model changes how work runs.",
    "Start with one real workflow. Finish with an operable design.",
    "Make authority visible at every move.",
    "Prepare people to operate, challenge and improve the system.",
    "Measure behaviour, control and outcomes—not logins alone.",
    "Design before launch. Learn after it.",
    "Bring one workflow where people and agents must work together.",
    "/images/cognirise/method-haom-v2.jpg",
    "/methodologies/agent-authority-model",
    "/methodologies/idao#lifecycle",
    "/value-scan",
  ]) {
    assert.match(seed, new RegExp(literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(seed, /export const heroSeed = \{/);
  assert.match(seed, /steps: fixedList\("Five design moves"/);
  assert.match(seed, /rows: fixedList\("Decision-rights table rows"/);
  assert.match(seed, /groups: fixedList\("Adoption measure groups"/);
});

test("Human–Agent Operating Model renders CMS editorial at each original position", async () => {
  const page = await readFile(pagePath, "utf8");

  assert.match(page, /methodologyEditorial<[\s\S]*?"human-agent-operating-model",[\s\S]*?cms,[\s\S]*?humanAgentOperatingModelEditorial\.seed/);
  for (const binding of [
    "editorial.boundary.heading",
    "editorial.playbook.steps",
    "editorial.handoverChoreography.heading",
    "editorial.decisionRights.rows",
    "editorial.capability.cards",
    "editorial.measures.groups",
    "editorial.idaoConnection.cta.href",
    "editorial.finalCta.cta.href",
  ]) {
    assert.match(page, new RegExp(binding.replace(/\./g, "\\.")));
  }
});