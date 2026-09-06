import { eq } from "drizzle-orm";
import { cmsMediaReferencesTable, db } from "@workspace/db";
import { mediaReferences } from "./media-references";

type CmsTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Preserves the exact asset version and field-path index across an immutable text-only snapshot. */
export async function copyRevisionMediaReferences(
  tx: CmsTransaction,
  sourceRevisionId: string,
  targetRevisionId: string,
  targetContent: unknown,
) {
  const expected = mediaReferences(targetContent);
  const current = await tx.select().from(cmsMediaReferencesTable)
    .where(eq(cmsMediaReferencesTable.revisionId, sourceRevisionId));
  const expectedIdentity = expected.map((reference) => `${reference.mediaId}:${reference.fieldPath}`).sort();
  const currentIdentity = current.map((reference) => `${reference.mediaId}:${reference.fieldPath}`).sort();
  if (JSON.stringify(expectedIdentity) !== JSON.stringify(currentIdentity)) {
    throw new Error("Immutable revision media references changed unexpectedly");
  }
  if (!current.length) return;
  await tx.insert(cmsMediaReferencesTable).values(current.map((reference) => ({
    mediaId: reference.mediaId,
    mediaVersion: reference.mediaVersion,
    revisionId: targetRevisionId,
    fieldPath: reference.fieldPath,
  })));
}