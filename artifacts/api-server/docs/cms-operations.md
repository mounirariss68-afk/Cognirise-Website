# CMS operations

The API starts without Sanity configuration. Published page requests then return
the versioned `cms-migration-v1` response (`page: null`); preview, webhook, and
workflow operations fail explicitly. UAE (`uae`) is canonical. KSA (`ksa`),
Türkiye (`turkiye`), and Europe (`europe`) resolve to UAE only when their own
market-edition record is live and explicitly declares `uaeFallback`; missing,
unavailable, expired, or otherwise non-live editions never silently fall back.

## Database schema deployment

The Drizzle schema in `lib/db/src/schema/cms-governance.ts` is the schema source
of truth. Replit applies it to development after task merges through
`scripts/post-merge.sh`, which runs the database push and then
`pnpm --filter @workspace/db verify:cms`. That verification must confirm all
four governance tables before workflow traffic is enabled.

Production schema changes must use Replit's supported Publish flow: Publish
diffs the development and production schemas, displays the SQL/rename decisions,
and applies the accepted diff to production. Do not add startup DDL, a deploy
hook, or a custom production migration script. After publishing, confirm the
four tables exist in the production database before enabling preview, webhook,
or workflow callers.

## Configuration and key rotation

Configure `SANITY_PROJECT_ID` and `SANITY_DATASET` for published delivery.
`SANITY_API_TOKEN` is server-only and required for draft preview. Never expose it
to a browser. Configure `SANITY_WEBHOOK_SECRET` and `CMS_PREVIEW_SECRETS` (at
least 32 characters each). Configure `CMS_WORKFLOW_CREDENTIALS` as a JSON array
of server-to-server credentials, for example
`[{"id":"sanity-person-document-id","role":"publisher","markets":["uae","ksa"],"key":"...32+ chars..."}]`.
Supported roles are `author`, `regionalEditor`, `reviewer`, `publisher`, and
`admin`; only an admin may declare `"markets":"all"`. All other principals must
list one or more assigned API market codes. The credential ID used for approvals must identify the approver's
Sanity person document. Never accept role or actor identity from a request body.

`CMS_PREVIEW_SECRETS` is an ordered comma-separated key ring: the first key
signs, while every key verifies. Rotate by adding the new key first, deploy,
wait at least one hour (the maximum token lifetime), then remove the old key.
Rotate the workflow and webhook keys at their callers and server in a coordinated
maintenance window. Preview issue tokens are one-time capabilities: only their
digest and expiry are stored, exchange atomically consumes the digest, and every
successful or replayed exchange is appended to the audit trail. The resulting
preview cookie is HttpOnly, SameSite=Strict, scoped to the preview API, and
expires with its signed market-and-slug claim.

## Trusted release workflow

The API exposes only fixed page workflow operations; it accepts no caller GROQ
or mutation input:

- `POST /api/cms/workflow/transitions` — body:
  `{requestId, subjectId, market, toState, publishAt?, expiresAt?}`.
- `POST /api/cms/workflow/rollbacks` — body:
  `{requestId, subjectId, revisionId}`; all-market admin only.
- `POST /api/cms/workflow/process-due` — no body; publisher/admin only. Invoke
  from an authenticated scheduler to publish due editions and mark expired
  editions for expiry review.
- `POST /api/cms/workflow/preview-tokens` — issue one-time preview exchange
  capabilities.

The server independently enforces draft review, approval, scheduling, publish,
expiry, and archive transitions by role. Sensitive Sanity mutations atomically
create an immutable `revisionRecord` and append-only `auditEvent`. A market
publish composes the live document from the prior published edition set plus
only the approved target edition. It never copies another market's pending
draft, and it retains the draft document so other market work can continue.
Release revisions contain the composed published snapshot; rollback rejects
intermediate review/draft snapshots. After release, the target edition in the
retained document is reset to `draft` and its prior approval/release dates are
cleared, creating the next server-governed authoring revision without manual
publisher or administrator intervention.
Scheduling derives the effective publish and expiry dates from the request and
approved edition, and rejects any expiry at or before publication. Rollback
request IDs are serialized with a PostgreSQL transaction lock; completed
receipts return `200 duplicate` without repeating the Sanity mutation.
Local
idempotency receipts and audit events provide an operational ledger; retain the
governance tables (`cms_workflow_events`, `cms_workflow_receipts`,
`cms_preview_token_nonces`, and `cms_webhook_receipts`). Rollback creates a snapshot of the replaced
version and an audit event before restoring the chosen immutable revision.
When a request enters review, the server records the authenticated principal as
the edition's last editor/requester. A reviewer, publisher, or admin with that
same server-derived identity cannot subsequently approve or publish that
edition; request bodies never supply an actor identity. The approval actor is
also retained in a read-only edition workflow field.

Sanity dataset roles, SSO groups, token scopes, and scheduler provisioning remain
operator responsibilities. Provision a separate machine service identity for
`SANITY_API_TOKEN`: it must write governed content and create governance
records, but must have no update/delete permission on `revisionRecord` or
`auditEvent`, and no dataset/project administration permission. This ACL is
enforced by Sanity project/dataset provisioning, not by Studio field readOnly
settings or this API alone.

## Outage and recovery

Published reads resolve `marketEditions` (including independent
`publicationState`, `publishAt`, and `expiresAt`) rather than page-level market
fields. They use a short in-memory cache and may serve its deterministic
stale value for up to 24 hours during a Sanity outage. Both fresh and stale
deadlines are capped at the next `publishAt` or `expiresAt` boundary, so cached
content is never served beyond expiry and schedules are re-evaluated when due.
With no usable cache they
return the versioned migration fallback. Draft preview never uses this cache or
fallback and returns 503 on a CMS error. After recovery, a valid publish webhook
clears the cache; otherwise entries refresh naturally.

Webhook delivery requires the exact raw JSON body plus
`sanity-webhook-timestamp`, `sanity-webhook-signature`, and
`sanity-webhook-id`. Sign `timestamp + "." + rawBody` with HMAC-SHA256.
Timestamps outside five minutes are rejected. Durable event IDs make retries
idempotent; payload digests are audit data and are not globally unique. Reusing
an event ID with a different signed body is rejected as a conflict, while two
distinct event IDs may legitimately carry the same body. Retain the
`cms_webhook_receipts` and append-only
`cms_workflow_events` tables during recovery.

## Export and audit recovery

Use Sanity's authenticated dataset export tooling under the organisation's
normal access controls; do not route exports through this API. Back up all CMS
governance tables with the PostgreSQL backup process. Restore receipts
before re-enabling webhooks to avoid replaying previously accepted events.
Audit exports should contain workflow metadata only: this implementation stores
no enquiry or personal data.