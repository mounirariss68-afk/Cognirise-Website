# CMS operations and incident procedure

## Routine operations

Daily: review failed publishes, overdue evidence/review dates, media upload failures, privileged-account changes, export events, and health status. Weekly: review draft backlog, archive candidates, dependency updates, error trends, and backup completion evidence. Monthly: access review, restore-readiness review, retention job results, and a sample audit-log review.

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