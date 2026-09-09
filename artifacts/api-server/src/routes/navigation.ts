import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import {
  NAVIGATION_ITEM_REGISTRY,
  NavigationPolicySnapshotSchema,
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
import { navigationCandidates, publishedNavigationPolicy } from "../lib/navigation-policy";

const router: IRouter = Router();
const defaultPages = [...new Set(NAVIGATION_ITEM_REGISTRY.map((item) => item.destination.split(/[?#]/)[0]))];

type StoredNavigationRow = {
  item_id: string;
  label: string;
  parent_id: string | null;
  sort_order: number;
  destination: string;
  visible: boolean;
  workflow_state?: string;
};

function completeEdition(
  rows: StoredNavigationRow[],
  incoming: Array<{
    id: string;
    label: string;
    parentId?: string | null;
    order: number;
    destination: string;
    visible: boolean;
  }> = [],
) {
  const stored = new Map(rows.map((row) => [String(row.item_id), row]));
  const patches = new Map(incoming.map((item) => [item.id, item]));
  return NAVIGATION_ITEM_REGISTRY.map((registryItem, order) => {
    const row = stored.get(registryItem.id);
    const patch = patches.get(registryItem.id);
    const inheritedParent = row
      ? row.parent_id
      : ("parentId" in registryItem ? registryItem.parentId : null);
    return {
      id: registryItem.id,
      label: patch?.label ?? row?.label ?? registryItem.label,
      parentId: patch && Object.prototype.hasOwnProperty.call(patch, "parentId")
        ? patch.parentId ?? null
        : inheritedParent,
      order: patch?.order ?? row?.sort_order ?? order,
      destination: patch?.destination ?? row?.destination ?? registryItem.destination,
      visible: patch?.visible ?? row?.visible ?? true,
    };
  }).sort((a, b) => a.order - b.order);
}

router.get("/public/configuration", asyncRoute(async (_req, res) => {
  const result = await pool.query(
    `SELECT code,display_name,default_locale,fallback_locale,is_canonical
       FROM market_editions WHERE enabled=true ORDER BY is_canonical DESC,display_name`,
  );
  res.set("Cache-Control", "public, max-age=0, must-revalidate").json({
    markets: result.rows.map((row) => ({
      code: String(row.code),
      displayName: String(row.display_name),
      defaultLocale: String(row.default_locale),
      locales: [...new Set([row.default_locale, row.fallback_locale].filter(Boolean).map(String))],
      isCanonical: Boolean(row.is_canonical),
    })),
  });
}));

async function settings(requestedMarket: string, requestedLocale: string, allowFallback: boolean, includeDraft = false) {
  const choices = await navigationCandidates(requestedMarket, requestedLocale);
  if (!choices) return null;
  const search = allowFallback ? choices : choices.slice(0, 1);
  if (allowFallback && !includeDraft) {
    const policy = await publishedNavigationPolicy(requestedMarket, requestedLocale);
    if (policy) {
      const { publishedAt: _publishedAt, ...publicPolicy } = policy;
      return NavigationSettingsSchema.parse({
        ...publicPolicy,
        isConfigured: true,
        updatedAt: new Date(policy.publishedAt).toISOString(),
      });
    }
    const legacy = await pool.query(`SELECT id,COALESCE(visible,enabled) AS visible,updated_at FROM cms_navigation_items`);
    const legacyVisibility = new Map(legacy.rows.map((row) => [String(row.id), Boolean(row.visible)]));
    return NavigationSettingsSchema.parse({
      items: NAVIGATION_ITEM_REGISTRY.map((item, order) => ({
        id: item.id,
        label: item.label,
        parentId: "parentId" in item ? item.parentId : null,
        order,
        destination: item.destination,
        visible: legacyVisibility.get(item.id) ?? true,
      })),
      pages: defaultPages.map((path) => ({ path, enabled: true })),
      requestedMarket,
      requestedLocale,
      market: requestedMarket,
      locale: requestedLocale,
      usedFallback: false,
      isConfigured: legacy.rows.length > 0,
      updatedAt: legacy.rows.length
        ? new Date(Math.max(...legacy.rows.map((row) => Number(new Date(row.updated_at))))).toISOString()
        : null,
    });
  }
  let effective = search[0];
  let rows: Array<Record<string, any>> = [];
  let pages: Array<Record<string, any>> = [];
  for (const choice of search) {
    const [navigationResult, pageResult] = await Promise.all([
      pool.query(
        `SELECT item_id,label,parent_id,sort_order,destination,visible,updated_at
           FROM cms_navigation_editions WHERE market=$1 AND locale=$2
             AND ($3::boolean OR workflow_state='approved') ORDER BY sort_order,item_id`,
        [choice.market, choice.locale, includeDraft],
      ),
      pool.query(
        `SELECT path,enabled,updated_at FROM cms_page_availability
          WHERE market=$1 AND locale=$2 AND ($3::boolean OR workflow_state='approved') ORDER BY path`,
        [choice.market, choice.locale, includeDraft],
      ),
    ]);
    if (navigationResult.rowCount || pageResult.rowCount) {
      effective = choice;
      rows = navigationResult.rows;
      pages = pageResult.rows;
      break;
    }
  }
  const stored = new Map(rows.map((row) => [String(row.item_id), row]));
  const legacy = await pool.query(`SELECT id,COALESCE(visible,enabled) AS visible FROM cms_navigation_items`);
  const legacyVisibility = new Map(legacy.rows.map((row) => [String(row.id), Boolean(row.visible)]));
  const pageMap = new Map(pages.map((row) => [String(row.path), Boolean(row.enabled)]));
  const timestamps = [...rows, ...pages].map((row) => new Date(row.updated_at));
  return NavigationSettingsSchema.parse({
    items: NAVIGATION_ITEM_REGISTRY.map((item, order) => {
      const row = stored.get(item.id);
      return {
        id: item.id,
        label: row?.label ?? item.label,
        // A stored SQL null is an explicit top-level override. Only an absent
        // edition row inherits the registry parent.
        parentId: row ? row.parent_id : ("parentId" in item ? item.parentId : null),
        order: row?.sort_order ?? order,
        destination: row?.destination ?? item.destination,
        visible: row?.visible ?? legacyVisibility.get(item.id) ?? true,
      };
    }).sort((a, b) => a.order - b.order),
    pages: [...new Set([...defaultPages, ...pageMap.keys()])]
      .map((path) => ({ path, enabled: pageMap.get(path) ?? true })),
    requestedMarket,
    requestedLocale,
    market: effective.market,
    locale: effective.locale,
    usedFallback: effective.market !== requestedMarket || effective.locale !== requestedLocale,
    isConfigured: Boolean(rows.length || pages.length || legacy.rows.length),
    updatedAt: timestamps.length ? new Date(Math.max(...timestamps.map(Number))).toISOString() : null,
  });
}

router.get("/public/navigation", asyncRoute(async (req, res) => {
  const market = typeof req.query.market === "string" ? req.query.market : "uae";
  const locale = typeof req.query.locale === "string" ? req.query.locale : "en";
  const result = await settings(market, locale, true);
  if (!result) { res.status(404).json({ error: "Market or locale is unavailable." }); return; }
  res.set("Cache-Control", "public, max-age=0, must-revalidate").json(result);
}));

router.get("/navigation", authenticate, requireMfa, requireAdministrator, asyncRoute(async (req, res) => {
  const market = typeof req.query.market === "string" ? req.query.market : "uae";
  const locale = typeof req.query.locale === "string" ? req.query.locale : "en";
  const result = await settings(market, locale, false, true);
  if (!result) { res.status(404).json({ error: "Market or locale is unavailable." }); return; }
  res.set("Cache-Control", "no-store").json(result);
}));

router.put("/navigation", authenticate, requireMfa, requireCsrf, requireAdministrator, asyncRoute(async (req, res) => {
  const parsed = UpdateNavigationSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid navigation settings.", details: parsed.error.issues });
    return;
  }
  const auth = res.locals.auth as AuthContext;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query(
      `SELECT item_id,label,parent_id,sort_order,destination,visible,workflow_state
         FROM cms_navigation_editions WHERE market=$1 AND locale=$2 FOR UPDATE`,
      [parsed.data.market, parsed.data.locale],
    );
    const completeItems = completeEdition(existing.rows, parsed.data.items);
    const hierarchy = NavigationPolicySnapshotSchema.safeParse({ items: completeItems, pages: [] });
    if (!hierarchy.success) {
      await client.query("ROLLBACK");
      res.status(400).json({
        error: "Invalid navigation hierarchy.",
        details: hierarchy.error.issues,
      });
      return;
    }
    const effectiveParents = new Map<string, string | null>(
      completeItems.map((item) => [item.id, item.parentId]),
    );
    for (const item of parsed.data.items) {
      await client.query(
        `INSERT INTO cms_navigation_editions
          (market,locale,item_id,label,parent_id,sort_order,destination,visible,workflow_state,updated_by_user_id,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'draft',$9,now())
         ON CONFLICT (market,locale,item_id) DO UPDATE SET
          label=excluded.label,parent_id=excluded.parent_id,sort_order=excluded.sort_order,
          destination=excluded.destination,visible=excluded.visible,workflow_state='draft',
          updated_by_user_id=excluded.updated_by_user_id,updated_at=now()`,
        [parsed.data.market, parsed.data.locale, item.id, item.label, effectiveParents.get(item.id) ?? null, item.order,
          item.destination, item.visible, auth.user.id],
      );
    }
    for (const page of parsed.data.pages) {
      await client.query(
        `INSERT INTO cms_page_availability (market,locale,path,enabled,workflow_state,updated_by_user_id,updated_at)
         VALUES ($1,$2,$3,$4,'draft',$5,now()) ON CONFLICT (market,locale,path) DO UPDATE SET
          enabled=excluded.enabled,workflow_state='draft',updated_by_user_id=excluded.updated_by_user_id,updated_at=now()`,
        [parsed.data.market, parsed.data.locale, page.path, page.enabled, auth.user.id],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  await audit(auth, "navigation.updated", "navigation", `${parsed.data.market}:${parsed.data.locale}`, {
    market: parsed.data.market, locale: parsed.data.locale,
  });
  res.json(await settings(parsed.data.market, parsed.data.locale, false, true));
}));

router.post("/navigation/publish", authenticate, requireMfa, requireCsrf, requireAdministrator, asyncRoute(async (req, res) => {
  const market = typeof req.body?.market === "string" ? req.body.market : "uae";
  const locale = typeof req.body?.locale === "string" ? req.body.locale : "en";
  const auth = res.locals.auth as AuthContext;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const items = await client.query(
        `SELECT item_id,label,parent_id,sort_order,destination,visible,workflow_state
           FROM cms_navigation_editions WHERE market=$1 AND locale=$2
           ORDER BY sort_order,item_id FOR UPDATE`,
        [market, locale],
      );
    const pages = await client.query(
        `SELECT path,enabled,workflow_state FROM cms_page_availability
          WHERE market=$1 AND locale=$2 ORDER BY path FOR UPDATE`,
        [market, locale],
      );
    const releaseItems = items.rows.filter((item) => item.workflow_state === "in-review");
    const releasePages = pages.rows.filter((page) => page.workflow_state === "in-review");
    if (!releaseItems.length && !releasePages.length) {
      await client.query("ROLLBACK");
      res.status(409).json({ error: "Navigation must be submitted for review before publication." });
      return;
    }

    let baseline: { items: Array<Record<string, any>>; pages: Array<{ path: string; enabled: boolean }> } | null = null;
    const exactPublished = await client.query(
      `SELECT items,pages FROM cms_navigation_published_policies
        WHERE market=$1 AND locale=$2 FOR UPDATE`,
      [market, locale],
    );
    if (exactPublished.rowCount) {
      baseline = NavigationPolicySnapshotSchema.parse(exactPublished.rows[0]);
    } else {
      const candidates = await navigationCandidates(market, locale);
      for (const candidate of candidates?.slice(1) ?? []) {
        const fallbackPublished = await client.query(
          `SELECT items,pages FROM cms_navigation_published_policies
            WHERE market=$1 AND locale=$2 FOR SHARE`,
          [candidate.market, candidate.locale],
        );
        if (!fallbackPublished.rowCount) continue;
        baseline = NavigationPolicySnapshotSchema.parse(fallbackPublished.rows[0]);
        break;
      }
    }
    baseline ??= {
      items: completeEdition([]),
      pages: defaultPages.map((path) => ({ path, enabled: true })),
    };

    const baselineRows: StoredNavigationRow[] = baseline.items.map((item) => ({
      item_id: item.id,
      label: item.label,
      parent_id: item.parentId,
      sort_order: item.order,
      destination: item.destination,
      visible: item.visible,
    }));
    const pageDecisions = new Map(baseline.pages.map((page) => [page.path, page.enabled]));
    for (const page of releasePages) pageDecisions.set(String(page.path), Boolean(page.enabled));
    const snapshot = NavigationPolicySnapshotSchema.parse({
      items: completeEdition(baselineRows, releaseItems.map((item) => ({
        id: String(item.item_id),
        label: String(item.label),
        parentId: item.parent_id == null ? null : String(item.parent_id),
        order: Number(item.sort_order),
        destination: String(item.destination),
        visible: Boolean(item.visible),
      }))),
      pages: [...pageDecisions].map(([path, enabled]) => ({ path, enabled })),
    });
    await client.query(
      `INSERT INTO cms_navigation_published_policies
        (market,locale,items,pages,published_by_user_id,published_at)
       VALUES ($1,$2,$3::jsonb,$4::jsonb,$5,now())
       ON CONFLICT (market,locale) DO UPDATE SET items=excluded.items,pages=excluded.pages,
         published_by_user_id=excluded.published_by_user_id,published_at=excluded.published_at`,
      [market, locale, JSON.stringify(snapshot.items), JSON.stringify(snapshot.pages), auth.user.id],
    );
    await client.query(
      `UPDATE cms_navigation_editions SET workflow_state='approved',updated_at=now()
       WHERE market=$1 AND locale=$2 AND workflow_state='in-review'`,
      [market, locale],
    );
    await client.query(
      `UPDATE cms_page_availability SET workflow_state='approved',updated_at=now()
       WHERE market=$1 AND locale=$2 AND workflow_state='in-review'`,
      [market, locale],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  const result = await settings(market, locale, false);
  if (!result) { res.status(404).json({ error: "Market or locale is unavailable." }); return; }
  res.json(result);
}));

router.post("/navigation/review", authenticate, requireMfa, requireCsrf, requireAdministrator, asyncRoute(async (req, res) => {
  const market = typeof req.body?.market === "string" ? req.body.market : "uae";
  const locale = typeof req.body?.locale === "string" ? req.body.locale : "en";
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE cms_navigation_editions SET workflow_state='in-review',updated_at=now()
       WHERE market=$1 AND locale=$2 AND workflow_state='draft'`,
      [market, locale],
    );
    await client.query(
      `UPDATE cms_page_availability SET workflow_state='in-review',updated_at=now()
       WHERE market=$1 AND locale=$2 AND workflow_state='draft'`,
      [market, locale],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  const result = await settings(market, locale, false, true);
  if (!result) { res.status(404).json({ error: "Market or locale is unavailable." }); return; }
  res.json(result);
}));

export default router;