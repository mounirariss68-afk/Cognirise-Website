import assert from "node:assert/strict";
import test from "node:test";
import { validateHomepageIndustrySelections } from "../src/lib/homepage-industry-governance";

const homepage = (industryIds?: string[]) => ({
  slug: "home",
  title: "Home",
  content: {
    pagePath: "/",
    sections: [
      { type: "narrative", id: "home-industries", industryIds },
    ],
  },
});

test("homepage Industry IDs require published availability in the exact market and locale", async () => {
  let queriedSql = "";
  let queriedValues: unknown[] = [];
  const result = await validateHomepageIndustrySelections({
    query: async (sql, values) => {
      queriedSql = sql;
      queriedValues = values ?? [];
      return { rows: [{ canonical_slug: "education" }] };
    },
  }, homepage(["education", "telecoms"]), "ksa", "ar");

  assert.equal(result.success, false);
  if (!result.success) {
    assert.deepEqual(result.issues.map((issue) => issue.path), [
      "content.sections.0.industryIds.1",
    ]);
    assert.match(result.issues[0].message, /not published and available in the exact ksa\/ar edition/);
    assert.match(result.errors[0], /^content\.sections\.0\.industryIds\.1:/);
  }
  assert.deepEqual(queriedValues, [["education", "telecoms"], "ksa", "ar"]);
  assert.match(queriedSql, /e\.market=\$2 AND e\.locale=\$3/);
  assert.match(queriedSql, /e\.publication_state='published'/);
  assert.match(queriedSql, /r\.workflow_state='approved'/);
  assert.match(queriedSql, /published_decision IS DISTINCT FROM 'off'/);
  assert.match(queriedSql, /cms_market_edition_bindings/);
  assert.match(queriedSql, /resolved\.cms_revision_id/);
  assert.doesNotMatch(queriedSql, /fallback_chain|navigationCandidates/);
});

test("legacy homepage revisions without Industry IDs remain valid without a query", async () => {
  let queryCount = 0;
  const result = await validateHomepageIndustrySelections({
    query: async () => {
      queryCount += 1;
      return { rows: [] };
    },
  }, homepage(), "uae", "en");

  assert.deepEqual(result, { success: true });
  assert.equal(queryCount, 0);
});