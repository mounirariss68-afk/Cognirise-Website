import { getAuth } from "@clerk/express";
import { cmsPrincipalMarketsTable, cmsPrincipalsTable, db } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import type { Request, Response } from "express";
import type { CmsMarket } from "./security";
import { editorialRoles, type EditorialRole, type WorkflowPrincipal } from "./workflow";

export async function principalForRequest(req: Request): Promise<WorkflowPrincipal | undefined> {
  const auth = getAuth(req);
  const claimUserId = auth.sessionClaims?.userId;
  const clerkUserId = typeof claimUserId === "string" ? claimUserId : auth.userId;
  if (!clerkUserId) return undefined;
  let principal: typeof cmsPrincipalsTable.$inferSelect | undefined =
    (await db.select().from(cmsPrincipalsTable).where(eq(cmsPrincipalsTable.clerkUserId, clerkUserId)).limit(1))[0];
  // Local development convenience only. Production requires an assigned record.
  if (!principal && process.env.NODE_ENV !== "production") {
    // Serialize the empty-table decision. A plain count+insert lets two first
    // development users both become administrators under concurrent requests.
    principal = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(8675309)`);
      const [existing] = await tx.select().from(cmsPrincipalsTable).where(eq(cmsPrincipalsTable.clerkUserId, clerkUserId)).limit(1);
      if (existing) return existing;
      const [{ count }] = await tx.select({ count: sql<number>`count(*)::int` }).from(cmsPrincipalsTable);
      if (count !== 0) return undefined;
      const [created] = await tx.insert(cmsPrincipalsTable).values({
        id: `principal-${clerkUserId}`, clerkUserId, role: "admin", displayName: "Development administrator",
      }).onConflictDoNothing().returning();
      return created;
    });
  }
  if (!principal || !principal.active || !editorialRoles.includes(principal.role as EditorialRole)) return undefined;
  const assignments = await db.select({ market: cmsPrincipalMarketsTable.market }).from(cmsPrincipalMarketsTable)
    .where(eq(cmsPrincipalMarketsTable.principalId, principal.id));
  return { id: principal.id, role: principal.role as EditorialRole, markets: principal.role === "admin" && assignments.length === 0 ? "all" : assignments.map((item) => item.market as CmsMarket) };
}

export function requireSameOrigin(req: Request, res: Response): boolean {
  const origin = req.get("origin");
  const host = req.get("host");
  const configuredOrigins = (process.env.CMS_ALLOWED_ORIGINS ?? "").split(",")
    .map((item) => item.trim()).filter(Boolean);
  let parsedOrigin: URL | undefined;
  try { parsedOrigin = origin ? new URL(origin) : undefined; } catch { /* rejected below */ }
  // Do not use req.protocol: with Express proxy trust it can be derived from a
  // client-controlled X-Forwarded-Proto header.
  const directHostMatches = parsedOrigin?.host === host;
  const allowed = (process.env.NODE_ENV === "production"
    ? parsedOrigin?.protocol === "https:" && directHostMatches
    : directHostMatches) ||
    configuredOrigins.includes(parsedOrigin?.origin ?? "");
  if (!parsedOrigin || origin !== parsedOrigin.origin ||
    (process.env.NODE_ENV === "production" && parsedOrigin.protocol !== "https:") || !allowed) {
    res.status(403).json({ error: "Cross-origin CMS mutation rejected" });
    return false;
  }
  return true;
}