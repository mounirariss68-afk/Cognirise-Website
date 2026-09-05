import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { after, before, test } from "node:test";
import type { AddressInfo } from "node:net";
import { and, eq, inArray } from "drizzle-orm";
import {
  cmsPreviewTokenNoncesTable,
  cmsWebhookReceiptsTable,
  cmsWorkflowEventsTable,
  cmsWorkflowReceiptsTable,
  db,
  pool,
} from "@workspace/db";
import app from "../app";
import {
  sha256,
  signPreviewToken,
  verifyPreviewToken,
} from "../lib/cms/security";

const previewSecret = "integration-preview-secret-32-characters";
const webhookSecret = "integration-webhook-secret-32-characters";
const workflowKey = "integration-workflow-key-32-characters";
const authorKey = "integration-author-key-32-characters";
const reviewerKey = "integration-reviewer-key-32-characters";
const publisherKey = "integration-publisher-key-32-characters";
const originalFetch = globalThis.fetch;
let baseUrl = "";
let server: ReturnType<typeof app.listen>;

before(async () => {
  process.env.CMS_PREVIEW_SECRETS = previewSecret;
  process.env.SANITY_WEBHOOK_SECRET = webhookSecret;
  process.env.SANITY_PROJECT_ID = "integration-test";
  process.env.SANITY_DATASET = "staging";
  process.env.SANITY_API_TOKEN = "integration-token";
  process.env.CMS_WORKFLOW_CREDENTIALS = JSON.stringify([
    { id: "integration-admin", role: "admin", markets: "all", key: workflowKey },
    { id: "integration-author", role: "author", markets: ["uae"], key: authorKey },
    { id: "integration-reviewer", role: "reviewer", markets: ["uae"], key: reviewerKey },
    { id: "integration-publisher", role: "publisher", markets: ["uae"], key: publisherKey },
  ]);
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  globalThis.fetch = originalFetch;
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  await pool.end();
});

test("the approved schema flow has applied every CMS governance table", async () => {
  const result = await pool.query<{ table_name: string | null }>(
    `select to_regclass('public.' || required_name)::text as table_name
     from unnest($1::text[]) as required(required_name)`,
    [[
      "cms_workflow_events",
      "cms_workflow_receipts",
      "cms_preview_token_nonces",
      "cms_webhook_receipts",
    ]],
  );
  assert.deepEqual(
    result.rows.map((row) => row.table_name).sort(),
    [
      "cms_preview_token_nonces",
      "cms_webhook_receipts",
      "cms_workflow_events",
      "cms_workflow_receipts",
    ],
  );
});

test("preview exchange consumes its PostgreSQL nonce and rejects replay", async () => {
  const slug = `integration-preview-${Date.now()}`;
  const token = signPreviewToken({ market: "uae", slug }, previewSecret);
  const claims = verifyPreviewToken(token, [previewSecret]);
  assert.ok(claims);
  const digest = sha256(token);
  await db.insert(cmsPreviewTokenNoncesTable).values({
    digest,
    expiresAt: new Date(claims.exp * 1000),
  });
  try {
    const first = await originalFetch(`${baseUrl}/api/cms/preview/exchange`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });
    assert.equal(first.status, 200);
    assert.match(first.headers.get("set-cookie") ?? "", /HttpOnly/);

    const replay = await originalFetch(`${baseUrl}/api/cms/preview/exchange`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });
    assert.equal(replay.status, 401);

    const [nonce] = await db
      .select()
      .from(cmsPreviewTokenNoncesTable)
      .where(eq(cmsPreviewTokenNoncesTable.digest, digest));
    assert.ok(nonce?.consumedAt);
    const events = await db
      .select({ outcome: cmsWorkflowEventsTable.outcome })
      .from(cmsWorkflowEventsTable)
      .where(eq(cmsWorkflowEventsTable.target, `page:${slug}`));
    assert.deepEqual(events.map((event) => event.outcome).sort(), [
      "replay_rejected",
      "success",
    ]);
  } finally {
    await db
      .delete(cmsWorkflowEventsTable)
      .where(eq(cmsWorkflowEventsTable.target, `page:${slug}`));
    await db
      .delete(cmsPreviewTokenNoncesTable)
      .where(eq(cmsPreviewTokenNoncesTable.digest, digest));
  }
});

test("webhook idempotency uses event ID while identical payloads remain valid", async () => {
  const eventId = `integration-webhook-${Date.now()}`;
  const secondEventId = `integration-webhook-second-${Date.now()}`;
  const rawBody = JSON.stringify({ _id: "integration-page" });
  const timestamp = String(Date.now());
  const signature = createHmac("sha256", webhookSecret)
    .update(timestamp)
    .update(".")
    .update(rawBody)
    .digest("hex");
  const send = (id = eventId) =>
    originalFetch(`${baseUrl}/api/cms/webhooks/publish`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "sanity-webhook-id": id,
        "sanity-webhook-timestamp": timestamp,
        "sanity-webhook-signature": signature,
      },
      body: rawBody,
    });
  try {
    const accepted = await send();
    assert.equal(accepted.status, 202);
    const duplicate = await send();
    assert.equal(duplicate.status, 200);
    assert.equal((await duplicate.json() as { status: string }).status, "duplicate");
    const samePayloadNewEvent = await send(secondEventId);
    assert.equal(samePayloadNewEvent.status, 202);

    const receipts = await db
      .select()
      .from(cmsWebhookReceiptsTable)
      .where(inArray(cmsWebhookReceiptsTable.eventId, [eventId, secondEventId]));
    assert.equal(receipts.length, 2);
    assert.equal(receipts[0]?.payloadDigest, receipts[1]?.payloadDigest);
  } finally {
    await db
      .delete(cmsWorkflowEventsTable)
      .where(inArray(cmsWorkflowEventsTable.target, [
        `event:${eventId}`,
        `event:${secondEventId}`,
      ]));
    await db
      .delete(cmsWebhookReceiptsTable)
      .where(inArray(cmsWebhookReceiptsTable.eventId, [eventId, secondEventId]));
  }
});

test("publishing one market preserves another market's live content and pending draft", async () => {
  const requestId = `integration_${Date.now()}`;
  const subjectId = `integration-page-${Date.now()}`;
  let mutationBody: {
    mutations?: Array<Record<string, unknown>>;
  } | undefined;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.includes("/data/query/")) {
      const preferPublished =
        new URL(url).searchParams.get("$preferPublished") === "true";
      return Response.json({
        result: preferPublished
          ? {
              _id: subjectId,
              _rev: "published-revision",
              _type: "page",
              marketEditions: [
                { _key: "uae", publicationState: "published", title: "Old UAE" },
                { _key: "ksa", publicationState: "published", title: "Live KSA" },
              ],
              resolvedMarkets: [
                { _key: "uae", code: "uae", publicationState: "published" },
                { _key: "ksa", code: "ksa", publicationState: "published" },
              ],
            }
          : {
              _id: `drafts.${subjectId}`,
              _rev: "draft-revision",
              _type: "page",
              ownership: { owner: { _ref: "person.owner" } },
              marketEditions: [
                {
                  _key: "uae",
                  publicationState: "approved",
                  title: "Approved UAE",
                  approvedBy: { _ref: "person.reviewer" },
                  approvedAt: "2026-09-05T12:00:00.000Z",
                },
                {
                  _key: "ksa",
                  publicationState: "published",
                  title: "Unreviewed KSA draft",
                },
              ],
              resolvedMarkets: [
                {
                  _key: "uae",
                  code: "uae",
                  publicationState: "approved",
                  approvedBy: { _ref: "person.reviewer" },
                  approvedAt: "2026-09-05T12:00:00.000Z",
                },
                { _key: "ksa", code: "ksa", publicationState: "published" },
              ],
            },
      });
    }
    if (url.includes("/data/mutate/") && init?.method === "POST") {
      mutationBody = JSON.parse(String(init.body)) as typeof mutationBody;
      return Response.json({ transactionId: requestId });
    }
    throw new Error(`Unexpected integration fetch: ${url}`);
  };
  try {
    const response = await originalFetch(`${baseUrl}/api/cms/workflow/transitions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${publisherKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        requestId,
        subjectId,
        market: "uae",
        toState: "published",
        expiresAt: "2027-01-01T00:00:00.000Z",
      }),
    });
    assert.equal(response.status, 202);

    const receipts = await db
      .select()
      .from(cmsWorkflowReceiptsTable)
      .where(eq(cmsWorkflowReceiptsTable.requestId, requestId));
    assert.equal(receipts.length, 1);
    assert.equal(receipts[0]?.action, "transition:published");
    const replace = mutationBody?.mutations?.find(
      (mutation) => "createOrReplace" in mutation,
    ) as { createOrReplace?: { marketEditions?: Array<{ _key: string; title: string }> } } | undefined;
    assert.ok(replace?.createOrReplace);
    assert.equal(
      replace.createOrReplace.marketEditions?.find((edition) => edition._key === "ksa")?.title,
      "Live KSA",
    );
    assert.equal(
      replace.createOrReplace.marketEditions?.find((edition) => edition._key === "uae")?.title,
      "Approved UAE",
    );
    assert.equal(
      (
        replace.createOrReplace.marketEditions?.find((edition) => edition._key === "uae") as
          | { expiresAt?: string }
          | undefined
      )?.expiresAt,
      "2027-01-01T00:00:00.000Z",
    );
    assert.equal(
      mutationBody?.mutations?.some((mutation) => "delete" in mutation),
      false,
    );
    const revisionMutation = mutationBody?.mutations?.find((mutation) => {
      const value = mutation.createIfNotExists;
      return (
        typeof value === "object" &&
        value !== null &&
        "_type" in value &&
        value._type === "revisionRecord"
      );
    }) as { createIfNotExists?: { snapshot?: string } } | undefined;
    assert.ok(revisionMutation?.createIfNotExists?.snapshot);
    const revisionSnapshot = JSON.parse(
      revisionMutation.createIfNotExists.snapshot,
    ) as { marketEditions: Array<{ _key: string; title: string }> };
    assert.equal(
      revisionSnapshot.marketEditions.find((edition) => edition._key === "ksa")?.title,
      "Live KSA",
    );
    const draftPatch = mutationBody?.mutations?.find(
      (mutation) => "patch" in mutation,
    ) as { patch?: { set?: Record<string, unknown> } } | undefined;
    assert.equal(
      draftPatch?.patch?.set?.['marketEditions[_key=="uae"].publicationState'],
      "draft",
    );
  } finally {
    globalThis.fetch = originalFetch;
    await db
      .delete(cmsWorkflowEventsTable)
      .where(
        and(
          eq(cmsWorkflowEventsTable.target, `page:${subjectId}`),
          inArray(cmsWorkflowEventsTable.outcome, ["success", "rejected"]),
        ),
      );
    await db
      .delete(cmsWorkflowReceiptsTable)
      .where(eq(cmsWorkflowReceiptsTable.requestId, requestId));
  }
});

test("the same market completes two releases through author, reviewer, and publisher roles", async () => {
  const subjectId = `integration-repeat-${Date.now()}`;
  const requestIds = [1, 2, 3, 4].map((step) => `repeat_${step}_${Date.now()}`);
  let draftRevision = 1;
  let draft = {
    _id: `drafts.${subjectId}`,
    _rev: `draft-${draftRevision}`,
    _type: "page",
    ownership: { owner: { _ref: "person.owner" } },
    marketEditions: [{
      _key: "uae",
      publicationState: "approved",
      title: "First release",
      approvedBy: { _ref: "integration-reviewer" },
      approvedAt: "2026-09-05T12:00:00.000Z",
    }] as Array<Record<string, unknown>>,
  };
  let published: Record<string, unknown> | null = null;
  const withResolved = (document: Record<string, unknown>) => ({
    ...document,
    resolvedMarkets: (document.marketEditions as Array<Record<string, unknown>>).map(
      (edition) => ({ ...edition, code: "uae" }),
    ),
  });
  const applyPatch = (patch: {
    set?: Record<string, unknown>;
    unset?: string[];
  }) => {
    const edition = draft.marketEditions[0]!;
    for (const [path, value] of Object.entries(patch.set ?? {})) {
      const field = path.split(".").at(-1);
      if (field) edition[field] = value;
    }
    for (const path of patch.unset ?? []) {
      const field = path.split(".").at(-1);
      if (field) delete edition[field];
    }
    draftRevision += 1;
    draft = { ...draft, _rev: `draft-${draftRevision}` };
  };
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.includes("/data/query/")) {
      const preferPublished =
        new URL(url).searchParams.get("$preferPublished") === "true";
      return Response.json({
        result: preferPublished && published
          ? withResolved(published)
          : withResolved(draft),
      });
    }
    if (url.includes("/data/mutate/") && init?.method === "POST") {
      const body = JSON.parse(String(init.body)) as {
        mutations: Array<{
          createOrReplace?: Record<string, unknown>;
          patch?: { id: string; set?: Record<string, unknown>; unset?: string[] };
        }>;
      };
      for (const mutation of body.mutations) {
        if (mutation.createOrReplace?._type === "page") {
          published = structuredClone(mutation.createOrReplace);
        }
        if (mutation.patch?.id === draft._id) applyPatch(mutation.patch);
      }
      return Response.json({ transactionId: "repeat-release" });
    }
    throw new Error(`Unexpected integration fetch: ${url}`);
  };
  const transition = async (
    requestId: string,
    key: string,
    toState: string,
    expiresAt?: string,
  ) => {
    const response = await originalFetch(`${baseUrl}/api/cms/workflow/transitions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        requestId,
        subjectId,
        market: "uae",
        toState,
        ...(expiresAt ? { expiresAt } : {}),
      }),
    });
    assert.equal(response.status, 202, await response.text());
  };
  try {
    await transition(requestIds[0]!, publisherKey, "published");
    assert.equal(draft.marketEditions[0]?.publicationState, "draft");
    draft.marketEditions[0]!.title = "Second release";
    await transition(requestIds[1]!, authorKey, "review");
    await transition(requestIds[2]!, reviewerKey, "approved");
    const secondExpiry = "2027-06-01T00:00:00.000Z";
    await transition(requestIds[3]!, publisherKey, "published", secondExpiry);
    const liveDocument = published as Record<string, unknown> | null;
    assert.ok(liveDocument);
    const liveEdition = (
      liveDocument.marketEditions as Array<Record<string, unknown>>
    )[0];
    assert.equal(liveEdition?.title, "Second release");
    assert.equal(liveEdition?.expiresAt, secondExpiry);
    assert.equal(draft.marketEditions[0]?.publicationState, "draft");
  } finally {
    globalThis.fetch = originalFetch;
    await db
      .delete(cmsWorkflowEventsTable)
      .where(eq(cmsWorkflowEventsTable.target, `page:${subjectId}`));
    await db
      .delete(cmsWorkflowReceiptsTable)
      .where(inArray(cmsWorkflowReceiptsTable.requestId, requestIds));
  }
});

test("scheduling rejects supplied and pre-existing expiry before publication", async () => {
  const subjectId = `integration-schedule-${Date.now()}`;
  const requestIds = [`schedule_a_${Date.now()}`, `schedule_b_${Date.now()}`];
  const publishAt = new Date(Date.now() + 48 * 60 * 60_000).toISOString();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60_000).toISOString();
  let storedExpiry: string | undefined;
  let mutationCalls = 0;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.includes("/data/query/")) {
      const edition = {
        _key: "uae",
        publicationState: "approved",
        approvedBy: { _ref: "integration-reviewer" },
        approvedAt: "2026-09-05T12:00:00.000Z",
        ...(storedExpiry ? { expiresAt: storedExpiry } : {}),
      };
      return Response.json({
        result: {
          _id: `drafts.${subjectId}`,
          _rev: "schedule-draft",
          _type: "page",
          ownership: { owner: { _ref: "person.owner" } },
          marketEditions: [edition],
          resolvedMarkets: [{ ...edition, code: "uae" }],
        },
      });
    }
    if (url.includes("/data/mutate/") && init?.method === "POST") {
      mutationCalls += 1;
      return Response.json({ transactionId: "invalid-schedule" });
    }
    throw new Error(`Unexpected integration fetch: ${url}`);
  };
  const schedule = (requestId: string, includeExpiry: boolean) =>
    originalFetch(`${baseUrl}/api/cms/workflow/transitions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${publisherKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        requestId,
        subjectId,
        market: "uae",
        toState: "scheduled",
        publishAt,
        ...(includeExpiry ? { expiresAt } : {}),
      }),
    });
  try {
    const supplied = await schedule(requestIds[0]!, true);
    assert.equal(supplied.status, 409);
    storedExpiry = expiresAt;
    const preExisting = await schedule(requestIds[1]!, false);
    assert.equal(preExisting.status, 409);
    assert.equal(mutationCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
    await db
      .delete(cmsWorkflowEventsTable)
      .where(eq(cmsWorkflowEventsTable.target, `page:${subjectId}`));
  }
});

test("concurrent rollback retries execute one Sanity mutation and return one duplicate", async () => {
  const subjectId = `integration-rollback-${Date.now()}`;
  const requestId = `rollback_${Date.now()}`;
  const revisionId = `revision_${Date.now()}`;
  let mutationCalls = 0;
  const livePage = {
    _id: subjectId,
    _rev: "live-revision",
    _type: "page",
    marketEditions: [{ _key: "uae", publicationState: "published", title: "Live" }],
    resolvedMarkets: [{ _key: "uae", code: "uae", publicationState: "published" }],
  };
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.includes("/data/query/")) {
      const queryText = new URL(url).searchParams.get("query") ?? "";
      return Response.json({
        result: queryText.includes("revisionRecord")
          ? {
              snapshot: JSON.stringify(livePage),
              reason: "approved:published",
            }
          : livePage,
      });
    }
    if (url.includes("/data/mutate/") && init?.method === "POST") {
      mutationCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 40));
      return Response.json({ transactionId: requestId });
    }
    throw new Error(`Unexpected integration fetch: ${url}`);
  };
  const rollback = () =>
    originalFetch(`${baseUrl}/api/cms/workflow/rollbacks`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${workflowKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ requestId, subjectId, revisionId }),
    });
  try {
    const responses = await Promise.all([rollback(), rollback()]);
    assert.deepEqual(
      responses.map((response) => response.status).sort(),
      [200, 202],
    );
    assert.equal(mutationCalls, 1);
    const receipts = await db
      .select()
      .from(cmsWorkflowReceiptsTable)
      .where(eq(cmsWorkflowReceiptsTable.requestId, requestId));
    assert.equal(receipts.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
    await db
      .delete(cmsWorkflowEventsTable)
      .where(eq(cmsWorkflowEventsTable.target, `page:${subjectId}`));
    await db
      .delete(cmsWorkflowReceiptsTable)
      .where(eq(cmsWorkflowReceiptsTable.requestId, requestId));
  }
});