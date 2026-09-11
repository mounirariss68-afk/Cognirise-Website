import assert from "node:assert/strict";
import { test } from "node:test";
import { bankingPovSchema } from "@workspace/api-zod";
import { bankingPov } from "./banking";

test("Banking POV keeps the contracted banking structure complete", () => {
  const validation = bankingPovSchema.safeParse(bankingPov);
  assert.equal(validation.success, true, validation.success ? undefined : validation.error.message);
  assert.equal(bankingPov.version, 1);
  assert.equal(bankingPov.market, "uae");
  assert.equal(bankingPov.adoptionLevels.length, 3);
  assert.deepEqual(bankingPov.adoptionLevels.map((item) => item.level), [1, 2, 3]);
  assert.equal(bankingPov.valueOutcomes.length, 3);
  assert.equal(bankingPov.valueDomains.length, 6);
  assert.equal(new Set(bankingPov.valueDomains.map((item) => item.id)).size, 6);
  assert.equal(bankingPov.startingPoints.length, 4);
  assert.equal(new Set(bankingPov.startingPoints.map((item) => item.id)).size, 4);
  assert.equal(bankingPov.voiceBanking.journeys.length, 7);
  assert.equal(new Set(bankingPov.voiceBanking.journeys.map((item) => item.id)).size, 7);
  assert.equal(bankingPov.caseMembershipSnapshot.length, 8);
});

test("Banking evidence is associated with top-level sources and UAE content stays market-specific", () => {
  for (const evidence of bankingPov.evidenceSignals) {
    assert.match(evidence.url, /^https:\/\//);
    assert.ok(evidence.qualification);
  }

  const uaeCopy = JSON.stringify(bankingPov);
  assert.match(uaeCopy, /\bUAE\b|United Arab Emirates/);
  assert.doesNotMatch(uaeCopy, /Saudi|SAMA|Kingdom/i);
});

test("Banking content uses immutable media and avoids unqualified deck outcomes", () => {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const media = [
    ...bankingPov.startingPoints.map((item) => item.image),
    bankingPov.productionReadiness.image,
  ];
  for (const item of media) {
    assert.match(item.mediaId, uuid);
    assert.match(item.mediaVersionId, uuid);
    assert.equal(item.role, "supporting");
    assert.ok(item.altText);
  }

  const copy = JSON.stringify(bankingPov);
  for (const unsupportedFigure of ["+30%", "+50%", "+70%", "45–60 minutes", "100% auditable", "60% marketing", "sub-0.05%", "80+ languages", "under two seconds", "one-week tailored demo"]) {
    assert.doesNotMatch(copy, new RegExp(unsupportedFigure.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  }
});