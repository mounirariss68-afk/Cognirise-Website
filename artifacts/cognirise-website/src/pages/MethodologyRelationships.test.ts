import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import assert from "node:assert";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("Methodology Relationships and Boundaries", () => {
  const root = resolve(__dirname, "../..");
  const routeMap = readFileSync(resolve(root, "src/components/MethodologyRouteMap.tsx"), "utf8");

  const analytics = readFileSync(resolve(root, "src/lib/analytics.ts"), "utf8");
  const portfolio = readFileSync(resolve(root, "src/pages/MethodologiesPortfolio.tsx"), "utf8");
  const heroFilm = readFileSync(resolve(root, "src/components/MethodologiesHeroFilm.tsx"), "utf8");
  const landingInventory = readFileSync(resolve(root, "../../lib/db/landing-page-inventory.json"), "utf8");
  const relBlock = readFileSync(resolve(root, "src/components/MethodologyRelationship.tsx"), "utf8");
  const vts = readFileSync(resolve(root, "src/pages/AIValueToScale.tsx"), "utf8");
  const ucp = readFileSync(resolve(root, "src/pages/AIUseCasePrioritization.tsx"), "utf8");
  const aor = readFileSync(resolve(root, "src/pages/AgenticOperationsReadiness.tsx"), "utf8");
  const haom = readFileSync(resolve(root, "src/pages/HumanAgentOperatingModel.tsx"), "utf8");
  const vtsEditorial = readFileSync(resolve(root, "../../lib/api-zod/src/methodology-editorial/ai-value-to-scale.ts"), "utf8");
  const ucpEditorial = readFileSync(resolve(root, "../../lib/api-zod/src/methodology-editorial/ai-use-case-prioritization.ts"), "utf8");
  const aorEditorial = readFileSync(resolve(root, "../../lib/api-zod/src/methodology-editorial/agentic-operations-readiness.ts"), "utf8");
  const haomEditorial = readFileSync(resolve(root, "../../lib/api-zod/src/methodology-editorial/human-agent-operating-model.ts"), "utf8");
  it("has exactly seven headings in MethodologyRelationship", () => {
    assert.match(relBlock, /Start here when/i);
    assert.match(relBlock, /Decision/);
    assert.match(relBlock, /Output/);
    assert.match(relBlock, /Connection to IDAO/);
    assert.match(relBlock, /Connection to Agent Authority/);
    assert.match(relBlock, /Reassess when/);
    assert.match(relBlock, /Does not decide/);
  });

  it("verifies the seven approved decision-first situations and protected anchors", () => {
    assert.match(routeMap, /Innovate, Demonstrate, Activate/);
    assert.match(routeMap, /Knowledge/);
    assert.match(routeMap, /Decision/);
    assert.match(routeMap, /Action/);
    for (const situation of [
      "We need to know where AI is worth investing.",
      "We have several AI ideas and need to choose.",
      "We have an AI strategy and need to implement it.",
      "We need to improve a specific process.",
      "We have a pilot and need to put it into everyday use.",
      "AI works in one area. We need to expand it.",
      "Our AI is in use, but the results are falling short.",
    ]) {
      assert.match(routeMap, new RegExp(situation));
    }
    for (const retired of ["Organization-wide constraint", "Multiple opportunities", "One use case or workflow", "Human–agent work design", "Specific handover authority", "Evidence from live operation"]) {
      assert.doesNotMatch(routeMap, new RegExp(`label: "${retired}`));
    }
    assert.match(routeMap, /Existing assets/);
    assert.match(routeMap, /Actual output/);
    assert.match(routeMap, /not a complete business case; producing a full business case is additional engagement work/);
    assert.match(routeMap, /Turning a strategy or roadmap into delivery is additional engagement work beyond this self-service route/);
    assert.match(routeMap, /Relevant methods and why they fit/);
    assert.match(routeMap, /Conditional IDAO connection/);
    assert.match(routeMap, /planned as a complementary specialist method alongside Agent Authority/);
    assert.match(routeMap, /No standalone Guardrails framework or assessment is published/);
    assert.match(routeMap, /#guardrails-and-authority/);
  });

  it("keeps the approved hero image as a fallback under the dedicated UAE film", () => {
    assert.match(portfolio, /landingMedia\(governedLanding, "methodologies-hero-media"/);
    assert.match(portfolio, /src=\{heroMedia\.src\}/);
    assert.match(portfolio, /alt=\{heroMedia\.alt\}/);
    assert.match(portfolio, /market === "uae" && locale === "en"/);
    assert.match(portfolio, /showFilm && <MethodologiesHeroFilm/);
    assert.match(portfolio, /<NavigationBackControl embedded \/>/);
    assert.match(portfolio, /src: assetUrl\("\/images\/cognirise\/method-overview\.jpg"\)/);
    for (const file of [
      "videos/cognirise/methodologies-pulse-hero-journey.mp4",
      "videos/cognirise/methodologies-pulse-hero-journey-720.mp4",
      "videos/cognirise/methodologies-pulse-hero-journey.webm",
      "images/cognirise/methodologies-pulse-hero-journey-poster.jpg",
    ]) {
      assert.match(heroFilm, new RegExp(file.replaceAll(".", "\\.")));
      assert.ok(readFileSync(resolve(root, `public/${file}`)).byteLength > 1000);
    }
    assert.match(heroFilm, /prefers-reduced-motion: reduce/);
    assert.match(heroFilm, /video\.play\(\)\.catch/);
    assert.match(heroFilm, /error\.name !== "AbortError"/);
    assert.match(heroFilm, /networkState === HTMLMediaElement\.NETWORK_NO_SOURCE/);
    assert.match(heroFilm, /if \(failed \|\| \(reducedMotion && posterFailed\)\) return null/);
    assert.doesNotMatch(heroFilm, /loadingGuard|8000/, "slow downloads should not be mistaken for broken media");
    assert.match(portfolio, /route-navigator/);
    assert.match(portfolio, /seven situations/);
    assert.match(portfolio, /Value Scan remains a separate optional facilitated enquiry/);
    assert.match(landingInventory, /Start with the decision in front of you—not a framework name/);
    assert.doesNotMatch(portfolio, /AI Value-to-Scale Maturity Model/);
    assert.doesNotMatch(portfolio, /Complete static route/i);
    assert.doesNotMatch(portfolio, /Download the VTS assessment worksheet/i);
    assert.match(routeMap, /Choose the decision in front of you/i);
    assert.match(routeMap, /Direct specialist access/);
  });

  it("tracks methodology route choices and fixed destinations without free-form content", () => {
    assert.match(analytics, /window\.umami\?\.track\(name, data\)/);
    assert.match(routeMap, /trackProjectEvent\("methodology_route_selected", \{[\s\S]*situation,[\s\S]*location:/);
    assert.match(routeMap, /trackProjectEvent\("methodology_destination_opened", \{[\s\S]*situation: activeSituation,[\s\S]*destination,[\s\S]*location/);
    for (const location of [
      "desktop_route_selector",
      "mobile_route_selector",
      "desktop_selected_route",
      "mobile_selected_route",
    ]) {
      assert.match(routeMap, new RegExp(location));
    }
    assert.match(routeMap, /trackProjectEvent\("methodology_anchor_opened", \{ destination, location \}\)/);
    assert.match(routeMap, /"desktop_route_map"/);
    assert.match(routeMap, /"mobile_route_map"/);
    assert.match(routeMap, /onClick=\{\(\) => openDestination\(action\.href\)\}/);
    assert.match(routeMap, /onClick=\{\(\) => openAnchor\("\/methodologies\/idao"\)\}/);
    assert.match(routeMap, /onClick=\{\(\) => openAnchor\("\/methodologies\/agent-authority-model"\)\}/);
    assert.match(routeMap, /if \(lastSelectedSituation\.current === situation\) return/);
    assert.doesNotMatch(routeMap, /trackProjectEvent\([^)]*(label|decision|output|idao|authority)/);
  });

  it("keeps hero image baselines in their shared template definitions", () => {
    assert.match(vtsEditorial, /method-vts-v2\.jpg/);
    assert.match(ucpEditorial, /method-ucp-governed-ai-v3\.jpg/);
    assert.match(aorEditorial, /method-aor-v2\.jpg/);
    assert.match(haomEditorial, /method-haom-v2\.jpg/);
  });

  it("uses the shared relationship block on every supporting methodology", () => {
    for (const page of [vts, ucp, aor, haom]) {
      assert.match(page, /<MethodologyRelationship/);
      assert.match(page, /connectsToIdao=/);
      assert.match(page, /connectsToAuthority=/);
      assert.match(page, /reassessWhen=/);
      assert.match(page, /doesNotDecide=/);
    }
  });

  it("keeps method-specific explanatory routes explicit", () => {
    assert.match(vtsEditorial, /Weak-condition evidence can move work to an earlier IDAO entry or loopback/);
    assert.match(ucpEditorial, /Control Burden:[\s\S]*exposure and required oversight/);
    assert.match(aorEditorial, /6 Conditions feed into:/);
    assert.match(aorEditorial, /Proceed[\s\S]*Prepare[\s\S]*Stop/);
    assert.match(haomEditorial, /Handover Choreography across IDAO/);
    assert.match(haomEditorial, /propose, approve, act, intervene, and demotion right/);
  });
});
