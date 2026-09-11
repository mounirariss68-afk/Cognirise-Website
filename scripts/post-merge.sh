#!/bin/bash
set -e

pnpm install --frozen-lockfile
pnpm --filter @workspace/api-spec run codegen
pnpm run typecheck:libs
pnpm --filter @workspace/db prepare-schema-push
# A forced schema sync can drop columns/indexes before the receipt-backed
# reconciliation runs. Keep this boundary non-destructive so immutable media
# review metadata survives a merge.
pnpm --filter @workspace/db push
pnpm --filter @workspace/scripts cms:reconcile
pnpm --filter @workspace/scripts cms:reconcile-site-hero-media -- --apply-db --target=development
# Schema push applies columns and tables only; this development-only command
# performs the guarded historical availability/source reconciliation afterwards.
pnpm --filter @workspace/scripts cms:reconcile-document-availability -- --target=development
pnpm --filter @workspace/scripts cms:reconcile-value-to-scale-hero -- --apply-db --target=development
pnpm --filter @workspace/scripts cms:reconcile-offices -- --apply-db --target=development
pnpm --filter @workspace/scripts cms:reconcile-methodologies-hero -- --apply-db --target=development
pnpm --filter @workspace/scripts cms:reconcile-methodologies-hero -- --verify-db --target=development
# Banking remains a human-reviewed, unpublished successor. This applies or
# replays only an exact candidate; a later editorial/published state is
# explicitly receipted as preserved rather than retried or overwritten.
pnpm --filter @workspace/scripts cms:setup-banking-postmerge -- --report-conflict
