import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const page = () => readFile(new URL("./CogniOSPlatform.tsx", import.meta.url), "utf8");

test("CogniOS detail contains every supplied section, item and CTA", async () => {
  const source = await page();
  for (const claim of [
    "The operating system for ", "enterprise AI.", "CogniOS manages the full lifecycle of your agentic workflows",
    "Full lifecycle governance", "Performance management", "Scheduling & orchestration", "On-prem AI/ML ops", "App builder",
    "The first AI agent is easy. The twentieth is where it breaks down.",
    "CogniOS gives AI the same operational discipline you expect from any other enterprise system.",
    "Lifecycle governance", "Performance management", "Scheduling and orchestration", "AI/ML ops on your infrastructure",
    "Spawn new applications", "Control and audit",
    "Design.", "Approve.", "Deploy.", "Monitor.", "Improve.", "Retire.",
    "One platform, three layers", "CogniBase connects AI", "CogniAgents deliver function-specific workflows",
    "Start with any layer. CogniOS brings them together as your AI estate grows.",
    "CIOs and CTOs get one view", "Risk and compliance teams get approvals",
    "AI and platform teams get model serving", "Business owners get faster delivery",
    "On-premises.", "Private cloud.", "Managed EU cloud.",
    "Do we need CogniBase and CogniAgents to use CogniOS?",
    "Which models can we run?", "How does CogniOS support the EU AI Act?",
    'What does "spawning an app" mean in practice?',
    "It supports your obligations rather than replacing your compliance process.",
    "Run AI like the rest of your enterprise.", "Governed, measured, scheduled and on your own terms.",
  ]) assert.ok(source.includes(claim), `Missing supplied copy: ${claim}`);
  assert.match(source, /<BrandButton href="\/contact" data-testid="link-cognios-demo-hero">Book a demo/);
  assert.match(source, /<BrandButton href="\/contact" data-testid="link-cognios-demo-closing">Book a demo/);
  assert.match(source, /href="#architecture"[^>]*>See the architecture/);
  assert.match(source, /id="architecture"[\s\S]*?<ArchitectureStage \/>/);
});

test("in-page architecture retains stacked L0, twin spines, L1 side-by-side and L2 beneath", async () => {
  const stage = await readFile(new URL("../components/cognios/ArchitectureStage.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../components/cognios/ArchitectureStage.css", import.meta.url), "utf8");
  const app = await readFile(new URL("../App.tsx", import.meta.url), "utf8");
  assert.match(stage, /architectureLayers\.map\(\(layer\)/);
  assert.match(stage, /<Spine[\s\S]*side="left"[\s\S]*className="coas-layers"[\s\S]*<Spine[\s\S]*side="right"/);
  assert.match(stage, /className="coas-component-rail"/);
  assert.match(stage, /className="coas-comp-detail-wrap"/);
  assert.match(css, /\.coas-system-grid\s*\{[^}]*grid-template-columns/);
  assert.match(css, /\.coas-component-rail\s*\{[^}]*grid-template-columns/);
  assert.match(app, /path="\/platforms\/cognios\/architecture"><RedirectWithSearch to="\/platforms\/cognios"/);
  assert.match(app, /path="\/architecture"><RedirectWithSearch to="\/platforms\/cognios"/);
});