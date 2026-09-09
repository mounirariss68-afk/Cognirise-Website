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
}

export interface ReceiptSummaryInput {
  idempotencyKey: string;
  requestDigest: string;
  subjectId: string;
  operation?: string;
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