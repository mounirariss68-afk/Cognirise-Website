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

## Governed editorial assistant

`POST /api/cms/editorial-assistant/runs` is a suggestion-only, server-side
orchestrator. It accepts a closed structured request containing a workflow
request ID, page ID, assigned market, operation, draft text, and one to twelve
Sanity source IDs. It never accepts caller-supplied roles, arbitrary prompts,
GROQ, source text, provider settings, or mutations. Only published
`approvedSource` records with `approvalStatus=approved`, a `public` or `internal`
classification, explicit market approval, current verification/review dates,
and no elapsed expiry are
sent to the provider. Before provider invocation, the API also retrieves the
target draft itself and verifies its type, exact revision, exact field value,
stored processing classification, and market-edition ownership. A caller cannot
relabel or substitute target content. Source and target content are checked for
restricted patterns, redacted, bounded by `CMS_ASSISTANT_MAX_SOURCE_CHARS`, and
explicitly delimited as untrusted data.

The response is structured as a suggestion, verified claim-to-source citations,
uncertainties, a replacement diff, deterministic gate outcomes, and a policy
version. Each citation claim must be an exact suggestion span, each quote must
be verbatim in the cited source revision, and the citation claims must
collectively cover every letter and number in the suggestion (internal-link
destinations are verified separately). Non-translation claims must have a
strong deterministic lexical binding to their quote. Translation requires each
complete target sentence or line to map one-to-one to a distinct complete
source sentence or line within a bounded token-length ratio while preserving
source order. Missing/mismatched citations,
restricted output, malformed JSON, an upstream error, or timeout fails closed
and never changes CMS content. Email,
phone, network address, postal address, labelled name/identity number, and long
identifier values are redacted before provider submission and persistence.
JWT, Basic/Bearer authorization, cloud/service tokens, cookies/sessions, signed
URLs, credential-bearing connection strings, generic secret assignments,
private keys, and malicious-instruction patterns are blocked before provider
invocation. The same personal and restricted patterns are checked across the
entire provider suggestion, every citation claim and quote, and every
uncertainty before persistence or response. Any match—including a redacted
placeholder—fails closed; generated output is never silently rewritten.

Enable with `CMS_ASSISTANT_ENABLED=true`. `CMS_ASSISTANT_KILL_SWITCH=true`
overrides it immediately. Optional bounded controls are
`CMS_ASSISTANT_TIMEOUT_MS` (1–30 seconds),
`CMS_ASSISTANT_HOURLY_REQUEST_LIMIT` (per authenticated actor), and
`CMS_ASSISTANT_DAILY_COST_MICROS` (deployment-wide rolling 24 hours).
`CMS_ASSISTANT_INPUT_MICROS_PER_MILLION_TOKENS` and
`CMS_ASSISTANT_OUTPUT_MICROS_PER_MILLION_TOKENS` configure conservative
reservation and actual-usage reconciliation against the selected model's
rates. The
provider defaults to `gpt-5.6-luna` and may be selected with
`CMS_ASSISTANT_MODEL`. Replit AI Integrations supplies the server-only
`AI_INTEGRATIONS_OPENAI_BASE_URL` and compatibility key; neither is returned,
logged, or persisted. The provider is behind an internal interface so a future
provider can preserve the same policy and validation boundary.

Runs and usage are recorded in `cms_assistant_runs`; only redacted input
digests, source IDs/revisions, policy/provider/model, structured result, usage,
and failure code are retained. Request replay is allowed only when the
authenticated actor and canonical redacted payload digest both match the
completed run. Human decisions have one immutable decision per run in
`cms_assistant_decisions`, with a recoverable `pending`/`audit_failed`/`confirmed`
audit state, and are mirrored to Sanity `auditEvent`. A reviewer,
publisher, or administrator assigned to the run market must independently call
`POST /api/cms/editorial-assistant/decisions`. The requesting actor cannot
decide their own run. Acceptance requires the current Sanity revision and its
matching `assistantReview` quarantine marker. The API first records a pending
decision, then atomically creates the Sanity audit event and removes the marker
with a revision precondition, and finally confirms the database audit state.
The same decision payload safely reconciles an interrupted attempt. While the
marker remains, manual publishing and trusted workflow transitions are blocked.
The decision endpoint never applies generated text.

### Evaluation cases

Before enablement and after policy/provider changes, verify: a normal rewrite
with an exact approved citation; expired, withdrawn, draft, missing, and
cross-ID sources; a citation quote absent from its source; prompt injection in a
source and draft; unrelated quote-to-claim binding; source and target
classification mismatch; target field, type, revision, and market substitution;
aggregate source-budget exhaustion; a valid first citation followed by an
uncited factual sentence; translation with a partial or reused source unit;
email/phone/address/identifier redaction; JWT, authorization header,
cloud-token, signed-URL, connection-string, cookie/session, and private-key
blocking; malformed/empty/oversized provider JSON; restricted provider output;
provider 429/500 and timeout; kill switch during an incident; repeated request
IDs with the same actor/payload and with changed actor/payload; hourly and daily
limits; self-acceptance; acceptance with a stale revision or missing quarantine;
audit-store interruption and idempotent reconciliation; and rejection without a revision. Acceptance criteria are no CMS mutation from
a run, no unapproved grounding, all citations verbatim, explicit uncertainty,
closed failures, and complete run/decision provenance.

### Incident runbook

1. Set `CMS_ASSISTANT_KILL_SWITCH=true`; do not disable normal CMS delivery.
2. Preserve `cms_assistant_runs`, `cms_assistant_decisions`, and correlated
   `cms_workflow_events`. Record policy/model/request IDs, never provider keys or
   raw sensitive input.
3. Reject pending suggestions and use normal CMS revision/rollback governance
   for any human-applied revision. The assistant has no direct rollback path.
4. For suspected source contamination, withdraw affected `approvedSource`
   documents, identify runs by source provenance, and review resulting
   revisions and decisions.
5. For cost/rate anomalies, keep the switch engaged, inspect token/cost totals
   and actor/request patterns, then lower limits or rotate the compromised CMS
   workflow credential through the established credential process.
6. Restore only after evaluation cases pass with a reviewed policy/provider
   change. Re-enable by clearing the kill switch; never bypass gates or source
   approval to recover availability.

### Operation scope and progressive rollout

Supported operations are `draft-generation`, `summary`, `report-abstract`,
`transcript-cleanup`, `chapters`, `newsletter-variants`, `market-adaptation`,
`translation`, `seo-metadata`, `tags`, `alt-text`, `internal-links`,
`quality-review`, and legacy `rewrite`. Every request includes a strictly
validated target field path, content type, language code, and maximum length;
these are not inferred from free-form instructions. Transcript cleanup targets
`transcript`; chapter suggestions target `chapterNotes`; newsletter variants
target `newsletterVariants`; tags target `topics`; alt text targets `altText`;
internal links target `internalLinkSuggestions`; and translation/market
adaptation target an explicitly keyed `marketEditions` field.
Chapter output must provide timestamp-prefixed lines, and newsletter output must
provide exactly three subject/preheader pairs; malformed provider output fails
closed rather than being normalized in Studio.

`CMS_ASSISTANT_OPERATIONS` is a server-only comma-separated allowlist. The
low-risk default enables summaries, abstracts, transcript cleanup, newsletter
variants, SEO/tags/alt text, and quality review. Drafting, chapters, rewrite,
market adaptation, translation, and internal links require explicit enablement.
Progress from disabled evaluation, to one low-risk operation for a small cohort,
to one additional operation at a time with daily monitoring. Enable
market/language and link operations only after regional editorial sign-off.

The server rejects unsupported numeric claims, source-market mismatch,
expired/review-due proof, prohibited wording, field-length breaches, missing
alt text, empty SEO values, and citation mismatches. The source ledger retains
policy and prompt-template versions, latency, provider/model, token/cost data,
source-revision provenance, output or failure code. Blocked/failed actions are
auditable. `GET /api/cms/editorial-assistant/monitoring` is all-market-admin
only and returns only rolling 24-hour aggregate usage, failures, latency,
spend, acceptance/rejection, and accepted-with-edits metrics—never raw content
or credentials. It also reports decisions whose cross-store audit has not yet
reached `confirmed`.