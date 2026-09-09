import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { NAVIGATION_ITEM_REGISTRY } from "@workspace/api-zod";

const page = readFileSync(new URL("./IDAOMethodology.tsx", import.meta.url), "utf8");
const content = readFileSync(new URL("../content/idao.ts", import.meta.url), "utf8");
const blueprint = readFileSync(new URL("../components/BlueprintJourney.tsx", import.meta.url), "utf8");
const app = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
const shell = readFileSync(new URL("../components/layout/Shell.tsx", import.meta.url), "utf8");

test("routes IDAO and redirects retired service overviews to the homepage practice section", () => {
  assert.match(app, /path="\/methodologies\/idao" component=\{IDAOMethodology\}/);
  assert.match(app, /path="\/what-we-do"><AnchoredRedirect to="\/" anchor="service-lines"/);
  assert.match(app, /path="\/services"><AnchoredRedirect to="\/" anchor="service-lines"/);
  assert.doesNotMatch(app, /ServicesOverview/);
});

test("navigation makes What we do direct and exposes both methodologies in order", () => {
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
    ["methodologies", "methodologies.idao", "methodologies.agent-authority"],
  );
});

test("IDAO renders every stage from one shared, substantive content model", () => {
  for (const stage of ["Innovate", "Demonstrate", "Activate", "Operate"]) {
    assert.match(content, new RegExp(`title: "${stage}"`));
  }
  for (const field of ["purpose", "time", "keyWork", "clientRole", "decisionGate", "outcome", "evidence", "image", "imageAlt"]) {
    assert.equal(content.match(new RegExp(`${field}:`, "g"))?.length, 4);
  }
  assert.match(page, /IDAO_STAGES\.map/);
  assert.match(blueprint, /IDAO_STAGES\.map/);
  assert.match(page, /Every stage earns the next/);
  assert.match(page, /href="\/value-scan"/);
});

test("IDAO keeps approved imagery, order and milestone commitments", () => {
  const positions = ["Innovate", "Demonstrate", "Activate", "Operate"].map((stage) => content.indexOf(`title: "${stage}"`));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  for (const image of ["innovate", "demonstrate", "activate", "operate"]) {
    assert.match(content, new RegExp(`blueprint-${image}\\.jpg`));
  }
  assert.match(content, /time: "48 hours"/);
  assert.match(content, /time: "2–4 weeks \(MVP\)"/);
  assert.match(page, /decision-ready prototype within[\s\S]*48 hours/i);
  assert.match(page, /governed MVP within[\s\S]*2–4 weeks/i);
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
    assert.match(`${page}\n${content}`, new RegExp(concept, "i"));
  }
  assert.match(page, /<details/);
  assert.match(page, /focus-visible:outline/);
  assert.match(page, /useReducedMotion/);
});

test("public IDAO copy protects internal recipes and vendor details", () => {
  for (const prohibited of ["Anthropic", "Claude", "OpenAI", "Perplexity", "Langfuse", "LangSmith", "Replit", "prompt libraries", "file convention", "numeric threshold"]) {
    assert.doesNotMatch(`${page}\n${content}`, new RegExp(`\\b${prohibited}\\b`, "i"));
  }
});

test("IDAO opens with an accessible four-part human and agent delivery system", () => {
  for (const capability of ["Senior Leaders", "Forward Deployed Engineers", "Forward Deployed Agents", "Controls & Assurance"]) {
    assert.match(page, new RegExp(capability));
  }
  assert.match(page, /Humans and AI agents working as/);
  assert.match(page, /20\+ years/);
  assert.match(page, /idao-human-agent-team\.png/);
  assert.match(page, /alt="A single figure divided into a human leader and an AI agent/);
  assert.equal((page.match(/aria-pressed=\{isActive\}/g) ?? []).length, 2);
  assert.equal((page.match(/aria-expanded=\{isActive\}/g) ?? []).length, 2);
  assert.equal((page.match(/aria-controls=\{`\$\{item\.id\}-mobile-detail delivery-team-detail`\}/g) ?? []).length, 2);
  assert.doesNotMatch(page, /id="delivery-team-detail"\s+key=/);
  assert.match(page, /\$\{item\.id\}-mobile-detail/);
  assert.match(page, /lg:hidden/);
  assert.match(page, /aria-live="polite"/);
  assert.match(page, /focus-visible:outline/);
});