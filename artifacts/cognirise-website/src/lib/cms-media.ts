const governedMediaPath = /^\/api\/cms\/media\/[A-Za-z0-9._-]{3,200}\/versions\/[1-9][0-9]*$/;

/** Accepts only the versioned CMS delivery route or a direct HTTPS asset URL. */
export function cmsMediaHref(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return;
  const href = value.trim();
  if (governedMediaPath.test(href)) return href;
  try {
    const url = new URL(href);
    return url.protocol === "https:" ? url.href : undefined;
  } catch {
    return;
  }
}