import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import {
  NAVIGATION_ITEM_IDS,
  NavigationSettingsSchema,
  UpdateNavigationSettingsSchema,
} from "@workspace/api-zod";
import {
  authenticate,
  requireAdministrator,
  requireCsrf,
  requireMfa,
  type AuthContext,
} from "../lib/auth";
import { audit } from "../lib/cms";
import { asyncRoute } from "../lib/http";

const router: IRouter = Router();

async function settings() {
  const result = await pool.query(
    `SELECT id,enabled,updated_at FROM cms_navigation_items WHERE id=ANY($1::text[])`,
    [NAVIGATION_ITEM_IDS],
  );
  const stored = new Map(result.rows.map((row) => [String(row.id), Boolean(row.enabled)]));
  const latest = result.rows.reduce<Date | null>((value, row) => {
    const candidate = new Date(row.updated_at);
    return !value || candidate > value ? candidate : value;
  }, null);
  return NavigationSettingsSchema.parse({
    items: NAVIGATION_ITEM_IDS.map((id) => ({ id, enabled: stored.get(id) ?? true })),
    updatedAt: latest?.toISOString() ?? null,
  });
}

router.get(
  "/public/navigation",
  asyncRoute(async (_req, res) => {
    res.set("Cache-Control", "public, max-age=0, must-revalidate");
    res.json(await settings());
  }),
);

router.get(
  "/navigation",
  authenticate,
  requireMfa,
  requireAdministrator,
  asyncRoute(async (_req, res) => {
    res.set("Cache-Control", "no-store");
    res.json(await settings());
  }),
);

router.put(
  "/navigation",
  authenticate,
  requireMfa,
  requireCsrf,
  requireAdministrator,
  asyncRoute(async (req, res) => {
    const parsed = UpdateNavigationSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid navigation settings.", details: parsed.error.issues });
      return;
    }
    const auth = res.locals.auth as AuthContext;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const item of parsed.data.items) {
        await client.query(
          `INSERT INTO cms_navigation_items (id,enabled,updated_by_user_id,updated_at)
           VALUES ($1,$2,$3,now())
           ON CONFLICT (id) DO UPDATE SET enabled=excluded.enabled,updated_by_user_id=excluded.updated_by_user_id,updated_at=now()`,
          [item.id, item.enabled, auth.user.id],
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    await audit(auth, "navigation.updated", "navigation", "header", {
      enabled: parsed.data.items.filter((item) => item.enabled).map((item) => item.id),
      disabled: parsed.data.items.filter((item) => !item.enabled).map((item) => item.id),
    });
    res.json(await settings());
  }),
);

export default router;