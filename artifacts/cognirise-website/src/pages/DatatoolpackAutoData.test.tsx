import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  AUTODATA_CONTENT_GOVERNANCE,
  AUTO_DATA_PIPELINE,
  AUTODATA_CAPABILITIES,
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
  
  // Fleet example
  assert.match(allContent, /WTG_01\.ActPwr/);
  assert.match(allContent, /INV_A3\.P_AC_kW/);
  assert.match(allContent, /BESS\.RackPower/);
  assert.match(allContent, /PLT_NET_MW/);
  assert.match(allContent, /Net output/);

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
  assert.match(content, /Source & claim status/);
  assert.match(content, /hidden=\{activeStage !== index\}/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(styles, /\.autodata-pipeline-interactive/);
  assert.match(styles, /\.autodata-pipeline-linear/);

  const classifications = new Set(AUTODATA_CONTENT_GOVERNANCE.map((record) => record.classification));
  assert.deepEqual(classifications, new Set(["explanatory-copy", "partner-supplied-claim", "approved-evidence"]));
  const withheld = AUTODATA_CONTENT_GOVERNANCE.find((record) => record.publicationStatus === "withheld");
  assert.ok(withheld);
  assert.match(withheld.note, /named customers/i);
  assert.match(withheld.note, /benchmarks/i);

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
