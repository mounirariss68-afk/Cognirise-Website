import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  AUTO_DATA_PIPELINE,
  AUTODATA_CAPABILITIES,
  AUTODATA_DEEP_DIVES,
} from "../lib/autoDataContent";

test("Datatoolpack AutoData fulfills content contract", async () => {
  const content = await readFile(new URL("./DatatoolpackAutoData.tsx", import.meta.url), "utf8");
  const modelContent = await readFile(new URL("../lib/autoDataContent.ts", import.meta.url), "utf8");
  const styles = await readFile(new URL("../index.css", import.meta.url), "utf8");
  
  const allContent = content + "\n" + modelContent;
  
  assert.equal(AUTO_DATA_PIPELINE.length, 8);
  for (const stage of AUTO_DATA_PIPELINE) {
    assert.ok(stage.name);
    assert.ok(stage.purpose);
    assert.ok(stage.rawInput);
    assert.ok(stage.metadata);
    assert.ok(stage.output);
    assert.match(stage.source, /Partner-supplied briefing/);
    assert.equal(stage.claimStatus, "Partner-supplied mechanism");
  }
  
  assert.doesNotMatch(content, /From heterogeneous asset names to one canonical measurement/i);
  assert.doesNotMatch(content, /Signal convergence/i);

  assert.match(allContent, /replaying that state at inference rather than refitting/i);
  assert.match(allContent, /files[\s\S]*warehouses[\s\S]*streams[\s\S]*telemetry/i);
  assert.match(allContent, /existing ML or AutoML platform/i);
  assert.match(allContent, /Model training remains in the customer’s existing ML platform/i);

  for (const capability of ["profiling", "cleaning", "feature", "outlier", "workflow", "export", "connector", "deployment boundary"]) {
    assert.match(JSON.stringify(AUTODATA_CAPABILITIES).toLowerCase(), new RegExp(capability));
  }

  assert.match(content, /role="tablist"/);
  assert.match(content, /aria-orientation="vertical"/);
  assert.match(content, /ArrowRight/);
  assert.match(content, /ArrowLeft/);
  assert.match(content, /Home/);
  assert.match(content, /End/);
  assert.match(content, /autodata-pipeline-linear/);
  assert.match(content, /list-pipeline-linear/);
  assert.doesNotMatch(content, /Source & claim status/);
  assert.match(content, /hidden=\{activeStage !== index\}/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(styles, /\.autodata-pipeline-interactive/);
  assert.match(styles, /\.autodata-pipeline-linear/);

  for (const removedCustomerFacingCopy of [
    "Evidence register",
    "Publication and claim register",
    "Official partner sources verified",
    "Supplied AutoData briefing",
    "Relationship boundary",
    "not a Cognirise product",
    "independent Cognirise validation",
    "Alliance boundary",
  ]) {
    assert.doesNotMatch(content, new RegExp(removedCustomerFacingCopy, "i"));
  }

  assert.match(content, /Collaborative delivery/);
  assert.match(content, /Together, the teams provide a clear route from specialist capability to accountable enterprise delivery/);
  assert.equal(AUTODATA_DEEP_DIVES.length, 2);
  assert.deepEqual(
    AUTODATA_DEEP_DIVES.map((link) => link.url),
    ["https://datatoolpack.com/", "https://autodata.datatoolpack.com/"],
  );
  assert.match(content, /link-deep-dive-/);

  assert.match(content, /data-testid="card-autodata-stack"/);
  assert.match(content, /data-testid="content-autodata-stack"/);
  assert.match(styles, /\.autodata-stack-card\s*\{[\s\S]*min-height:/);
  assert.match(styles, /\.autodata-stack-card-content\s*\{[\s\S]*padding:/);
  assert.match(styles, /@media \(min-width: 768px\)[\s\S]*\.autodata-stack-card-content/);
  assert.match(styles, /@media \(min-width: 1024px\)[\s\S]*\.autodata-stack-card-content/);

  const renderedContent = content + JSON.stringify(AUTO_DATA_PIPELINE) + JSON.stringify(AUTODATA_CAPABILITIES);
  for (const prohibited of ["SpaceX", "LinkedIn", "Ipsos", "PayPal", "30+ native connectors", "zero train-serve skew", "guarantees consistency"]) {
    assert.doesNotMatch(renderedContent.toLowerCase(), new RegExp(prohibited.toLowerCase().replace(/[+]/g, "\\+")));
  }
});

test("the bespoke route cannot fall back to the generic alliance template", async () => {
  const app = await readFile(new URL("../App.tsx", import.meta.url), "utf8");
  assert.match(app, /<Route path="\/platforms\/datatoolpack" component=\{DatatoolpackAutoData\} \/>/);
  assert.doesNotMatch(app, /<AlliancePlatformDetail slug="datatoolpack"/);
  assert.match(app, /<AlliancePlatformDetail slug="lupitor"/);
  assert.match(app, /<AlliancePlatformDetail slug="bunjee-ai"/);
});
