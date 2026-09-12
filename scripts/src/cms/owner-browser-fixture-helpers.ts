export interface FixtureDocumentIdentity {
  id: string;
  slug: string;
}

export function resolveFixtureDocuments(
  state: { prefix: string; documents: FixtureDocumentIdentity[] },
  relatedDocuments: Array<{ id: string; canonical_slug: string | null }>,
  prefixedDocuments: Array<{ id: string; canonical_slug: string | null }>,
): FixtureDocumentIdentity[] {
  const documentMap = new Map(state.documents.map((document) => [document.id, document.slug]));
  for (const row of relatedDocuments) {
    if (!row.canonical_slug || !row.canonical_slug.startsWith(state.prefix)) {
      throw new Error(
        "Refusing cleanup because a fixture user is associated with a non-fixture document.",
      );
    }
    documentMap.set(row.id, row.canonical_slug);
  }
  for (const row of prefixedDocuments) {
    if (!documentMap.has(row.id)) {
      throw new Error(
        "Refusing cleanup because a prefixed document is not linked to this fixture's exact identities.",
      );
    }
  }
  return [...documentMap.entries()].map(([id, slug]) => ({ id, slug }));
}