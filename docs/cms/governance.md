# CMS governance and release checklist

## Editorial gates

1. Editor validates structured fields, references, accessibility text, market inheritance, and preview.
2. Content owner checks facts, named-client permission, sources, verification and review dates.
3. Administrator checks role boundary, visibility, routes/redirects, SEO/social metadata, related records, and UAE/override publication state.
4. Administrator publishes or rolls back; record the result and request ID in the audit log.

No evidence-backed claim, metric, partner affiliation, title, or local-presence statement is publishable without its source, verification date, review date, and approval. Never use a generic image where a profile requires a human/partner asset unless an approved fallback is recorded. Drafts and restricted records stay absent from public APIs, sitemap, analytics, caches, and unauthenticated previews.

## Release checklist

- [ ] Approved change list, owner, markets, and rollback target recorded.
- [ ] Required fields, links, references, claim evidence, rights, and alt/decorative decisions validated.
- [ ] Preview checked while authenticated or through a short-lived signed link; preview is `noindex, no-store`.
- [ ] Published UAE dependencies and required market overrides are present; fallback behavior reviewed.
- [ ] Stable slugs, canonical URL, redirects, title, Open Graph, structured data, and sitemap impact reviewed.
- [ ] Administrator approval and audit-event result confirmed.
- [ ] Public response contains only published, non-restricted data; no form data, draft, or admin metadata.
- [ ] Post-release health and representative routes checked; failed release follows rollback procedure.

## Routing and bundle isolation

- [ ] `/admin/` is routed to the dedicated admin artifact before `/`; deep links resolve there.
- [ ] `/api` remains served by the API artifact.
- [ ] Public routes remain served by the website artifact.
- [ ] Admin responses are no-index and public sitemap/robots never include admin or previews.
- [ ] Public build has no static import, dependency, chunk, or route from the admin artifact.
- [ ] Admin build does not import public application modules merely for convenience; shared contracts must live in a neutral package.

## Rollback rehearsal controls

Only an Administrator may execute or authorize a production content rollback. The development rehearsal command has a double explicit opt-in and rejects `NODE_ENV=production`:

```sh
NODE_ENV=development pnpm --filter @workspace/scripts cms:rehearse-rollback -- \
  --development --rehearse-rollback
```

The rehearsal proves only revision semantics and transactional cleanup for a temporary development fixture: a rollback creates a new draft from an approved revision and leaves the published/current approved selection intact. It does not authorize production writes, publish a migrated claim, or prove database/media restoration. Before an actual release, record the rollback target, approver, communication/stop conditions, cache plan, and associated media snapshot. The successful development rehearsal is recorded in [backup and restore](backup-restore.md).