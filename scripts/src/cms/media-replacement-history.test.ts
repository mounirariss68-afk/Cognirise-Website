import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  historicalMediaReceipts,
  mediaMigrationOperations,
} from "./migration.js";
import {
  inspectReceiptCoverage,
  requiresPublishedCaseSnapshot,
  toleratesDocumentReceiptDigestDrift,
  type ExpectedReceipt,
  type ReceiptSummaryInput,
} from "./receipt-reconciliation.js";
import {
  mediaRefreshReceiptDigestIsAccepted,
  resolveMediaImportAssetId,
  resolveMissingLegacyMediaSubjectRecoveryId,
} from "./media-import-lineage.js";
import type { InventoryRecord } from "./common.js";

const replacementRecord = {
  externalId: "asset:302ea3c4bf1fbfb78fed",
  type: "asset",
  name: "pulse-hero.jpg",
  sourceFile: "artifacts/cognirise-website/public/images/cognirise/pulse-hero.jpg",
  fields: {
    publicPath: "/images/cognirise/pulse-hero.jpg",
    checksum: "0c0053392fe1823f2aafe053711bd07114cb4153dd8552a362a5ac2b2c8653b4",
    mimeType: "image/jpeg",
    bytes: 1,
    cmsOwnership: "cms-candidate",
    collection: "website",
    usages: [],
    accessibility: { altText: "Pulse hero" },
    rights: { owner: "Cognirise" },
  },
  review: { status: "needs-review", reasons: [] },
} as unknown as InventoryRecord;

test("accepted replacement history keeps the original receipt and versions the current binary", () => {
  const [operation] = mediaMigrationOperations([replacementRecord]);
  const historical = historicalMediaReceipts([replacementRecord]);

  assert.equal(
    operation.idempotencyKey,
    `cms-media-binary-v1:${replacementRecord.externalId}:${replacementRecord.fields.checksum}`,
  );
  assert.equal(historical[0].idempotencyKey, `cms-media-inventory-v3:${replacementRecord.externalId}`);
  assert.equal(
    historical[1].idempotencyKey,
    `cms-media-replacement-v1:${replacementRecord.externalId}:${replacementRecord.fields.checksum}`,
  );
  assert.notEqual(historical[0].requestDigest, operation.requestDigest);
});

test("another binary change requires a new explicit replacement classification", () => {
  const changed = structuredClone(replacementRecord);
  changed.fields.checksum = "another-checksum";
  assert.throws(
    () => mediaMigrationOperations([changed]),
    /add a new explicit media replacement operation/,
  );
});

function replacementExpectations() {
  const [operation] = mediaMigrationOperations([replacementRecord]);
  const historical = historicalMediaReceipts([replacementRecord]);
  return {
    operation,
    historical,
    expected: new Map<string, ExpectedReceipt>([
      [operation.idempotencyKey, {
        requestDigest: operation.requestDigest,
        subjectType: "media",
      }],
      ...historical.map((receipt) => [receipt.idempotencyKey, {
        requestDigest: receipt.requestDigest,
        acceptedRequestDigests: receipt.acceptedRequestDigests,
        subjectType: "media" as const,
        optional: true,
        sameSubjectAs: operation.idempotencyKey,
      }] as const),
    ]),
  };
}

test("a fresh database requires only the current replacement operation", () => {
  const { expected } = replacementExpectations();
  const coverage = inspectReceiptCoverage(expected, []);

  assert.equal(coverage.missingCount, 1);
  assert.deepEqual(coverage.conflicts, []);
  assert.deepEqual(coverage.invalid, []);
});

test("an upgraded database accepts exact historical evidence without rewriting it", () => {
  const { expected, historical: [historical], operation } = replacementExpectations();
  const receipts: ReceiptSummaryInput[] = [
    {
      idempotencyKey: historical.idempotencyKey,
      requestDigest: historical.requestDigest,
      subjectId: "media-1",
    },
    {
      idempotencyKey: operation.idempotencyKey,
      requestDigest: operation.requestDigest,
      subjectId: "media-1",
    },
  ];
  const coverage = inspectReceiptCoverage(expected, receipts);

  assert.equal(coverage.missingCount, 0);
  assert.deepEqual(coverage.conflicts, []);
  assert.deepEqual(coverage.invalid, []);
});

test("unknown pre-upgrade history and split asset lineage are explicit defects", () => {
  const { expected, historical: [historical], operation } = replacementExpectations();
  const unknownHistory = inspectReceiptCoverage(expected, [
    {
      idempotencyKey: historical.idempotencyKey,
      requestDigest: "unclassified-history",
      subjectId: "old-media",
    },
    {
      idempotencyKey: operation.idempotencyKey,
      requestDigest: operation.requestDigest,
      subjectId: "old-media",
    },
  ]);
  assert.equal(unknownHistory.missingCount, 0);
  assert.equal(unknownHistory.conflicts.length, 1);

  const splitLineage = inspectReceiptCoverage(expected, [
    {
      idempotencyKey: historical.idempotencyKey,
      requestDigest: historical.requestDigest,
      subjectId: "old-media",
    },
    {
      idempotencyKey: operation.idempotencyKey,
      requestDigest: operation.requestDigest,
      subjectId: "replacement-media",
    },
  ]);

  assert.equal(splitLineage.missingCount, 0);
  assert.deepEqual(splitLineage.conflicts, []);
  assert.match(splitLineage.invalid[0], /different media assets/);
});

test("an upgrade resolves the replacement through the historical asset", () => {
  const { historical: [historical], operation } = replacementExpectations();
  const assetId = resolveMediaImportAssetId({
    historicalReceipts: [{
      receipt: {
        subjectId: "existing-media",
        requestDigest: historical.requestDigest,
      },
      acceptedDigests: historical.acceptedRequestDigests,
    }],
  });

  assert.equal(assetId, "existing-media");
  assert.equal(historical.replacementIdempotencyKey, operation.idempotencyKey);
});

test("the importer rejects unknown history and split receipt lineage", () => {
  const { historical: [historical] } = replacementExpectations();
  assert.throws(
    () => resolveMediaImportAssetId({
      historicalReceipts: [{
        receipt: {
          subjectId: "existing-media",
          requestDigest: "unknown-history",
        },
        acceptedDigests: historical.acceptedRequestDigests,
      }],
    }),
    /digest is not accepted/,
  );
  assert.throws(
    () => resolveMediaImportAssetId({
      currentReceipt: {
        subjectId: "duplicate-media",
        requestDigest: "current",
      },
      historicalReceipts: [{
        receipt: {
          subjectId: "existing-media",
          requestDigest: historical.requestDigest,
        },
        acceptedDigests: historical.acceptedRequestDigests,
      }],
    }),
    /different media assets/,
  );
});

test("the importer can recreate one accepted missing legacy subject without rewriting its receipt", () => {
  const { historical: [historical] } = replacementExpectations();
  const historicalReceipt = {
    subjectId: "deleted-legacy-media",
    requestDigest: historical.requestDigest,
  };
  assert.equal(resolveMissingLegacyMediaSubjectRecoveryId({
    historicalReceipts: [{
      receipt: historicalReceipt,
      acceptedDigests: historical.acceptedRequestDigests,
    }],
  }), historicalReceipt.subjectId);
  assert.throws(
    () => resolveMissingLegacyMediaSubjectRecoveryId({
      currentReceipt: {
        subjectId: "deleted-current-media",
        requestDigest: "current",
      },
      historicalReceipts: [{
        receipt: historicalReceipt,
        acceptedDigests: historical.acceptedRequestDigests,
      }],
    }),
    /Current media receipt subject is missing/,
  );
  assert.throws(
    () => resolveMissingLegacyMediaSubjectRecoveryId({
      historicalReceipts: [
        {
          receipt: historicalReceipt,
          acceptedDigests: historical.acceptedRequestDigests,
        },
        {
          receipt: historicalReceipt,
          acceptedDigests: historical.acceptedRequestDigests,
        },
      ],
    }),
    /ambiguous replacement history/,
  );
});

test("a pre-versioning governed refresh receipt remains valid without rewriting it", () => {
  const { operation } = replacementExpectations();
  const priorChecksumQualifiedDigest = createHash("sha256").update(JSON.stringify({
    externalId: operation.externalId,
    idempotencyKey: `cms-media-inventory-v3:${operation.externalId}`,
    checksum: operation.checksum,
    mimeType: operation.mimeType,
    byteSize: operation.byteSize,
    width: operation.width,
    height: operation.height,
  })).digest("hex");
  const legacyInventoryDigest = createHash("sha256").update(JSON.stringify({
    externalId: operation.externalId,
    idempotencyKey: `cms-media-inventory-v3:${operation.externalId}`,
    filename: operation.filename,
    sourceFile: operation.sourceFile,
    publicPath: operation.publicPath,
    checksum: operation.checksum,
    mimeType: operation.mimeType,
    byteSize: operation.byteSize,
    width: operation.width,
    height: operation.height,
    cmsOwnership: operation.cmsOwnership,
    usages: operation.usages,
  })).digest("hex");
  assert.equal(operation.acceptedPriorRequestDigests.length > 0, true);
  assert.equal(operation.acceptedPriorRequestDigests.includes(priorChecksumQualifiedDigest), true);
  assert.equal(operation.acceptedPriorRequestDigests.includes(legacyInventoryDigest), true);
  assert.equal(mediaRefreshReceiptDigestIsAccepted({
    actualDigest: legacyInventoryDigest,
    currentDigest: operation.requestDigest,
    acceptedPriorDigests: operation.acceptedPriorRequestDigests,
  }), true);
  assert.equal(mediaRefreshReceiptDigestIsAccepted({
    actualDigest: "unknown-digest",
    currentDigest: operation.requestDigest,
    acceptedPriorDigests: operation.acceptedPriorRequestDigests,
  }), false);
});

test("case publication validation follows the immutable receipt outcome", () => {
  const expectation: ExpectedReceipt = {
    requestDigest: "case-digest",
    subjectType: "document",
    publishCase: true,
  };
  assert.equal(requiresPublishedCaseSnapshot(expectation, {
    idempotencyKey: "case",
    requestDigest: "case-digest",
    subjectId: "case-document",
    operation: "cms.inventory.case-study-summary-published",
  }), true);
  assert.equal(requiresPublishedCaseSnapshot(expectation, {
    idempotencyKey: "case",
    requestDigest: "case-digest",
    subjectId: "case-document",
    operation: "cms.inventory.import",
  }), false);
  assert.equal(requiresPublishedCaseSnapshot(expectation, {
    idempotencyKey: "case",
    requestDigest: "case-digest",
    subjectId: "case-document",
    operation: "cms.inventory.case-study-baseline-preserved",
  }), false);
});

test("intentional governed industry digest drift remains reconcilable across contract versions", () => {
  const idempotencyKey = "cms-industry-contract-v12:industry:financial-services";
  const tolerateDigestDrift = toleratesDocumentReceiptDigestDrift({
    externalId: "industry:financial-services",
    idempotencyKey,
    kind: "industry",
  }, new Set());
  const coverage = inspectReceiptCoverage(new Map([
    [idempotencyKey, {
      requestDigest: "current-inventory-digest",
      subjectType: "document",
      tolerateDigestDrift,
    }],
  ]), [{
    idempotencyKey,
    requestDigest: "preserved-receipt-digest",
    subjectId: "financial-services-document",
  }]);

  assert.equal(tolerateDigestDrift, true);
  assert.deepEqual(coverage.conflicts, []);
  assert.equal(coverage.missingCount, 0);
});

test("a base-version current-binary receipt upgrades on the existing asset", () => {
  const { expected, historical: [historical], operation } = replacementExpectations();
  const priorUnversionedRequestDigest = historical.acceptedRequestDigests.find(
    (item) => item !== historical.requestDigest,
  ) ?? historical.requestDigest;
  const legacyReceipt = {
    idempotencyKey: historical.idempotencyKey,
    subjectId: "existing-current-media",
    requestDigest: priorUnversionedRequestDigest,
  };
  assert.equal(resolveMediaImportAssetId({
    historicalReceipts: [{
      receipt: legacyReceipt,
      acceptedDigests: historical.acceptedRequestDigests,
    }],
  }), "existing-current-media");

  const coverage = inspectReceiptCoverage(expected, [
    legacyReceipt,
    {
      idempotencyKey: operation.idempotencyKey,
      subjectId: "existing-current-media",
      requestDigest: operation.requestDigest,
    },
  ]);
  assert.equal(coverage.missingCount, 0);
  assert.deepEqual(coverage.conflicts, []);
  assert.deepEqual(coverage.invalid, []);
});

test("mutable usage changes do not alter checksum-qualified binary identity", () => {
  const before = mediaMigrationOperations([replacementRecord])[0];
  const afterRecord = structuredClone(replacementRecord);
  afterRecord.fields.usages = ["artifacts/cognirise-website/src/content/idao.ts"];
  const after = mediaMigrationOperations([afterRecord])[0];

  assert.equal(after.idempotencyKey, before.idempotencyKey);
  assert.equal(after.requestDigest, before.requestDigest);
  assert.deepEqual(
    after.historicalReceipts[0].requestDigest,
    before.historicalReceipts[0].requestDigest,
  );
  const receipt = {
    subjectId: "existing-media",
    requestDigest: before.historicalReceipts[0].requestDigest,
  };
  assert.equal(resolveMediaImportAssetId({
    currentReceipt: {
      subjectId: "existing-media",
      requestDigest: after.requestDigest,
    },
    historicalReceipts: [{
      receipt,
      acceptedDigests: after.historicalReceipts[0].acceptedRequestDigests,
    }],
  }), "existing-media");
});