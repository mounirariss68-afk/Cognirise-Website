export interface MediaReceiptLineage {
  subjectId: string;
  requestDigest: string;
}

export function resolveMediaImportAssetId(input: {
  currentReceipt?: MediaReceiptLineage;
  historicalReceipts?: Array<{
    receipt: MediaReceiptLineage;
    acceptedDigests: string[];
  }>;
}) {
  const historicalReceipts = input.historicalReceipts ?? [];
  for (const historical of historicalReceipts) {
    if (!historical.acceptedDigests.includes(historical.receipt.requestDigest)) {
      throw new Error("Historical media receipt digest is not accepted.");
    }
  }
  const subjectIds = new Set([
    ...(input.currentReceipt ? [input.currentReceipt.subjectId] : []),
    ...historicalReceipts.map((historical) => historical.receipt.subjectId),
  ]);
  if (subjectIds.size > 1) {
      throw new Error("Historical and replacement receipts resolve to different media assets.");
  }
  return input.currentReceipt?.subjectId ?? historicalReceipts[0]?.receipt.subjectId;
}

export function mediaRefreshReceiptDigestIsAccepted(input: {
  actualDigest: string;
  currentDigest: string;
  acceptedPriorDigests?: string[];
}) {
  return input.actualDigest === input.currentDigest
    || input.acceptedPriorDigests?.includes(input.actualDigest) === true;
}