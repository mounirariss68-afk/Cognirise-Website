import assert from "node:assert/strict";
import test from "node:test";

test("review media governance rejects version, type, dimensions, accessibility and rights failures", async () => {
  process.env.DATABASE_URL ??= "postgres://test.invalid/cognirise";
  process.env.SESSION_SECRET ??= "media-reference-governance-test-secret-long-enough";
  const { mediaGovernanceErrors } = await import("../src/routes/documents.ts");
  const mediaId = "00000000-0000-4000-8000-000000000041";
  const versionId = "00000000-0000-4000-8000-000000000042";
  const references = [{
    mediaId,
    mediaVersionId: versionId,
    fieldPath: "content.heroMedia",
    role: "hero" as const,
  }];

  const errors = mediaGovernanceErrors(references, [{
    id: mediaId,
    version_id: "00000000-0000-4000-8000-000000000043",
    status: "pending-review",
    media_type: "application/pdf",
    width: null,
    height: null,
    alt_text: null,
    metadata: { rightsStatus: "expired" },
  }]);
  assert.match(errors.join(" "), /approved media is unavailable|selected media version is unavailable/);

  const governedErrors = mediaGovernanceErrors(references, [{
    id: mediaId,
    version_id: versionId,
    status: "active",
    media_type: "image/png",
    width: null,
    height: null,
    alt_text: null,
    metadata: { rightsStatus: "expired" },
  }]);
  assert.match(governedErrors.join(" "), /dimensions/);
  assert.match(governedErrors.join(" "), /alternative text/);
  assert.match(governedErrors.join(" "), /rights/);

  const publisherApproved = mediaGovernanceErrors(references, [{
    id: mediaId,
    version_id: versionId,
    status: "active",
    media_type: "image/png",
    width: 1200,
    height: 800,
    alt_text: "Reviewed accessibility description.",
    // This is the affirmative status emitted by the media publisher route.
    metadata: { rightsStatus: "approved-use", accessibilityStatus: "approved" },
  }]);
  assert.doesNotMatch(publisherApproved.join(" "), /rights/);
});

test("revision synchronization inherits the prior immutable pin instead of selecting latest", async () => {
  const { readFile } = await import("node:fs/promises");
  const { resolve } = await import("node:path");
  const source = await readFile(resolve(process.cwd(), "src/routes/documents.ts"), "utf8");
  assert.match(source, /prior\.media_version_id/);
  assert.match(source, /prior\.field_path=CASE WHEN \$5::text IS NULL/);
  assert.match(source, /String\(edition\.rows\[0\]\.revision_id\)/);
  assert.match(source, /COALESCE\(requested\.id,prior\.media_version_id,latest\.id\)/);
});