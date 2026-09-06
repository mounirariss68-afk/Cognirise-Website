type CmsPreviewUrlInput = {
  basePath: string;
  market: string;
  localizedSlug?: string | null;
  canonicalSlug?: string | null;
  routeKind?: string | null;
  token: string;
};

const validSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function buildCmsPreviewUrl({
  basePath,
  market,
  localizedSlug,
  canonicalSlug,
  routeKind,
  token,
}: CmsPreviewUrlInput): string | undefined {
  const slug = localizedSlug ?? canonicalSlug;
  if (!slug || slug.length > 120 || !validSlug.test(slug) || !routeKind) return undefined;
  const prefix = basePath.replace(/\/$/, "");
  return `${prefix}/preview/${market}/${slug}?token=${encodeURIComponent(token)}&routeKind=${encodeURIComponent(routeKind)}`;
}