const mediaIdPattern = /^[A-Za-z0-9._-]{3,200}$/;

/** Finds stable media references while retaining the exact JSON field for impact analysis. */
export function mediaReferences(value: unknown, path = ""): Array<{ mediaId: string; fieldPath: string }> {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap((item, index) => mediaReferences(item, `${path}/${index}`));
  const record = value as Record<string, unknown>;
  const refs: Array<{ mediaId: string; fieldPath: string }> = [];
  for (const [key, child] of Object.entries(record)) {
    const childPath = `${path}/${key}`;
    if (["media", "portrait", "logo", "download", "openGraphImage", "asset"].includes(key) &&
      child && typeof child === "object" && !Array.isArray(child) &&
      mediaIdPattern.test(String((child as Record<string, unknown>).id ?? ""))) {
      refs.push({ mediaId: String((child as Record<string, unknown>).id), fieldPath: childPath });
    }
    refs.push(...mediaReferences(child, childPath));
  }
  return refs;
}