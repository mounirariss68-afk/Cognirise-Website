import { Router, type IRouter } from "express";
import {
  SubmitEnquiryBody,
  SubmitEnquiryResponse,
  SubscribeNewsletterBody,
  SubscribeNewsletterResponse,
} from "@workspace/api-zod";
import {
  db,
  pool,
  newsletterSubscriptionsTable,
  websiteEnquiriesTable,
} from "@workspace/db";
import { SlidingWindowThrottle } from "../lib/security";
import { throttle } from "../lib/http";

const router: IRouter = Router();
const intakeLimiter = new SlidingWindowThrottle(8, 60_000);
router.use(["/enquiries", "/newsletter-subscriptions"], throttle(intakeLimiter, (req) => req.ip ?? "unknown"));

router.post("/enquiries", async (req, res): Promise<void> => {
  const parsed = SubmitEnquiryBody.safeParse(req.body);

  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid enquiry");
    res.status(400).json({ error: "Please check the highlighted fields." });
    return;
  }

  const { website, ...input } = parsed.data;
  if (website) {
    res.status(201).json(
      SubmitEnquiryResponse.parse({
        id: crypto.randomUUID(),
        status: "received",
        createdAt: new Date().toISOString(),
      }),
    );
    return;
  }

  const client = await pool.connect();
  let enquiry: { id: string; createdAt: Date };
  try {
    await client.query("BEGIN");
    const duplicateKey = `${input.email.toLowerCase()}:${input.market}:${input.challenge}`;
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [duplicateKey]);
    const existing = await client.query(
      `SELECT id,created_at FROM website_enquiries
       WHERE lower(email)=lower($1) AND market=$2 AND challenge=$3
         AND created_at > now()-interval '10 minutes'
       ORDER BY created_at DESC LIMIT 1`,
      [input.email, input.market, input.challenge],
    );
    if (existing.rowCount) {
      enquiry = { id: existing.rows[0].id, createdAt: existing.rows[0].created_at };
    } else {
      const inserted = await client.query(
        `INSERT INTO website_enquiries(name,email,organization,role,market,process_area,challenge,consent,source_page)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id,created_at`,
        [input.name, input.email, input.organization, input.role ?? null, input.market, input.processArea, input.challenge, input.consent, input.sourcePage],
      );
      enquiry = { id: inserted.rows[0].id, createdAt: inserted.rows[0].created_at };
      await client.query(
        `INSERT INTO cms_submission_workflows
          (source_type,source_id,consent_granted,consent_policy_version,
           consent_captured_at,deletion_due_at)
         VALUES ('enquiry',$1,true,'2025-01',now(),now()+interval '24 months')`,
        [enquiry.id],
      );
    }
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }

  res.status(201).json(
    SubmitEnquiryResponse.parse({
      id: enquiry.id,
      status: "received",
      createdAt: enquiry.createdAt.toISOString(),
    }),
  );
});

router.post("/newsletter-subscriptions", async (req, res): Promise<void> => {
  const parsed = SubscribeNewsletterBody.safeParse(req.body);

  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid subscription");
    res.status(400).json({ error: "Enter a valid email and accept consent." });
    return;
  }

  const { website, ...input } = parsed.data;
  if (website) {
    res.status(201).json(
      SubscribeNewsletterResponse.parse({
        id: crypto.randomUUID(),
        status: "subscribed",
        createdAt: new Date().toISOString(),
      }),
    );
    return;
  }

  const client = await pool.connect();
  let subscription: { id: string; createdAt: Date };
  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended(lower($1)||':'||$2,0))",
      [input.email, input.market],
    );
    const existing = await client.query(
      "SELECT id,created_at FROM newsletter_subscriptions WHERE lower(email)=lower($1) AND market=$2 LIMIT 1",
      [input.email, input.market],
    );
    if (existing.rowCount) {
      subscription = { id: existing.rows[0].id, createdAt: existing.rows[0].created_at };
      await client.query("COMMIT");
    } else {
      const inserted = await client.query(
        `INSERT INTO newsletter_subscriptions(email,market,consent,source_page)
         VALUES ($1,$2,$3,$4) RETURNING id,created_at`,
        [input.email, input.market, input.consent, input.sourcePage],
      );
      subscription = { id: inserted.rows[0].id, createdAt: inserted.rows[0].created_at };
      await client.query(
    `INSERT INTO cms_submission_workflows
      (source_type,source_id,consent_granted,consent_policy_version,
       consent_captured_at,deletion_due_at)
      VALUES ('newsletter',$1,true,'2025-01',now(),now()+interval '24 months')`,
        [subscription.id],
      );
      await client.query("COMMIT");
    }
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }

  res.status(201).json(
    SubscribeNewsletterResponse.parse({
      id: subscription.id,
      status: "subscribed",
      createdAt: subscription.createdAt.toISOString(),
    }),
  );
});

export default router;