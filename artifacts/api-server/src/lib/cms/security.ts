import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export type CmsMarket = "uae" | "ksa" | "turkiye" | "europe";
export type CmsRouteKind = "home" | "service" | "platform" | "industry" | "caseStudy" | "about" | "contact" | "landing" | "legal";
export const CMS_ROUTE_KINDS: readonly CmsRouteKind[] = ["home", "service", "platform", "industry", "caseStudy", "about", "contact", "landing", "legal"];
export function parseRouteKind(value: unknown): CmsRouteKind | undefined {
  return typeof value === "string" && (CMS_ROUTE_KINDS as readonly string[]).includes(value) ? value as CmsRouteKind : undefined;
}
export const CMS_MARKETS: readonly CmsMarket[] = [
  "uae",
  "ksa",
  "turkiye",
  "europe",
];
export const CANONICAL_MARKET: CmsMarket = "uae";

export function parseMarket(value: unknown): CmsMarket | undefined {
  return typeof value === "string" &&
    (CMS_MARKETS as readonly string[]).includes(value)
    ? (value as CmsMarket)
    : undefined;
}

export function safeSlug(value: unknown): string | undefined {
  return typeof value === "string" &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) &&
    value.length <= 120
    ? value
    : undefined;
}

export function constantTimeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  const comparable = a.length === b.length ? b : Buffer.alloc(a.length);
  return timingSafeEqual(a, comparable) && a.length === b.length;
}

function b64url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

export interface PreviewClaims {
  v: 1;
  market: CmsMarket;
  slug: string;
  routeKind: CmsRouteKind;
  iat: number;
  exp: number;
  nonce: string;
  purpose: "exchange" | "session";
}

function signPreviewCapability(
  input: { market: CmsMarket; slug: string; routeKind: CmsRouteKind },
  purpose: PreviewClaims["purpose"],
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  lifetimeSeconds = 15 * 60,
): string {
  if (secret.length < 32) throw new Error("CMS preview secret must be at least 32 characters");
  if (lifetimeSeconds < 1 || lifetimeSeconds > 60 * 60) {
    throw new Error("CMS preview token lifetime is outside the permitted range");
  }
  const claims: PreviewClaims = {
    v: 1,
    market: input.market,
    slug: input.slug,
    routeKind: input.routeKind,
    iat: nowSeconds,
    exp: nowSeconds + lifetimeSeconds,
    nonce: randomBytes(16).toString("hex"),
    purpose,
  };
  const payload = b64url(JSON.stringify(claims));
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function signPreviewToken(
  input: { market: CmsMarket; slug: string; routeKind: CmsRouteKind },
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  lifetimeSeconds = 15 * 60,
): string {
  return signPreviewCapability(input, "exchange", secret, nowSeconds, lifetimeSeconds);
}

export function signPreviewSession(
  input: { market: CmsMarket; slug: string; routeKind: CmsRouteKind },
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  lifetimeSeconds = 15 * 60,
): string {
  return signPreviewCapability(input, "session", secret, nowSeconds, lifetimeSeconds);
}

export function verifyPreviewToken(
  token: string,
  secrets: readonly string[],
  nowSeconds = Math.floor(Date.now() / 1000),
): PreviewClaims | undefined {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra || secrets.length === 0) return undefined;
  const authentic = secrets.some((secret) => {
    const expected = createHmac("sha256", secret).update(payload).digest("base64url");
    return constantTimeEqual(signature, expected);
  });
  if (!authentic) return undefined;
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<PreviewClaims>;
    const market = parseMarket(value.market);
    const slug = safeSlug(value.slug);
    const routeKind = parseRouteKind(value.routeKind);
    if (
      value.v !== 1 ||
      !market ||
      !slug ||
      !routeKind ||
      typeof value.iat !== "number" ||
      typeof value.exp !== "number" ||
      typeof value.nonce !== "string" ||
      value.nonce.length !== 32 ||
      !["exchange", "session"].includes(String(value.purpose)) ||
      value.iat > nowSeconds + 30 ||
      value.exp <= nowSeconds ||
      value.exp - value.iat > 60 * 60
    ) return undefined;
    return value as PreviewClaims;
  } catch {
    return undefined;
  }
}

export function previewClaimsMatch(
  claims: PreviewClaims | undefined,
  market: CmsMarket | undefined,
  slug: string | undefined,
  routeKind: CmsRouteKind | undefined,
): boolean {
  return Boolean(claims && market && slug && routeKind && claims.market === market && claims.slug === slug && claims.routeKind === routeKind);
}

export function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function parseCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === name) {
      try {
        return decodeURIComponent(part.slice(separator + 1).trim());
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

export interface PreviewSessionLifecycle {
  exchangedAt: Date | null;
  revokedAt: Date | null;
  expiresAt: Date;
}
/** Exchange is one-time; a successful exchange deliberately does not revoke its session. */
export const canExchangePreviewSession = (session: PreviewSessionLifecycle | undefined, now = new Date()) =>
  Boolean(session && !session.exchangedAt && !session.revokedAt && session.expiresAt > now);
export const canReadPreviewSession = (session: PreviewSessionLifecycle | undefined, now = new Date()) =>
  Boolean(session && session.exchangedAt && !session.revokedAt && session.expiresAt > now);