import type { NextFunction, Request, Response } from "express";
import { pool } from "@workspace/db";
import { hashToken, randomToken } from "./security";
import { roleAtLeast, type CapabilityGrant } from "./policy";

export const SESSION_COOKIE = "__Host-cognirise_session";
export const CSRF_COOKIE = "__Host-cognirise_csrf";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export type CmsRole = "administrator" | "publisher" | "editor" | "viewer";
export type CmsAccountType = "internal" | "external-representative";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: CmsRole;
  accountType: CmsAccountType;
  status: "invited" | "active" | "suspended";
  marketCodes: string[];
  /** Frozen compatibility geography for an unconfigured legacy administrator. */
  legacyAdministratorMarketCodes: string[];
  capabilityMatrixConfigured: boolean;
  capabilityGrants: CapabilityGrant[];
  mfaEnabled: boolean;
  mustRotate: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthContext {
  id: string;
  tokenHash: string;
  user: AuthUser;
  mfaVerified: boolean;
  createdAt: Date;
  expiresAt: Date;
}

function cookieOptions(expires: Date) {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "strict" as const,
    path: "/",
    expires,
  };
}

export async function createSession(
  userId: string,
  mfaVerified: boolean,
  req: Request,
  res: Response,
): Promise<{ session: AuthContext; csrfToken: string }> {
  const token = randomToken();
  const tokenHash = hashToken(token);
  const csrfToken = csrfForSession(tokenHash);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const result = await pool.query(
    `INSERT INTO cms_sessions
       (user_id, token_digest, ip_digest, user_agent, mfa_satisfied_at, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING id, created_at`,
    [
      userId,
      tokenHash,
      req.ip ? hashToken(req.ip) : null,
      req.header("user-agent")?.slice(0, 500) ?? null,
      mfaVerified ? new Date() : null,
      expiresAt,
    ],
  );
  res.cookie(SESSION_COOKIE, token, cookieOptions(expiresAt));
  res.cookie(CSRF_COOKIE, csrfToken, {
    ...cookieOptions(expiresAt),
    httpOnly: false,
  });
  const user = await getUser(userId);
  return {
    session: {
      id: String(result.rows[0].id),
      tokenHash,
      user,
      mfaVerified,
      createdAt: new Date(result.rows[0].created_at),
      expiresAt,
    },
    csrfToken,
  };
}

export async function getUser(userId: string): Promise<AuthUser> {
  const query = `SELECT u.id,u.display_name name,u.email,u.role,
              COALESCE(to_jsonb(u)->>'account_type','internal') account_type,u.status,u.last_login_at,
             u.created_at,u.updated_at,p.must_rotate,
             COALESCE((SELECT array_agg(a.market_code ORDER BY a.market_code)
               FROM cms_user_market_assignments a WHERE a.user_id=u.id),'{}') market_codes,
              COALESCE((SELECT snapshot.market_codes
                FROM cms_legacy_administrator_market_snapshots snapshot WHERE snapshot.user_id=u.id),'{}') legacy_administrator_market_codes,
              EXISTS(SELECT 1 FROM cms_user_capability_configurations c WHERE c.user_id=u.id)
                capability_matrix_configured,
              COALESCE((SELECT jsonb_agg(jsonb_build_object(
                'topic',g.topic,'capability',g.capability,'scope',g.scope,'marketCode',g.market_code
              ) ORDER BY g.topic,g.capability,g.scope,g.market_code)
                FROM cms_user_capability_grants g WHERE g.user_id=u.id),'[]'::jsonb) capability_grants,
             EXISTS(SELECT 1 FROM cms_totp_credentials t WHERE t.user_id=u.id
              AND t.verified_at IS NOT NULL AND t.disabled_at IS NULL) mfa_enabled
       FROM cms_users u LEFT JOIN cms_password_credentials p ON p.user_id=u.id WHERE u.id=$1`;
  let result;
  try {
    result = await pool.query(query, [userId]);
  } catch (error: any) {
    // Rolling deployments may authenticate before additive matrix sentinel
    // migration 0039 is visible. Preserve legacy behavior until it is.
    if (error?.code !== "42P01") throw error;
    const withoutSnapshot = query.replace(
        /COALESCE\(\(SELECT snapshot\.market_codes\s+FROM cms_legacy_administrator_market_snapshots snapshot WHERE snapshot\.user_id=u\.id\),'{}'\)/,
        "'{}'",
      );
    try {
      result = await pool.query(withoutSnapshot, [userId]);
    } catch (fallbackError: any) {
      if (fallbackError?.code !== "42P01") throw fallbackError;
      result = await pool.query(
        withoutSnapshot.replace(
          "EXISTS(SELECT 1 FROM cms_user_capability_configurations c WHERE c.user_id=u.id)",
          "false",
        ),
        [userId],
      );
    }
  }
  if (!result.rowCount) throw new Error("User not found");
  const row = result.rows[0];
  return {
    id: String(row.id),
    name: row.name,
    email: row.email,
    role: row.role,
    accountType: row.account_type ?? "internal",
    status: row.status,
    marketCodes: row.market_codes ?? [],
    legacyAdministratorMarketCodes: row.legacy_administrator_market_codes ?? [],
    capabilityMatrixConfigured: Boolean(row.capability_matrix_configured),
    capabilityGrants: row.capability_grants ?? [],
    mfaEnabled: row.mfa_enabled,
    mustRotate: Boolean(row.must_rotate),
    lastLoginAt: row.last_login_at ? new Date(row.last_login_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function publicSession(session: AuthContext) {
  return {
    id: session.id,
    user: session.user,
    mfaVerified: session.mfaVerified,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
  };
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const rawToken = req.cookies?.[SESSION_COOKIE] as string | undefined;
  if (!rawToken) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  const tokenHash = hashToken(rawToken);
  const result = await pool.query(
    `SELECT s.id, s.token_digest, s.mfa_satisfied_at, s.created_at, s.expires_at,
             u.id user_id, u.display_name name, u.email, u.role,
             COALESCE(to_jsonb(u)->>'account_type','internal') account_type,u.status,
             u.last_login_at, u.created_at user_created_at,
             u.updated_at user_updated_at,p.must_rotate,
             COALESCE((SELECT array_agg(a.market_code ORDER BY a.market_code)
               FROM cms_user_market_assignments a WHERE a.user_id=u.id),'{}') market_codes,
              COALESCE((SELECT snapshot.market_codes
                FROM cms_legacy_administrator_market_snapshots snapshot WHERE snapshot.user_id=u.id),'{}') legacy_administrator_market_codes,
             EXISTS(SELECT 1 FROM cms_user_capability_configurations c WHERE c.user_id=u.id)
               capability_matrix_configured,
             COALESCE((SELECT jsonb_agg(jsonb_build_object(
               'topic',g.topic,'capability',g.capability,'scope',g.scope,'marketCode',g.market_code
             ) ORDER BY g.topic,g.capability,g.scope,g.market_code)
               FROM cms_user_capability_grants g WHERE g.user_id=u.id),'[]'::jsonb) capability_grants,
            EXISTS(SELECT 1 FROM cms_totp_credentials t WHERE t.user_id=u.id
              AND t.verified_at IS NOT NULL AND t.disabled_at IS NULL) mfa_enabled
       FROM cms_sessions s
       JOIN cms_users u ON u.id=s.user_id
        LEFT JOIN cms_password_credentials p ON p.user_id=u.id
      WHERE s.token_digest=$1 AND s.revoked_at IS NULL AND s.expires_at > now()
         AND u.status IN ('active','invited')`,
    [tokenHash],
  );
  if (!result.rowCount) {
    clearSessionCookies(res);
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  const row = result.rows[0];
  res.locals.auth = {
    id: String(row.id),
    tokenHash,
    user: {
      id: String(row.user_id),
      name: row.name,
      email: row.email,
      role: row.role,
      accountType: row.account_type ?? "internal",
      status: row.status,
      marketCodes: row.market_codes ?? [],
        legacyAdministratorMarketCodes: row.legacy_administrator_market_codes ?? [],
        capabilityMatrixConfigured: Boolean(row.capability_matrix_configured),
        capabilityGrants: row.capability_grants ?? [],
      mfaEnabled: row.mfa_enabled,
      mustRotate: Boolean(row.must_rotate),
      lastLoginAt: row.last_login_at ? new Date(row.last_login_at) : null,
      createdAt: new Date(row.user_created_at),
      updatedAt: new Date(row.user_updated_at),
    },
    mfaVerified: Boolean(row.mfa_satisfied_at),
    createdAt: new Date(row.created_at),
    expiresAt: new Date(row.expires_at),
  } satisfies AuthContext;
  next();
}

export function requireCsrf(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const auth = res.locals.auth as AuthContext;
  const header = req.header("x-csrf-token");
  const cookie = req.cookies?.[CSRF_COOKIE] as string | undefined;
  if (
    !header ||
    !cookie ||
    header !== cookie ||
    header !== csrfForSession(auth.tokenHash)
  ) {
    res.status(403).json({ error: "CSRF validation failed." });
    return;
  }
  next();
}

export function requireMfa(
  _req: Request,
  res: Response,
  next: NextFunction,
): void | Promise<void> {
  const auth = res.locals.auth as AuthContext;
  // A viewer may receive explicit Edit/Review/Publish authority. Check the
  // current database grants on every privileged request so a matrix grant
  // cannot bypass MFA and a revocation takes effect without a new login.
  const enforce = async () => {
    // A rolling deploy may serve code just before the additive migration is
    // visible. There can be no explicit grants until that table exists, so
    // retaining the old role gate is safe; any other database failure remains
    // an error and never becomes an authorization fallback.
    let explicitPrivilege: { rowCount: number | null } = { rowCount: 0 };
    try {
      explicitPrivilege = await pool.query(
        `SELECT 1 FROM cms_user_capability_grants
          WHERE user_id=$1 AND capability IN ('edit','review','publish') LIMIT 1`,
        [auth.user.id],
      );
    } catch (error: any) {
      if (error?.code !== "42P01") throw error;
    }
    const privileged = ["administrator", "publisher", "editor"].includes(auth.user.role) ||
      Boolean(explicitPrivilege.rowCount);
    if (auth.user.mustRotate) {
      res.status(403).json({ error: "Password change is required." });
      return;
    }
    if (privileged && (!auth.user.mfaEnabled || !auth.mfaVerified)) {
      res.status(403).json({ error: "Multi-factor authentication is required for privileged content authority." });
      return;
    }
    next();
  };
  return enforce().catch(next);
}

export function requireRoles(...roles: CmsRole[]) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const auth = res.locals.auth as AuthContext;
    if (!roles.includes(auth.user.role)) {
      res.status(403).json({ error: "You do not have permission for this action." });
      return;
    }
    next();
  };
}

export function requireMinimumRole(role: CmsRole) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const auth = res.locals.auth as AuthContext;
    if (!roleAtLeast(auth.user.role, role)) {
      res.status(403).json({ error: "You do not have permission for this action." });
      return;
    }
    next();
  };
}

export const requireEditor = requireRoles(
  "administrator",
  "publisher",
  "editor",
);
export const requirePublisher = requireRoles("administrator", "publisher");
export const requireAdministrator = requireRoles("administrator");

export function csrfForSession(tokenHash: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 characters");
  }
  return hashToken(`${secret}:${tokenHash}:csrf`);
}

export function clearSessionCookies(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { path: "/", secure: true, sameSite: "strict" });
  res.clearCookie(CSRF_COOKIE, { path: "/", secure: true, sameSite: "strict" });
}
