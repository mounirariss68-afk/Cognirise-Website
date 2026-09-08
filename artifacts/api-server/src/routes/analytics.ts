import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import {
  RecordAnalyticsConsentBody,
  RecordAnalyticsEventBody,
} from "@workspace/api-zod";
import { asyncRoute, throttle } from "../lib/http";
import { SlidingWindowThrottle } from "../lib/security";
import { hashToken } from "../lib/security";

const router: IRouter = Router();
const limiter = new SlidingWindowThrottle(120, 60_000);
const eventNames = new Set([
  "page_view",
  "cta_click",
  "value_scan_submit",
  "newsletter_subscribe",
  "publication_view",
  "web_vital",
  "service_card_activated",
  "service_destination_clicked",
]);
const propertyKeys = new Set(["cta", "utm_source", "lcp", "inp", "cls"]);
const serviceLineIds = new Set([
  "consulting-engineering",
  "sovereign-solutions",
  "ai-platforms",
]);
const serviceSources = new Set(["homepage", "services_overview"]);
const serviceDestinations = new Set([
  "/what-we-do/agentic-enterprise-transformation",
  "/what-we-do/data-ai-foundations",
  "/what-we-do/engineering-with-ai",
  "/what-we-do/sovereign-regulated-ai",
  "/platforms",
  "/platforms/lupitor",
  "/platforms/datatoolpack",
  "/platforms/bunjee-ai",
  "/what-we-do/digital-ai-workforce",
]);
router.use("/analytics", throttle(limiter, (req) => req.ip ?? "unknown"));

router.post(
  "/analytics/consent",
  asyncRoute(async (req, res) => {
    const parsed = RecordAnalyticsConsentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid consent record." });
      return;
    }
    const input = parsed.data;
    const result = await pool.query(
      `INSERT INTO cms_analytics_consents
       (subject_digest,policy_version,analytics_allowed,marketing_allowed,source)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (subject_digest,policy_version) DO UPDATE SET
         analytics_allowed=EXCLUDED.analytics_allowed,
         marketing_allowed=EXCLUDED.marketing_allowed,
         source=EXCLUDED.source,
         granted_at=now(),
         withdrawn_at=CASE WHEN EXCLUDED.analytics_allowed OR EXCLUDED.marketing_allowed
                           THEN NULL ELSE now() END
       RETURNING id,policy_version,analytics_allowed,marketing_allowed,granted_at`,
      [
        hashToken(input.visitorId),
        input.version,
        input.analytics,
        input.marketing,
        input.source ?? null,
      ],
    );
    const row = result.rows[0];
    res.status(201).json({
      id: String(row.id),
      visitorId: input.visitorId,
      version: row.policy_version,
      analytics: row.analytics_allowed,
      marketing: row.marketing_allowed,
      recordedAt: row.granted_at,
    });
  }),
);

router.post(
  "/analytics/events",
  asyncRoute(async (req, res) => {
    const parsed = RecordAnalyticsEventBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid analytics event." });
      return;
    }
    const input = parsed.data;
    const userAgent = req.header("user-agent") ?? "";
    if (
      !eventNames.has(input.name) ||
      /^\/(?:admin|preview)(?:\/|$)/.test(input.page) ||
      /bot|crawler|spider|headless|curl|wget/i.test(userAgent)
    ) {
      res.status(202).json({ accepted: false, id: null });
      return;
    }
    const properties = sanitizeEventProperties(input.name, input.properties);
    if (properties === null) {
      res.status(202).json({ accepted: false, id: null });
      return;
    }
    const consent = await pool.query(
      `SELECT id,analytics_allowed FROM cms_analytics_consents
        WHERE subject_digest=$1 AND policy_version=$2
          AND withdrawn_at IS NULL ORDER BY granted_at DESC LIMIT 1`,
      [hashToken(input.visitorId), input.consentVersion],
    );
    if (!consent.rows[0]?.analytics_allowed) {
      res.status(202).json({ accepted: false, id: null });
      return;
    }
    const result = await pool.query(
      `INSERT INTO cms_analytics_events
       (event_name,anonymous_id,session_id,consent_id,market,path,referrer_host,
        properties,occurred_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [
        input.name,
        hashToken(input.visitorId),
        input.sessionId,
        consent.rows[0].id,
        input.market ?? "unknown",
        input.page,
        input.referrer ? safeHost(input.referrer) : null,
        properties,
        input.occurredAt,
      ],
    );
    res.status(202).json({ accepted: true, id: String(result.rows[0].id) });
  }),
);

export default router;

function safeHost(value: string): string | null {
  try {
    return new URL(value).host.slice(0, 255);
  } catch {
    return null;
  }
}

function sanitizeEventProperties(
  eventName: string,
  input: Record<string, unknown> | undefined,
): Record<string, string | number> | null {
  const properties = input ?? {};
  if (
    eventName === "service_card_activated" ||
    eventName === "service_destination_clicked"
  ) {
    const serviceLine = properties.service_line;
    const source = properties.source;
    if (
      typeof serviceLine !== "string" ||
      !serviceLineIds.has(serviceLine) ||
      typeof source !== "string" ||
      !serviceSources.has(source)
    ) {
      return null;
    }
    if (eventName === "service_card_activated") {
      return { service_line: serviceLine, source };
    }
    const destination = properties.destination;
    if (
      typeof destination !== "string" ||
      !serviceDestinations.has(destination)
    ) {
      return null;
    }
    return { service_line: serviceLine, destination, source };
  }

  return Object.fromEntries(
    Object.entries(properties).filter(([key, value]) =>
      propertyKeys.has(key) &&
      (["lcp", "inp", "cls"].includes(key)
        ? typeof value === "number" && Number.isFinite(value)
        : typeof value === "string"),
    ),
  ) as Record<string, string | number>;
}