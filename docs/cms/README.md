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
| Industries | Value-led opportunity, multiple build capabilities, selected-work description, operating evidence/boundaries, sources and review dates, stable route/order, approved media |
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
# Verify document, revision, audit, receipt, and migration-account parity in that database.
pnpm --filter @workspace/scripts cms:verify -- --db
# Reconcile an empty or expanded development inventory; complete imports are left unchanged.
pnpm --filter @workspace/scripts cms:reconcile
```

`cms:inventory` deterministically extracts the complete public fields for eight people, five partners, five platforms, six industries, and three articles. Industry payloads include the same required opportunity, build-capability, and selected-work contract as the compiled fallback. Its media catalog contains all CMS-managed website raster images and exactly nine publish-ready LinkedIn PNGs (six posts and three headers). Logos, editable SVGs, ZIPs, and the code-owned CogniOS annotation are excluded. `cms:import` creates payload-only operations by default. With the development safeguard, it uploads and checksum-verifies durable objects before idempotently creating UAE/English draft editions, exact revision media references, immutable media versions, redacted audits, and receipts. The suspended migration identity has no credential or session. Migrated claims and website media remain drafts/pending review. `cms:verify -- --db --write` proves row, payload, media-version, reference, receipt, audit, and draft-isolation parity, reports preserved legacy receipt drift, and writes the cutover report.

Post-merge setup runs `cms:reconcile` after applying the schema and with App Storage configured. Every run verifies database checksum/size/version state and checks each object’s GCS size plus stored checksum or provider MD5 against the repository source. Missing catalog rows are created; deferred, absent-version, or incomplete rows receive a new verified immutable version and their mutable asset pointer is repaired. A valid immutable version is reused, never overwritten. The terminal summary reports missing, invalid, conflicts, created, repaired, and reused counts. Binary conflicts, stale receipt subjects, or an unavailable/invalid object fail setup for operator review; metadata-only legacy receipt drift is reported and preserved rather than overwriting immutable media.

Post-merge setup also runs the targeted `cms:reconcile-value-to-scale-hero`
command. It is receipt-governed and development-only, verifies the exact
repository JPEG by durable storage readback, and creates the dedicated website
media asset without associating it to a CMS page or changing any published pin.
Rights and accessibility remain in the normal `needs-review` gates until an
authorized publisher reviews the asset.

Generated payload writing is restricted to `scripts/cms/output/`. Database mutation is restricted to the explicit `cms:import -- --apply-db` path and requires `DATABASE_URL`. Review every `needs-review` item before approval or publication. Never treat this inventory as approval for claims, image rights, sources, or market visibility.

See [governance](governance.md), [content cutover](content-cutover.md), [operations](operations.md), [security](security.md), [backup and restore](backup-restore.md), and [retention and privacy](retention-privacy.md).