import type { MediaMigrationOperation } from "./migration.js";

export interface ExpectedReceipt {
  requestDigest: string;
  acceptedRequestDigests?: string[];
  subjectType: "document" | "media";
  tolerateDigestDrift?: boolean;
  optional?: boolean;
  sameSubjectAs?: string;
  media?: MediaMigrationOperation;
  publishCase?: boolean;
  publishEducationSuccessor?: boolean;
  expectedNormalizedPayloadDigest?: string;
  expectedImage?: unknown;
  expectedImageAlt?: unknown;
  educationMedia?: MediaMigrationOperation[];
}

export type EducationReconciliationStatus =
  | "published"
  | "reused"
  | "preserved-editorial"
  | "new-draft"
  | "pending-cutover";

export function educationReconciliationOutcome(input: {
  receiptOperation: string | undefined;
  publishedComplete: boolean;
  exactPayload: boolean;
  publishedAuthority?: boolean;
  freshDraftComplete: boolean;
  hasLiveRevision: boolean;
}): { valid: boolean; status?: EducationReconciliationStatus; message: string } {
  switch (input.receiptOperation) {
    case "cms.inventory.education-successor-published":
      if (input.publishedComplete && input.exactPayload) {
        return { valid: true, status: "published", message: "approved successor is published" };
      }
      return input.publishedAuthority && input.exactPayload
        ? { valid: true, status: "pending-cutover", message: "approved successor authority is preserved while its reviewed hero awaits immutable-media cutover" }
        : { valid: false, message: "published successor pointer, payload, or immutable pin is incomplete" };
    case "cms.inventory.education-successor-pending-cutover":
      if (input.publishedComplete) {
        return input.exactPayload
          ? { valid: true, status: "published", message: "successor completed the approved immutable-media cutover" }
          : { valid: false, message: "cutover publication does not match governed authority" };
      }
      return input.exactPayload && input.freshDraftComplete
        ? { valid: true, status: "pending-cutover", message: "successor draft is awaiting the approved immutable-media cutover" }
        : { valid: false, message: "successor draft awaiting cutover is missing or does not match governed authority" };
    case "cms.inventory.industry-contract-baseline-reused":
      if (input.publishedComplete && input.exactPayload) {
        return { valid: true, status: "reused", message: "approved successor publication was reused" };
      }
      return input.publishedAuthority && input.exactPayload
        ? { valid: true, status: "pending-cutover", message: "approved baseline authority is preserved while its reviewed hero awaits immutable-media cutover" }
        : { valid: false, message: "reused successor no longer matches its approved publication" };
    case "cms.inventory.industry-contract-editorial-preserved":
      return input.hasLiveRevision
        ? { valid: true, status: "preserved-editorial", message: "newer editorial authority was preserved" }
        : { valid: false, message: "preserved editorial authority is missing" };
    case "cms.inventory.import":
      if (!input.exactPayload) {
        return { valid: false, message: "fresh Education draft does not match governed authority" };
      }
      if (input.publishedComplete) {
        return {
          valid: true,
          status: "published",
          message: "fresh governed draft completed the approved immutable-media cutover",
        };
      }
      return input.freshDraftComplete
        ? { valid: true, status: "new-draft", message: "fresh Education successor remains a review draft" }
        : { valid: false, message: "fresh Education draft is missing or was implicitly approved without a complete cutover" };
    default:
      return { valid: false, message: `unsupported Education receipt outcome ${input.receiptOperation ?? "(missing)"}` };
  }
}

export interface ReceiptSummaryInput {
  idempotencyKey: string;
  requestDigest: string;
  subjectId: string;
  operation?: string;
}

export function toleratesDocumentReceiptDigestDrift(
  operation: { externalId: string; idempotencyKey: string; kind: string },
  governedExternalIds: ReadonlySet<string>,
) {
  return governedExternalIds.has(operation.externalId)
    // The original People inventory is a one-time seed, not continuing
    // authority over biographies or later historical-copy recovery. The
    // importer preserves an existing receipt and document on digest drift.
    // Do not extend this to availability/governance or successor operations.
    || (operation.kind === "person"
      && operation.idempotencyKey === `cms-inventory-v2:${operation.externalId}`)
    || operation.kind === "industry"
    || operation.idempotencyKey.startsWith("cms-case-study-baseline-v1:")
    || operation.idempotencyKey.startsWith("cms-case-study-baseline-v2:");
}

export function requiresPublishedCaseSnapshot(
  expectation: ExpectedReceipt | undefined,
  receipt: ReceiptSummaryInput,
) {
  return expectation?.publishCase === true
    && expectation.subjectType === "document"
    && receipt.operation === "cms.inventory.case-study-summary-published";
}

export function inspectReceiptCoverage(
  expected: Map<string, ExpectedReceipt>,
  receipts: ReceiptSummaryInput[],
) {
  const relevantReceipts = receipts.filter((receipt) => expected.has(receipt.idempotencyKey));
  const relevantByKey = new Map(relevantReceipts.map((receipt) => [receipt.idempotencyKey, receipt]));
  const conflicts: Array<{ idempotencyKey: string; expectedDigest: string; actualDigest: string }> = [];
  const invalid: string[] = [];

  for (const receipt of relevantReceipts) {
    const operation = expected.get(receipt.idempotencyKey)!;
    const digestAccepted = operation.acceptedRequestDigests
      ? operation.acceptedRequestDigests.includes(receipt.requestDigest)
      : receipt.requestDigest === operation.requestDigest;
    if (!digestAccepted && !operation.tolerateDigestDrift) {
      conflicts.push({
        idempotencyKey: receipt.idempotencyKey,
        expectedDigest: operation.requestDigest,
        actualDigest: receipt.requestDigest,
      });
    }
    if (operation.sameSubjectAs) {
      const replacement = relevantByKey.get(operation.sameSubjectAs);
      if (replacement && replacement.subjectId !== receipt.subjectId) {
        invalid.push(
          `${receipt.idempotencyKey}: historical and replacement receipts resolve to different media assets`,
        );
      }
    }
  }

  const missingCount = [...expected.entries()]
    .filter(([idempotencyKey, operation]) =>
      !operation.optional && !relevantByKey.has(idempotencyKey)
    ).length;
  return { relevantReceipts, conflicts, invalid, missingCount };
}