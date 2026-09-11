import assert from "node:assert/strict";
import test from "node:test";

test("a publisher may release unchanged shared-person availability but not a changed matrix", {
  concurrency: false,
}, async (t) => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  const previousSessionSecret = process.env.SESSION_SECRET;
  process.env.DATABASE_URL = "postgres://test.invalid/cognirise";
  process.env.SESSION_SECRET = "person-shared-availability-publish-test-session-secret";
  t.after(() => {
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
    if (previousSessionSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previousSessionSecret;
  });

  const {
    availabilitySelectionKeysMatchDestinations,
    reviewedAvailabilityDiffersFromPublished,
  } = await import("../src/routes/documents.ts");
  const reviewed = [
    { marketEditionId: "ksa-id", locale: "en", decision: "show" as const },
    { marketEditionId: "uae-id", locale: "ar", decision: "off" as const },
  ];

  assert.equal(
    reviewedAvailabilityDiffersFromPublished(reviewed, [
      { marketEditionId: "ksa-id", locale: "en", decision: "show" },
      { marketEditionId: "uae-id", locale: "ar", decision: "off" },
    ]),
    false,
    "content-only release keeps the existing person destination matrix and remains publisher-eligible",
  );
  assert.equal(
    reviewedAvailabilityDiffersFromPublished(reviewed, [
      { marketEditionId: "ksa-id", locale: "en", decision: "show" },
      { marketEditionId: "uae-id", locale: "ar", decision: "show" },
    ]),
    true,
    "a changed reviewed person destination decision requires an administrator",
  );
  assert.equal(
    reviewedAvailabilityDiffersFromPublished(
      [{ marketEditionId: "ksa-id", locale: "en", decision: "show" }],
      [],
    ),
    true,
    "a missing live decision is inherit, so publishing show is a protected change",
  );

  const reviewedMatrix = [
    { marketEditionId: "ksa-id", locale: "en", decision: "show" as const },
    { marketEditionId: "ksa-id", locale: "ar", decision: "off" as const },
  ];
  assert.equal(
    availabilitySelectionKeysMatchDestinations(reviewedMatrix, [
      { id: "ksa-id", locale: "en" },
      { id: "ksa-id", locale: "ar" },
      { id: "uae-id", locale: "en" },
    ]),
    false,
    "an enabled market added after review makes the reviewed matrix stale",
  );
  assert.equal(
    availabilitySelectionKeysMatchDestinations(reviewedMatrix, [
      { id: "ksa-id", locale: "en" },
      { id: "ksa-id", locale: "ar" },
      { id: "ksa-id", locale: "fr" },
    ]),
    false,
    "a locale added to an existing enabled market makes the reviewed matrix stale",
  );
  assert.equal(
    availabilitySelectionKeysMatchDestinations(reviewedMatrix, [
      { id: "ksa-id", locale: "en" },
      { id: "ksa-id", locale: "ar" },
    ]),
    true,
    "a reviewed matrix is publishable only when every current destination key matches once",
  );
});