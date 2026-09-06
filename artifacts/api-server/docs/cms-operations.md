# CMS operations

CMS content is stored in PostgreSQL. Revisions, editions, workflow receipts,
outbox records, preview sessions, media references, and assistant provenance are
application data. Files are held in App Storage. Clerk is the identity source;
the CMS principal record and market assignments are the authorization source.
Never put database URLs, Clerk keys, preview signing keys, provider keys, or
storage credentials in browser code, documents, tickets, logs, or request
payloads.

## Development and production schema procedure

After a merge, run `scripts/post-merge.sh`. It installs the locked workspace,
pushes the development schema, verifies the CMS tables, and reconciles the
deterministic draft fixtures with `cms:seed`. The seed is idempotent: it may be
run again to repair missing drafts, but it does not publish content or activate
redirects.

Production schema promotion happens only through Replit Publish. Review its
development-to-production schema diff and accept the promotion there. Do not
run DDL, schema push, migration, or fixture seeding at production startup.
After Publish, use the read-only verification query or `verify:cms` with the
production connection before enabling editorial traffic.

## First publish and authorization

1. Enroll a Clerk user in `cms_principals` through the controlled operator
   process. Set the record active and add explicit market assignments in
   `cms_principal_markets`. Development may bootstrap the first local
   administrator; production never does.
2. Use the role/market matrix: author, regional editor, and admin create and
   update drafts in their assigned markets (creation requires assignments for
   every generated edition); author and regional editor move assigned-market
   drafts to review; reviewer independently approves; publisher schedules,
   publishes, expires, and archives; admin has managed all-market authority.
   A user must be assigned to the market unless an all-market admin has no
   assignments.
3. Import drafts through the normalized edition contract. Each payload must
   have schema version 1, its deterministic document ID, assigned market,
   fallback mode, and typed content. UAE is canonical. Another market uses UAE
   only when its own live edition explicitly selects `uaeFallback`; missing or
   unavailable editions are unavailable.
   Sitemap delivery additionally requires `CMS_PUBLIC_SITE_ORIGIN` (or
   `PUBLIC_SITE_ORIGIN`) to be an absolute HTTPS production origin. It is never
   derived from a development domain.
4. Create an immutable revision for every edit. Use the returned edition
   version for optimistic updates. A conflict means reload and reconcile; never
   overwrite a newer revision.
5. Move the target draft through review and independent approval. The editor or
   requester cannot approve or publish the same edition. Publish only an
   approved target revision. Public reads select only live revisions, so drafts
   do not leak.

Preview is revision-bound. An authorized editor issues a short-lived signed
exchange token for an exact revision, exchanges it from the same origin, and
receives an HttpOnly, strict cookie scoped to the preview route. Exchange is
one-time and expired, revoked, or replayed tokens are rejected. Rotate preview
signing keys as an ordered key ring: add the new signer first, wait past the
maximum session lifetime, then remove the old signer.

## Workflow, scheduling, and recovery

All mutations require Clerk authorization and a same-origin request. Request
IDs create durable workflow receipts, so a completed retry is a duplicate and
does not make another transition. The scheduler invokes the due-processing
route as a publisher or admin. Its PostgreSQL transaction-scoped advisory lease
allows one active pass; transitions and receipts tolerate stale races.

Transitions append workflow events and enqueue invalidation messages in the
outbox. Deliver the outbox with a worker that marks delivery only after the
consumer succeeds; retry safely by dedupe key. During incident recovery,
preserve receipts, events, outbox rows, and revisions before retrying workers.

## App Storage media

Upload media through the server authorization boundary, then create a media
asset/version record and revision media references. Store object identity,
digest, media metadata, and recovery status in PostgreSQL; do not treat a
client URL as authoritative. For a failed upload, mark the version recoverable,
verify object existence and digest, then either attach the verified object or
create a new version. Do not delete an object still referenced by an immutable
revision.

## Assistant governance

The editorial assistant is suggestion-only. It reads the exact current draft
target and approved sources, records redacted input digest, policy and prompt
versions, source revision provenance, provider/model usage, result or failure,
and requires an independent reviewer decision before applying a suggestion.
The requesting actor cannot decide that run. A stale target, changed field, or
changed revision fails closed; the decision path also checks the expected
resulting revision.

Before enabling or changing an assistant policy, rehearse stale-target,
source-approval, separate-decider, replay, and expiry cases. Keep the kill
switch available and review aggregate monitoring as an all-market administrator.

## Backup, restore, and release checklist

Back up PostgreSQL on the platform schedule, including CMS tables and App
Storage object inventory. Regularly rehearse restoring to an isolated
environment: restore database data, reconcile storage objects by digest, verify
revision and media-reference integrity, confirm receipts/outbox behavior, and
only then permit editorial access.

Go/no-go before the first publish:

- Development schema push, table verification, and two idempotent seed passes
  completed; editions remain `draft` and redirects remain inactive.
- Production schema promotion was reviewed and applied through Replit Publish.
- Active Clerk principals, least-privilege roles, and market assignments were
  independently checked.
- The intended revision validates, preview works and expires/rejects replay,
  and public delivery returns no draft data.
- Approval and publishing identities are distinct; scheduling, lease, receipts,
  and outbox recovery have been exercised.
- App Storage recovery and an isolated backup/restore rehearsal succeeded.
- No secret was exposed at any stage.