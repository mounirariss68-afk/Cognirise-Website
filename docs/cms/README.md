# Cognirise CMS operations

This directory is the operational record for the first-party CMS. It documents the intended operating boundary; it does not assert that the CMS, migrations, backups, or recovery rehearsal already exist.

## Content boundary and ownership

The canonical market is UAE. KSA, Türkiye, and Europe may hold approved field overrides and otherwise inherit approved UAE values. A missing, archived, or unpublished override falls back to UAE. Market selection is explicit; do not infer it by visitor location.

| Record | Required operational controls |
| --- | --- |
| People and advisors | Role/title, biography/contribution, source, verification/review dates, market visibility, order, status, approved image or fallback |
| Partners | Category, positioning, evidence and claims, website, source/verification/review dates, market visibility, order, status |
| Platforms | Summary, stable route slug, media, capability/differentiator references, CTA, SEO, visibility, order, status. CogniOS specialist interaction remains code-owned. |
| Articles/POVs | Structured body, author, published/updated dates, derived reading time, taxonomy, hero/PDF, sources, review date, SEO/social data |
| Case studies | Named/anonymized/restricted visibility, evidence approval, sources and review dates. Restricted records must never be served publicly. |
| Media | Approved type, checksum, dimensions, owner, source, rights, alt text or decorative flag, rendition/reference state |

Only Administrators publish, roll back, manage users, and authorize exports. Editors create/revise drafts and submit for review. Published slugs require an explicit Administrator redirect/approval decision; do not overwrite them casually. All mutations, publication, rollback, account events, previews, uploads, and exports require redacted audit events.

## Migration commands

Run from the repository root. Every command defaults to non-writing/safe behavior. `--write` only saves generated payload material; database writes require the separate, explicit `--apply-db` flag.

```sh
pnpm --filter @workspace/scripts cms:inventory
pnpm --filter @workspace/scripts cms:inventory -- --write
pnpm --filter @workspace/scripts cms:import -- --write
pnpm --filter @workspace/scripts cms:verify
# Transactionally create UAE/English drafts in development only.
pnpm --filter @workspace/scripts cms:import -- --apply-db --target=development --write
# If App Storage sidecar credentials are unavailable, preserve private pending
# media metadata without claiming durable upload or approval:
pnpm --filter @workspace/scripts cms:import -- --apply-db --target=development --defer-media-upload --write
# Verify document, revision, audit, receipt, and migration-account parity in that database.
pnpm --filter @workspace/scripts cms:verify -- --db
# Reconcile an empty development database after a merge; complete imports are left unchanged.
pnpm --filter @workspace/scripts cms:reconcile
```

`cms:inventory` deterministically extracts the complete public fields for five people, five partners, five platforms, and three articles and reconciles 22 governed assets. `cms:import` creates payload-only operations by default. With the development safeguard, it idempotently creates UAE/English draft editions, exact revision media references, immutable media versions, redacted audits, and receipts. The suspended migration identity has no credential or session. Migrated claims and media remain drafts/pending review. `cms:verify -- --db --write` proves row, digest, payload, media-version, reference, receipt, audit, and draft-isolation parity and writes the cutover report.

Post-merge setup runs `cms:reconcile` after applying the schema. On an empty database, reconciliation imports deferred-media drafts and runs full database parity verification. On later merges, it validates the immutable receipt digests and their document/media subjects, then leaves current editorial workflow and publication state untouched. A partial import, digest conflict, or missing receipt subject fails setup for operator review instead of attempting destructive repair.

Generated payload writing is restricted to `scripts/cms/output/`. Database mutation is restricted to the explicit `cms:import -- --apply-db` path and requires `DATABASE_URL`. Review every `needs-review` item before approval or publication. Never treat this inventory as approval for claims, image rights, sources, or market visibility.

See [governance](governance.md), [content cutover](content-cutover.md), [operations](operations.md), [security](security.md), [backup and restore](backup-restore.md), and [retention and privacy](retention-privacy.md).