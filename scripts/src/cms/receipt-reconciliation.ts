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
}

export type EducationReconciliationStatus =
  | "published"
  | "reused"
  | "preserved-editorial"
  | "new-draft";

export function educationReconciliationOutcome(input: {
  receiptOperation: string | undefined;
  publishedComplete: boolean;
  exactPayload: boolean;
  freshDraftComplete: boolean;
  hasLiveRevision: boolean;
}): { valid: boolean; status?: EducationReconciliationStatus; message: string } {
  switch (input.receiptOperation) {
    case "cms.inventory.education-successor-published":
      return input.publishedComplete && input.exactPayload
        ? { valid: true, status: "published", message: "approved successor is published" }
        : { valid: false, message: "published successor pointer, payload, or immutable pin is incomplete" };
    case "cms.inventory.industry-contract-baseline-reused":
      return input.publishedComplete && input.exactPayload
        ? { valid: true, status: "reused", message: "approved successor publication was reused" }
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