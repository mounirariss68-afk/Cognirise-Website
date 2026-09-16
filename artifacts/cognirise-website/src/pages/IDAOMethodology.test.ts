import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { NAVIGATION_ITEM_REGISTRY } from "@workspace/api-zod";

const page = readFileSync(new URL("./IDAOMethodology.tsx", import.meta.url), "utf8");
const content = readFileSync(new URL("../content/idao.ts", import.meta.url), "utf8");
const blueprint = readFileSync(new URL("../components/BlueprintJourney.tsx", import.meta.url), "utf8");
const app = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
const shell = readFileSync(new URL("../components/layout/Shell.tsx", import.meta.url), "utf8");
const editorial = readFileSync(new URL("../../../../lib/api-zod/src/methodology-editorial/idao.ts", import.meta.url), "utf8");
const idaoSurface = `${page}\n${content}\n${editorial}`;

test("routes IDAO and redirects retired service overviews to the homepage practice section", () => {
  assert.match(app, /path="\/methodologies\/idao" component=\{IDAOMethodology\}/);
  assert.match(app, /path="\/what-we-do"><AnchoredRedirect to="\/" anchor="service-lines"/);
  assert.match(app, /path="\/services"><AnchoredRedirect to="\/" anchor="service-lines"/);
  assert.doesNotMatch(app, /ServicesOverview/);
});

test("navigation makes What we do direct and exposes the methodology portfolio in order", () => {
  assert.match(shell, /id: "what-we-do",[\s\S]*?href: "\/",\s*\}/);
  assert.match(shell, /label: "How we do it"[\s\S]*?label: "IDAO"[\s\S]*?label: "Agent Authority Model"/);
  assert.match(shell, /aria-expanded/);
  assert.match(shell, /aria-current/);
  assert.match(shell, /aria-current=\{!item\.items && isCurrentDestination\(item\.href\) \? "page" : undefined\}/);
  assert.match(shell, /focus-visible:ring-2/);
  assert.doesNotMatch(shell, /aria-haspopup="menu"/);
  assert.deepEqual(
    NAVIGATION_ITEM_REGISTRY.filter((item) => item.id === "what-we-do" || ("parentId" in item && item.parentId === "what-we-do")).map((item) => item.id),
    ["what-we-do"],
  );
  assert.deepEqual(
    NAVIGATION_ITEM_REGISTRY.filter((item) => item.id === "methodologies" || ("parentId" in item && item.parentId === "methodologies")).map((item) => item.id),
    ["methodologies", "methodologies.overview", "methodologies.value-to-scale", "methodologies.use-case-prioritization", "methodologies.idao", "methodologies.agent-authority", "methodologies.guardrails"],
  );
});

test("IDAO renders every stage from one shared, substantive content model", () => {
  for (const stage of ["Innovate", "Demonstrate", "Activate", "Operate"]) {
    assert.match(content, new RegExp(`title: "${stage}"`));
  }
  for (const field of ["purpose", "time", "keyWork", "clientRole", "decisionGate", "outcome", "evidence"]) {
    assert.equal(content.match(new RegExp(`${field}:`, "g"))?.length, 4);
  }
  assert.equal(content.match(new RegExp(`image:`, "g"))?.length, 9);
  assert.equal(content.match(new RegExp(`imageAlt:`, "g"))?.length, 9);
  assert.match(page, /IDAO_STAGES\.map/);
  assert.match(blueprint, /IDAO_STAGES\.map/);
  assert.match(editorial, /Every stage earns the next/);
  assert.match(editorial, /"\/value-scan"/);
});

test("IDAO keeps approved imagery, order and milestone commitments", () => {
  const positions = ["Innovate", "Demonstrate", "Activate", "Operate"].map((stage) => content.indexOf(`title: "${stage}"`));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  for (const image of ["innovate", "demonstrate", "activate", "operate"]) {
    assert.match(content, new RegExp(`blueprint-${image}\\.jpg`));
  }
  assert.match(content, /time: "48 hours"/);
  assert.match(content, /time: "2–4 weeks \(MVP\)"/);
  assert.match(editorial, /decision-ready prototype within[\s\S]*48 hours/i);
  assert.match(editorial, /governed MVP within[\s\S]*2–4 weeks/i);
});

test("IDAO uses the approved lifecycle imagery for each selected market", () => {
  assert.match(page, /useMarketStore\(\)/);
  assert.match(page, /ksa: "Saudi Arabia"/);
  assert.match(page, /turkiye: "Türkiye"/);
  assert.match(page, /europe: "Europe"/);
  assert.match(page, /`\/images\/cognirise\/idao\/\$\{market\}\/\$\{stage\.toLowerCase\(\)\}\.jpg`/);
  assert.match(page, /regionalIdaoStageImage\(market, "demonstrate"\)/);
  assert.match(page, /regionalIdaoStageImage\(market, stage\.title\)/);
  assert.match(page, /Approved \$\{regionalMarketLabel\} market edition/);
});

test("IDAO hero keeps the shared five-point silhouette and accessible reveal", () => {
  assert.match(page, /data-idao-hero-frame/);
  assert.match(page, /className="clip-diagonal relative h-\[430px\][^"]*md:h-\[520px\] lg:h-\[620px\]"/);
  assert.doesNotMatch(page, /\[clip-path:polygon/);
  assert.match(page, /initial=\{reducedMotion \? false : \{ opacity: 0, x: 28 \}\}/);
  assert.match(page, /transition=\{\{ duration: reducedMotion \? 0 : 1/);
  assert.doesNotMatch(page, /animate=\{\{[^}]*clipPath: "inset\(0\)"/);
});

test("IDAO explains progression, loops, assurance and ownership", () => {
  for (const concept of [
    "loops back",
    "risk and assurance travel",
    "Governed lifecycle",
    "Reusable intelligence",
    "Traceable execution",
    "Human decision gates",
    "evaluation",
    "Security, accessibility, data governance and observability",
    "handover discipline",
    "client-owned capability",
  ]) {
    assert.match(idaoSurface, new RegExp(concept, "i"));
  }
  assert.doesNotMatch(page, /<details/);
  assert.match(page, /Across IDAO/);
  assert.match(page, /expandedCanonLayers/);
  assert.match(page, /aria-expanded=\{isExpanded\}/);
  assert.match(page, /hidden=\{!isExpanded\}/);
  assert.match(page, /Expand \+/);
  assert.match(page, /Collapse ×/);
  assert.match(page, /grid-template-rows: subgrid/);
  assert.match(page, /idao-canon-card/);
  assert.match(page, /className="mt-2 flex w-fit items-center py-1 text-left text-\[10px\] font-normal/);
  assert.doesNotMatch(page, /ChevronDown/);
  assert.match(page, /useReducedMotion/);
});

test("public IDAO copy protects internal recipes and vendor details", () => {
  for (const prohibited of ["Anthropic", "Claude", "OpenAI", "Perplexity", "Langfuse", "LangSmith", "Replit", "prompt libraries", "file convention", "numeric threshold"]) {
    assert.doesNotMatch(idaoSurface, new RegExp(`\\b${prohibited}\\b`, "i"));
  }
});

test("IDAO opens with an accessible four-part human and agent delivery system", () => {
  for (const capability of ["Senior Leaders", "Forward Deployed Engineers", "Forward Deployed Agents", "Controls & Assurance"]) {
    assert.match(editorial, new RegExp(capability));
  }
  assert.match(editorial, /Humans and AI agents working as/);
  assert.match(editorial, /20\+ years/);
  assert.match(editorial, /idao-human-agent-team\.png/);
  assert.match(page, /alt=\{teamImage\.altText\}/);
  assert.equal((page.match(/aria-pressed=\{isActive\}/g) ?? []).length, 2);
  assert.equal((page.match(/aria-expanded=\{isActive\}/g) ?? []).length, 2);
  assert.equal((page.match(/aria-controls="delivery-team-detail"/g) ?? []).length, 2);
  assert.doesNotMatch(page, /id="delivery-team-detail"\s+key=/);
  assert.match(page, /onFocus=\{/);
  assert.match(page, /onPointerEnter=\{/);
  assert.match(page, /event\.pointerType === "mouse"/);
  assert.match(page, /onClick=\{/);
  assert.match(page, /aria-live="polite"/);
  assert.match(page, /lg:min-h-\[500px\]/);
  assert.match(page, /lg:max-h-\[455px\]/);
  assert.match(page, /max-w-\[1100px\]/);
  assert.doesNotMatch(page, /lg:absolute lg:bottom-0/);
  assert.match(page, /focus-visible:outline/);
});

test("IDAO keeps baseline editorial defaults and binds CMS edits in place", () => {
  assert.match(editorial, /A governed route from a consequential opportunity to evidence, adoption and a capability your team can own\./);
  assert.match(editorial, /The work ends in your hands, not ours\./);
  assert.match(editorial, /Bring one process\. Leave with the next evidence to earn\./);
  assert.equal((editorial.match(/id: "(?:hero-demonstrate|delivery-team|stage-|canon-)/g) ?? []).length, 11);

  assert.match(page, /methodologyEditorial<"idao", typeof idaoEditorial>\("idao", cms, idaoEditorial\.seed\)/);
  assert.match(page, /methodologyEditorialMedia\(cms, editorial\.delivery\.teamImage\)/);
  assert.match(page, /methodologyEditorialMedia\(cms, editorial\.stageMedia\[index\]\.image\)/);
  assert.doesNotMatch(page, /assetUrl\(stage\.image\)/);
  assert.match(page, /assetUrl\(layer\.image\)/);
  assert.match(page, /altText: layer\.imageAlt/);
  assert.doesNotMatch(page, /methodologyEditorialMedia\(cms, editorial\.canonMedia/);
  assert.match(page, /editorial\.deliveryTeam\.filter/);
  assert.match(page, /editorial\.startingPoint\.firstParagraph/);
  assert.match(page, /editorial\.lifecycle\.description/);
  assert.match(page, /editorial\.canonIntroduction\.firstEmphasis/);
  assert.match(page, /editorial\.handover\.cta\.href/);
  assert.match(page, /editorial\.closingCta\.cta\.label/);
  assert.doesNotMatch(page, /MethodologyRelationship/);
});

test("IDAO media slots retain the fixed canonical stage and layer identities", () => {
  const definition = editorial.slice(editorial.indexOf("export const idaoEditorial"));
  for (const id of ["innovate", "demonstrate", "activate", "operate"]) {
    assert.match(definition, new RegExp(`id: fixed\\("${id}"\\)`));
  }
  for (const id of ["01", "02", "03", "04", "05"]) {
    assert.match(definition, new RegExp(`id: fixed\\("${id}"\\)`));
  }
  assert.equal((definition.match(/stageMedia: fixedList/g) ?? []).length, 1);
  assert.equal((definition.match(/canonMedia: fixedList/g) ?? []).length, 1);
  assert.equal((definition.match(/role: "supporting"/g) ?? []).length, 10);
});

test("IDAO canon uses the commissioned Pulse image family in compiled and governed delivery", () => {
  const replacements = [
    "idao-canon-governed-lifecycle-v2.jpg",
    "idao-canon-reusable-intelligence-v2.jpg",
    "idao-canon-traceable-execution-v2.jpg",
    "idao-canon-human-decision-gates-v2.jpg",
    "idao-canon-assurance-by-design-v2.jpg",
  ];
  for (const image of replacements) {
    assert.match(content, new RegExp(image.replace(".", "\\.")));
    assert.match(editorial, new RegExp(image.replace(".", "\\.")));
  }
  assert.doesNotMatch(idaoSurface, /\/images\/cognirise\/canon-[1-5]\.jpg/);
  assert.equal((page.match(/data-idao-canon-image=/g) ?? []).length, 1);
});
