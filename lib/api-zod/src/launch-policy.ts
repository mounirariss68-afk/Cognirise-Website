/** First-publication controls. Restore each surface here, then republish.
 * This never alters CMS revisions, permissions or publication receipts. */
export const LAUNCH_POLICY = {
  enabled: true,
  insights: false,
  platforms: false,
  partnerLinks: false,
  foundersOnly: true,
} as const;

export function launchHrefAllowed(href: string): boolean {
  if (!LAUNCH_POLICY.enabled) return true;
  let url: URL;
  try { url = new URL(href, "https://cognirise.ai"); } catch { return false; }
  let path: string;
  try { path = decodeURIComponent(url.pathname).replace(/\/+$/, "") || "/"; } catch { return false; }
  if (!LAUNCH_POLICY.insights && /^\/insights(?:\/|$)/i.test(path)) return false;
  if (!LAUNCH_POLICY.platforms && (/^\/platforms(?:\/|$)/i.test(path)
    || /^\/(?:cognitalk|cogniware|cognios|cogniagents|cognidocs|cognibase|ai-platforms)(?:\/|$)/i.test(path))) return false;
  if (!LAUNCH_POLICY.partnerLinks && (/^\/partners(?:\/|$)/i.test(path)
    || /^\/platforms\/(?:lupitor|datatoolpack|bunjee-ai)(?:\/|$)/i.test(path)
    || /^\/cognitalk(?:\/|$)/i.test(path)
    || /(?:^|\.)(?:lupitor|bgts|datatoolpack|bunjee|argano)\.[a-z.]+$/i.test(url.hostname))) return false;
  return true;
}
