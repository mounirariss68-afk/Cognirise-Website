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
  const relBlock = readFileSync(resolve(root, "src/components/MethodologyRelationship.tsx"), "utf8");
  const vts = readFileSync(resolve(root, "src/pages/AIValueToScale.tsx"), "utf8");
  const ucp = readFileSync(resolve(root, "src/pages/AIUseCasePrioritization.tsx"), "utf8");
  const aor = readFileSync(resolve(root, "src/pages/AgenticOperationsReadiness.tsx"), "utf8");
  const haom = readFileSync(resolve(root, "src/pages/HumanAgentOperatingModel.tsx"), "utf8");

  it("has exactly seven headings in MethodologyRelationship", () => {
    assert.match(relBlock, /Start here when/i);
    assert.match(relBlock, /Decision/);
    assert.match(relBlock, /Output/);
    assert.match(relBlock, /Connection to IDAO/);
    assert.match(relBlock, /Connection to Agent Authority/);
    assert.match(relBlock, /Reassess when/);
    assert.match(relBlock, /Does not decide/);
  });

  it("verifies IDAO entry points, loopback, and K/D/A in route map", () => {
    assert.match(routeMap, /Innovate, Demonstrate, Activate/);
    assert.match(routeMap, /loopback/i);
    assert.match(routeMap, /Knowledge/);
    assert.match(routeMap, /Decision/);
    assert.match(routeMap, /Action/);
    for (const situation of ["Organization-wide constraint", "Multiple opportunities", "One use case or workflow", "Human–agent work design", "Specific handover authority", "Evidence from live operation"]) {
      assert.match(routeMap, new RegExp(situation));
    }
  });

  it("verifies the new method overview image and routing approach in portfolio", () => {
    assert.match(portfolio, /method-overview\.jpg/);
    assert.match(portfolio, /route-navigator/);
    assert.doesNotMatch(portfolio, /AI Value-to-Scale Maturity Model/);
    assert.doesNotMatch(portfolio, /Complete static route/i);
    assert.doesNotMatch(portfolio, /Download the VTS assessment worksheet/i);
    assert.match(routeMap, /Start with your situation/i);
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

  it("verifies imagery refs exist in the pages", () => {
    assert.match(vts, /method-vts\.jpg/);
    assert.match(ucp, /method-ucp-v2\.jpg/);
    assert.match(aor, /method-aor-v2\.jpg/);
    assert.match(haom, /method-haom-v2\.jpg/);
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
    assert.match(vts, /Weak-condition evidence can move work to an earlier IDAO entry or loopback/);
    assert.match(ucp, /Control Burden:[\s\S]*exposure and required oversight/);
    assert.match(aor, /6 Conditions feed into:/);
    assert.match(aor, /Proceed[\s\S]*Prepare[\s\S]*Stop/);
    assert.match(haom, /Handover Choreography across IDAO/);
    assert.match(haom, /propose, approve, act, intervene, and demotion right/);
  });
});
