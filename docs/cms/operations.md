# CMS operations and incident procedure

## Routine operations

Daily: review failed publishes, overdue evidence/review dates, media upload failures, privileged-account changes, export events, and health status. Weekly: review draft backlog, archive candidates, dependency updates, error trends, and backup completion evidence. Monthly: access review, restore-readiness review, retention job results, and a sample audit-log review.

## Media catalog reconciliation

The approved catalog is 38 CMS-managed website raster images plus exactly nine
LinkedIn PNGs: six `post` images and three `header` images in the `linkedin`
collection. SVG/ZIP masters, logos, and code-owned UI imagery are intentionally
excluded. Each operation carries collection, LinkedIn kind where applicable,
campaign metadata, descriptive alt text, credit, dimensions, source checksum,
and usage.

Run only in development, with `DATABASE_URL`,
`DEFAULT_OBJECT_STORAGE_BUCKET_ID`, and `PRIVATE_OBJECT_DIR` configured:

```sh
pnpm --filter @workspace/scripts cms:inventory -- --write
pnpm --filter @workspace/scripts cms:reconcile
```

Reconciliation uploads to a checksum-addressed private object and verifies its
GCS size plus stored checksum or provider MD5 against the source before database success. It then
reports `missing`, `invalid`, `conflicts`, `created`, `repaired`, and `reused`.
On a rerun, valid immutable versions are reused. A deferred key, missing object,
missing version, wrong size, or wrong checksum is incomplete: when the source
is available the tool appends a verified version and repairs the mutable asset
pointer; it does not update or delete the old immutable version. Any remaining
invalid item or receipt conflict is an operator-visible failure.

Never use `--defer-media-upload` for a database import; it is rejected. Do not
copy production credentials into development or bypass the explicit
`--target=development` and production-environment guards.

After explicit visual approval of the nine-image Pulse industry family, publish
the six existing UAE/English industry associations with the dedicated,
idempotent cutover. Manufacturing, Defense, and Retail & CPG remain approved
media with no document reference:

```sh
pnpm --filter @workspace/scripts cms:publish-industry-images -- --apply-db --target=development
pnpm --filter @workspace/scripts cms:publish-industry-images -- --verify-db --target=development
```

The cutover creates a new approved revision for each of the six existing
industries, pins the exact immutable media version, and preserves every previous
revision, media asset, and media version. Do not run it before the complete
family receives explicit visual approval.

Before enabling the industry switch, verify that all six published revisions
also satisfy the current required industry content contract: a value-led
`opportunity`, at least two titled `capabilities`, and
`selectedWork.description`. The `cms-industry-contract-v6:` inventory baseline
is idempotent. It appends at `max(revision_number) + 1` only when the edition is
published, points to its latest revision, and its complete history consists
solely of the receipt/audit-backed inventory migration and approved Pulse
image cutovers with the expected stored-result, stored content-digest, revision
order, and payload-copy relationship. Canonical key ordering prevents JSONB
object ordering from appearing as content drift. Legacy cutover audits without
`sourceRevisionId` require their exact receipt and payload chain; a present
source ID must match.
Revision 1 is checked against its own immutable migration result, and each Pulse
revision must copy its predecessor except for hero/media IDs; historical
`content.image` is not compared with today’s fallback path. The current
hero must be active/ready and referenced through its approved immutable media
version; v4 copies both IDs and never creates an unpinned reference. The complete
snapshot is publish-validated before the pointer moves. An exact valid v3
broadened publication is reused without another revision. The known v3 defect
is repairable only when that exact provenance-backed snapshot matches today’s
contract after media normalization, has one matching
unpinned reference and immediately follows the governed Pulse revision with its
active/ready immutable pin. V6 then appends the v3 content with only hero/media
IDs replaced by the prior Pulse pin and records explicit repair audit metadata.
Any other missing pin, provenance gap, payload change, reason/state/sequence
difference, or pointer mismatch records a preservation receipt without
publishing or overwriting.

The AI Value-to-Scale route artwork has a separate, development-only media
reconciliation. It uploads the exact supplied JPEG to checksum-addressed private
storage, downloads it again to verify the SHA-256 checksum, and creates one
dedicated website asset and immutable version:

```sh
pnpm --filter @workspace/scripts cms:reconcile-value-to-scale-hero -- --apply-db --target=development
pnpm --filter @workspace/scripts cms:reconcile-value-to-scale-hero -- --verify-db --target=development
```

The asset remains `pending-review`, with rights and accessibility both
`needs-review`; the supplied-use request is source evidence, not approval. The
command never creates a page association or changes a revision/publication pin.
The generic inventory explicitly excludes this path because the targeted
receipt is its single owner. The command reports page candidates separately
from actual media references and fails on an unexpected reference to the legacy
`method-vts.jpg`. Replay validates the receipted original immutable version and
durable bytes without reverting later editor metadata or replacement versions.
The immutable source version retains `needs-review` rights/accessibility
metadata; changing only the asset workflow status through `/media/:id/review`
does not clear those source-metadata gates.

Once the transaction verifies successfully, enable the existing
`VITE_CMS_CUTOVER_INDUSTRIES=true` environment gate for the target environment
and restart the website workflow. This makes the published CMS records
authoritative while retaining the compiled fallback for rollback.

## Backup operations

On the approved backup schedule, an operator exports and verifies content metadata with a caller-supplied private directory:

```sh
pnpm --filter @workspace/scripts cms:backup -- --out=/secure/cms-backups/content-YYYY-MM-DD
pnpm --filter @workspace/scripts cms:verify-backup -- --out=/secure/cms-backups/content-YYYY-MM-DD
```

This export is metadata-only: it excludes authentication secrets/sessions, forms/submissions, raw analytics, audit events, and media binaries. Follow the exact `pg_dump` and App Storage copy procedures in [backup and restore](backup-restore.md) for separately controlled full-database and media-binary protection. Record the directory owner, environment, manifest checksum, retention expiry, and verification result without recording credentials or raw content.

## Health checklist

- [ ] `/api/healthz` reports database liveness and `/api/readyz` reports generic
  200/503 readiness for database, required schema compatibility, and a
  representative public-navigation query, including the receipt/outbox
  delivery schema; neither exposes SQL, content, or private data.
- [ ] The additive 0027 receipt/outbox merge preparation is run only by the
  development `prepare-schema-push` step before a safe schema push. Production
  applies the checked-in migration chain; API startup performs no DDL.
- [ ] Database connectivity, migration version, queue/job processing, durable media storage, and backup job status are healthy.
- [ ] Public published-content query works for UAE and an override/fallback market.
- [ ] Admin login, MFA, CSRF/origin rejection, and a non-mutating authorized request work in the approved environment.
- [ ] Sitemap excludes drafts/restricted/admin routes; preview is no-store/no-index.
- [ ] Health result, time, operator, environment, and incident link are recorded.

## Disposable browser fixture and preservation baseline

Provision browser fixtures only against an isolated development database:

```sh
NODE_ENV=development pnpm --filter @workspace/scripts cms:owner-browser-fixture -- \
  --development baseline --baseline /tmp/cognirise-cms-preservation-baseline.json
NODE_ENV=development pnpm --filter @workspace/scripts cms:owner-browser-fixture -- \
  --development setup --credentials /tmp/cognirise-owner-fixture.json
# Run the authenticated browser/API journey, then:
NODE_ENV=development pnpm --filter @workspace/scripts cms:owner-browser-fixture -- \
  --development cleanup --credentials /tmp/cognirise-owner-fixture.json
```

The baseline command is read-only and must be run before approved fixture
activity. Its mode-600 `/tmp` output contains only identifiers, publication
pointers, revision counts/digests, market-availability decisions, and
immutable media pins. Cleanup discovers later browser-created documents through
exact fixture identities, deletes dependents before authors/users, and refuses
to proceed when a non-fixture reference or residual owned row is found. Never
use a prefix-only SQL deletion or place the state/baseline files in source
control, logs, tickets, or chat.

## Expired media staging janitor

The staging janitor is deliberately a separate operator command, not API
startup work and not part of media finalization. It is a dry run by default:

```sh
pnpm --filter @workspace/scripts cms:media-staging-janitor -- \
  --older-than-hours=24
```

It lists only the private `cms-media/staging/` namespace and reports candidates
without changing the database or storage. Apply requires an explicit flag:

```sh
pnpm --filter @workspace/scripts cms:media-staging-janitor -- \
  --apply --older-than-hours=24
```

Before applying, review the report and confirm the configured bucket and
private directory. A candidate must have an old storage generation, an old
pending asset session (or a janitor terminal marker), no media versions, no
media references, and no published revision payload reference. The janitor
locks the asset row with `FOR UPDATE SKIP LOCKED`, commits a terminal marker
before deleting, and uses the storage generation as a delete precondition.
Finalization therefore either wins the row lock or observes the terminal
state; it cannot race into a deleted staging object. Missing generation,
recent objects, malformed paths, active/retryable sessions, committed
immutable objects, published references, failed transactions, or uncertain
storage state are retained and reported. A failed deletion is retryable from
its committed marker, and repeat runs are idempotent.

## Published-revision migration gate

Migration `0006_cms_published_revision` deliberately leaves any pre-existing
published or scheduled edition without a revision pointer unavailable to public
delivery. The old schema did not record which approved revision was actually
selected, so automatically choosing the newest approved revision could disclose
unreleased content. After applying the migration, list editions whose
`published_revision_id` is null, review the intended revision with an
administrator, and explicitly republish it. Do not populate the pointer from
“latest approved” as an unattended migration shortcut.

## Incident procedure

1. Triage and classify: availability, unauthorized access, content integrity, data/privacy, or media loss. Preserve request IDs, audit IDs, and timestamps.
2. Assign incident lead; restrict communications to approved channels. Do not put credentials, personal data, or raw form content in tickets.
3. Contain: revoke sessions/tokens, disable affected account/content, isolate public endpoint/cache, or pause publishing as appropriate.
4. Assess affected records, markets, exports, backups, and audit coverage. Escalate privacy/legal notification decisions to the designated owner.
5. Recover using the approved backup/restore or content rollback runbook, then validate public and administrative boundaries.
6. Document cause, impact, decisions, notifications, recovery evidence, and corrective actions. Preserve audit evidence under its approved retention schedule.

## Account recovery

- [ ] Verify identity through an out-of-band approved procedure; never accept email possession alone as a bypass.
- [ ] Administrator invalidates existing sessions and recovery codes; records reason and request ID.
- [ ] Issue a one-time, short-lived reset/invitation route through the approved channel.
- [ ] User sets a new password, enrolls TOTP, receives replacement recovery codes once, and signs in.
- [ ] Confirm least-privilege role; review unexpected exports/content changes before closing.

Emergency access must be time-bounded, individually attributable, MFA-protected, audited, and removed after incident recovery.