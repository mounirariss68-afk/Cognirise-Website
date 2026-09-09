import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { NAVIGATION_ITEM_REGISTRY } from "@workspace/api-zod";

const page = readFileSync(new URL("./IDAOMethodology.tsx", import.meta.url), "utf8");
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
  assert.match(shell, /label: "Frameworks & Methodologies"[\s\S]*?label: "IDAO"[\s\S]*?label: "Agent Authority Model"/);
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

test("IDAO expands every stage into purpose, activities, decision and outcome", () => {
  for (const stage of ["Innovate", "Demonstrate", "Activate", "Operate"]) {
    assert.match(page, new RegExp(`name: "${stage}"`));
  }
  for (const field of ["purpose", "activities", "decision", "outcome"]) {
    assert.equal(page.match(new RegExp(`${field}:`, "g"))?.length, 4);
  }
  assert.match(page, /Every stage earns the next/);
  assert.match(page, /href="\/value-scan"/);
});