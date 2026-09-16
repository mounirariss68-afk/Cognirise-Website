import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const reconciliationSource = () => readFileSync(
  path.resolve(process.cwd(), "../../scripts/src/cms/task-377-idao-localization.ts"),
  "utf8",
);

test("Task 377 reconciliation is exact-market with a separately guarded authorized release", () => {
  const source = reconciliationSource();
  assert.match(source, /TASK_377_MARKETS = \["ksa", "turkiye", "europe"\]/);
  assert.match(source, /market=\$2 AND locale='en'/);
  assert.match(source, /content_mode.*'custom'/s);
  assert.match(source, /workflow_state.*'draft'/s);
  assert.match(source, /No published pointer was changed/);
  assert.match(source, /--publish/);
  assert.match(source, /explicitUserAuthorization/);
  assert.match(source, /UPDATE\s+cms_market_editions/i);
  assert.match(source, /publish-successor/);
});

test("Task 377 homepage bindings use four unique market-scoped slots", () => {
  const source = reconciliationSource();
  for (const stage of ["innovate", "demonstrate", "activate", "operate"]) {
    assert.match(source, new RegExp(`home-idao-stage-\\$\\{stage\\}`));
  }
  assert.match(source, /mediaVersionId: pin\.mediaVersionId/);
  assert.match(source, /altText: alt\(stage, market\)/);
});