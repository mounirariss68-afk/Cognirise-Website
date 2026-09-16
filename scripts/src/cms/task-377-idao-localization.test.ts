import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  task377AuthorizationRequestDigest,
  task377MediaPaths,
} from "./task-377-idao-localization.js";

test("Task 377 enumerates only approved stable market files", () => {
  const paths = task377MediaPaths();
  assert.equal(paths.length, 12);
  assert.equal(new Set(paths.map((item) => item.sourcePath)).size, 12);
  for (const item of paths) {
    assert.match(item.sourcePath, /^artifacts\/cognirise-website\/public\/images\/cognirise\/idao\/(ksa|turkiye|europe)\/(innovate|demonstrate|activate|operate)\.jpg$/);
  }
});

test("Task 377 stages drafts separately from its explicitly authorized release", () => {
  const source = readFileSync(new URL("./task-377-idao-localization.ts", import.meta.url), "utf8");
  assert.match(source, /workflow_state[^;]*'draft'/);
  assert.match(source, /normal-review-required/);
  assert.match(source, /No published pointer was changed/);
  assert.match(source, /publication_state='published'/);
  assert.match(source, /publish-successor/);
});

test("Task 377 binds exact immutable versions and revision-local alt text", () => {
  const source = readFileSync(new URL("./task-377-idao-localization.ts", import.meta.url), "utf8");
  assert.match(source, /media_version_id/);
  assert.match(source, /reference\.media_version_id/);
  assert.match(source, /altText: alt\(stage, market\)/);
  assert.match(source, /home-idao-stage-\$\{stage\}/);
});

test("Task 377 publish mode is explicitly authorized, exact-draft-only, and idempotent", () => {
  const source = readFileSync(new URL("./task-377-idao-localization.ts", import.meta.url), "utf8");
  assert.match(source, /--publish/);
  assert.match(source, /workflow_state !== "draft"/);
  assert.match(source, /rightsStatus: "approved-use"/);
  assert.match(source, /accessibilityStatus: "approved"/);
  assert.match(source, /cms-task-377:publish/);
  assert.match(source, /explicitUserAuthorization/);
  assert.match(source, /publication_state='published'/);
  assert.match(source, /schema-invalid publish successor/);
});

test("Task 377 successors use the current IDAO contract and dated first-party governance", () => {
  const source = readFileSync(new URL("./task-377-idao-localization.ts", import.meta.url), "utf8");
  assert.match(source, /idaoEditorial/);
  assert.match(source, /idaoHeroSeed/);
  assert.match(source, /idaoMediaInventory/);
  assert.match(source, /methodologyCanonicalSeed\("idao"\)/);
  assert.match(source, /Cognirise IDAO methodology canon/);
  assert.match(source, /Cognirise homepage source authority/);
  assert.match(source, /const governanceDate = "2026-09-16"/);
  assert.match(source, /type: "media"/);
  assert.match(source, /section\.sourcePath/);
});

test("Task 377 authorization is invalidated by candidate or release-target substitution", () => {
  const media = [{ market: "ksa", stage: "innovate", checksum: "approved-checksum" }] as const;
  const targets = [{
    market: "ksa",
    kind: "framework",
    slug: "idao",
    revisionId: "approved-revision",
    contentDigest: "approved-content",
  }];
  const approved = task377AuthorizationRequestDigest([...media], targets);
  assert.notEqual(
    task377AuthorizationRequestDigest([{ ...media[0], checksum: "substituted-checksum" }], targets),
    approved,
  );
  assert.notEqual(
    task377AuthorizationRequestDigest([...media], [{ ...targets[0], revisionId: "competing-revision" }]),
    approved,
  );
});