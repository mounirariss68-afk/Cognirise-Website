# CMS operations and incident procedure

## Routine operations

Daily: review failed publishes, overdue evidence/review dates, media upload failures, privileged-account changes, export events, and health status. Weekly: review draft backlog, archive candidates, dependency updates, error trends, and backup completion evidence. Monthly: access review, restore-readiness review, retention job results, and a sample audit-log review.

## Media catalog reconciliation

The approved catalog is 32 CMS-managed website raster images plus exactly nine
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

- [ ] API health endpoint (when implemented) returns expected authenticated/public status without sensitive details.
- [ ] Database connectivity, migration version, queue/job processing, durable media storage, and backup job status are healthy.
- [ ] Public published-content query works for UAE and an override/fallback market.
- [ ] Admin login, MFA, CSRF/origin rejection, and a non-mutating authorized request work in the approved environment.
- [ ] Sitemap excludes drafts/restricted/admin routes; preview is no-store/no-index.
- [ ] Health result, time, operator, environment, and incident link are recorded.

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