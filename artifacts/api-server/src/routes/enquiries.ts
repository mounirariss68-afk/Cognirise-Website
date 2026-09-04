import { Router, type IRouter } from "express";
import {
  SubmitEnquiryBody,
  SubmitEnquiryResponse,
  SubscribeNewsletterBody,
  SubscribeNewsletterResponse,
} from "@workspace/api-zod";
import {
  db,
  newsletterSubscriptionsTable,
  websiteEnquiriesTable,
} from "@workspace/db";

const router: IRouter = Router();

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

  const [enquiry] = await db
    .insert(websiteEnquiriesTable)
    .values(input)
    .returning({
      id: websiteEnquiriesTable.id,
      createdAt: websiteEnquiriesTable.createdAt,
    });

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

  const [subscription] = await db
    .insert(newsletterSubscriptionsTable)
    .values(input)
    .returning({
      id: newsletterSubscriptionsTable.id,
      createdAt: newsletterSubscriptionsTable.createdAt,
    });

  res.status(201).json(
    SubscribeNewsletterResponse.parse({
      id: subscription.id,
      status: "subscribed",
      createdAt: subscription.createdAt.toISOString(),
    }),
  );
});

export default router;