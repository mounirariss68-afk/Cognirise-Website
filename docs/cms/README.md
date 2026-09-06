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
# Transactionally create UAE draft documents/revisions in the configured database.
pnpm --filter @workspace/scripts cms:import -- --apply-db --write
# Verify document, revision, audit, receipt, and migration-account parity in that database.
pnpm --filter @workspace/scripts cms:verify -- --db
```

`cms:inventory` reads the existing website TSX and `public/images`, inventories founders, advisors, five partners, five platforms, three articles, and static assets, and emits a review register. `cms:import` creates payload-only operations for all non-asset records by default. With `--apply-db`, it transactionally and idempotently creates UAE draft documents and revisions: articles map to `publication`; founders/advisors map to `person`. Stable slugs and structured source/review metadata are preserved in the revision payload. It attributes revisions to a suspended viewer-only migration account, without a password or session, and records redacted audit events and idempotency receipts. Migrated claims remain drafts pending approval. `cms:verify` checks inventory/payload coverage; `--db` additionally checks database parity without changing it.

Generated payload writing is restricted to `scripts/cms/output/`. Database mutation is restricted to the explicit `cms:import -- --apply-db` path and requires `DATABASE_URL`. Review every `needs-review` item before approval or publication. Never treat this inventory as approval for claims, image rights, sources, or market visibility.

See [governance](governance.md), [operations](operations.md), [security](security.md), [backup and restore](backup-restore.md), and [retention and privacy](retention-privacy.md).