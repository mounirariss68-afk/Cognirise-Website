import assert from "node:assert/strict";
import test from "node:test";
import { belongsToIndustrySection, INDUSTRY_SECTION_IDS, INDUSTRY_SECTION_OUTLINE, isIndustrySectionId } from "@workspace/api-zod";
import { createLatestPreviewRequestCoordinator, industryPreviewFocusMessage, INDUSTRY_PREVIEW_WIDTH_CLASSES, INDUSTRY_PREVIEW_WIDTHS, industryWorkspaceLayout, nextIndustryDisclosureState } from "./industry-workspace-state.ts";

test("the inspector consumes the shared fixed industry-section contract and intrinsic viewports", () => {
  assert.deepEqual(INDUSTRY_SECTION_IDS, [
    "hero", "opportunity", "pressures", "capabilities", "applications",
    "perspective", "market", "sources", "cta",
  ]);
  assert.deepEqual(INDUSTRY_SECTION_OUTLINE.map((section) => section.id), INDUSTRY_SECTION_IDS);
  assert.equal(isIndustrySectionId("capabilities"), true);
  assert.equal(isIndustrySectionId("governance"), false);
  assert.deepEqual(INDUSTRY_PREVIEW_WIDTHS, { desktop: 1280, tablet: 768, mobile: 390 });
  assert.deepEqual(INDUSTRY_PREVIEW_WIDTH_CLASSES, {
    desktop: "w-[1280px] min-w-[1280px]",
    tablet: "w-[768px] min-w-[768px]",
    mobile: "w-[390px] min-w-[390px]",
  });
  assert.equal(industryWorkspaceLayout(759), "stacked");
  assert.equal(industryWorkspaceLayout(760), "preview-row");
  assert.equal(industryWorkspaceLayout(1279), "preview-row");
  assert.equal(industryWorkspaceLayout(1280), "three-column");
});

test("the disclosure control and focus protocol retain the fixed section boundary", () => {
  assert.equal(nextIndustryDisclosureState("expanded"), "collapsed");
  assert.equal(nextIndustryDisclosureState("collapsed"), "expanded");
  assert.deepEqual(
    industryPreviewFocusMessage("capabilities", true, "expanded"),
    { type: "industry-preview-focus", section: "capabilities", state: "expanded" },
  );
  assert.deepEqual(
    industryPreviewFocusMessage("hero", false, "expanded"),
    { type: "industry-preview-focus", section: "hero", state: undefined },
  );
});

test("manual and automatic preview issuance are last-request-wins and consume failures", async () => {
  const values: string[] = [];
  let failures = 0;
  const coordinator = createLatestPreviewRequestCoordinator(
    (value: string) => values.push(value),
    () => { failures += 1; },
  );
  let resolveOlder!: (value: string) => void;
  const older = new Promise<string>((resolve) => { resolveOlder = resolve; });
  const first = coordinator.issue(() => older);
  const second = coordinator.issue(async () => "fresh");
  await second;
  resolveOlder("stale");
  await first;
  assert.deepEqual(values, ["fresh"]);

  await coordinator.issue(async () => { throw new Error("expired"); });
  assert.equal(failures, 1, "a rejected refresh is handled rather than escaping the caller");
  coordinator.cancel();
  await coordinator.issue(async () => "after-cancel");
  assert.deepEqual(values, ["fresh", "after-cancel"]);
});

test("specialist field paths have one renderer-aligned inspector and validation section", () => {
  const expected = [
    ["legacyPath", "hero"],
    ["name", "hero"],
    ["shortName", "hero"],
    ["thesis", "hero"],
    ["accent", "hero"],
    ["dek", "hero"],
    ["image", "hero"],
    ["imageAlt", "hero"],
    ["heroMedia", "hero"],
    ["heroMediaId", "hero"],
    ["variant", "hero"],
    ["opportunity", "opportunity"],
    ["pressures", "pressures"],
    ["capabilities", "capabilities"],
    ["uses", "applications"],
    ["reversal", "perspective"],
    ["myth", "perspective"],
    ["gcc", "market"],
    ["sources", "sources"],
    ["selectedWork.description", "cta"],
    ["service", "cta"],
    ["educationPov.introduction", "hero"],
    ["educationPov.strategicShift", "opportunity"],
    ["educationPov.convictions", "pressures"],
    ["educationPov.valueDomains", "capabilities"],
    ["educationPov.targetState", "capabilities"],
    ["educationPov.imagery.educatorPractice.src", "capabilities"],
    ["educationPov.imagery.researchCoordination.media.mediaVersionId", "capabilities"],
    ["educationPov.applications", "applications"],
    ["educationPov.signals", "applications"],
    ["educationPov.patternQuote", "perspective"],
    ["educationPov.globalDirection", "perspective"],
    ["educationPov.roadmap", "perspective"],
    ["educationPov.leadershipTest", "market"],
    ["bankingPov.descriptor", "hero"],
    ["bankingPov.hero", "hero"],
    ["bankingPov.valueOutcomes", "opportunity"],
    ["bankingPov.adoptionLevels", "pressures"],
    ["bankingPov.valueDomains", "capabilities"],
    ["bankingPov.startingPoints", "capabilities"],
    ["bankingPov.voiceBanking", "applications"],
    ["bankingPov.productionReadiness", "perspective"],
    ["bankingPov.deliveryPath", "perspective"],
    ["bankingPov.market", "market"],
    ["bankingPov.evidenceSignals", "sources"],
    ["bankingPov.partners", "sources"],
    ["bankingPov.caseMembershipSnapshot", "sources"],
    ["bankingPov.cta", "cta"],
  ] as const;
  for (const [path, expectedSection] of expected) {
    const matches = INDUSTRY_SECTION_IDS.filter((section) => belongsToIndustrySection(path, section));
    assert.deepEqual(matches, [expectedSection], `${path} must belong to exactly one visible inspector section`);
  }
});