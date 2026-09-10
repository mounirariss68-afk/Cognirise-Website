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
    assert.match(relBlock, /How it connects to IDAO/);
    assert.match(relBlock, /How it connects to Agent Authority/);
    assert.match(relBlock, /Reassess when/);
    assert.match(relBlock, /Does not decide/);
  });

  it("verifies IDAO entry points, loopback, and K/D/A in route map", () => {
    assert.match(routeMap, /Innovate, Demonstrate, Activate/);
    assert.match(routeMap, /update to Operate/);
    assert.match(routeMap, /loopback/i);
    assert.match(routeMap, /Knowledge/);
    assert.match(routeMap, /Decision/);
    assert.match(routeMap, /Action/);
    assert.match(routeMap, /start from any situation/i);
    assert.match(routeMap, /optional/i);
    assert.match(routeMap, /not another framework/i);
    assert.match(routeMap, /Self-assessment · an instrument within this method/);
    assert.match(routeMap, /No initiative is required to start at Innovate/i);
    for (const situation of ["Organization-wide constraint", "Multiple opportunities", "One use case or workflow", "Human–agent work design", "Specific handover authority", "Evidence from live operation"]) {
      assert.match(routeMap, new RegExp(situation));
    }
  });

  it("verifies one AI Value-to-Scale occurrence in portfolio and nested assessment", () => {
    const vtsMatches = portfolio.match(/AI Value-to-Scale Maturity Model/g) || [];
    assert.strictEqual(vtsMatches.length, 1);
    assert.match(portfolio, /Self-Administered AI Maturity Assessment/);
    assert.match(portfolio, /nested/i);
  });

  it("verifies imagery refs exist in the pages", () => {
    assert.match(vts, /method-value-to-scale\.jpg/);
    assert.match(ucp, /method-use-case-prioritization-clean\.jpg/);
    assert.match(aor, /method-operations-readiness-clean\.jpg/);
    assert.match(haom, /method-human-agent-operating-model-clean\.jpg/);
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
