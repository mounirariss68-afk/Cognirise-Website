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
# Task 316 owns the exact Financial Services thesis successor. Run it before
# generic inventory reconciliation so its edition lock can preserve a newer
# editorial draft instead of allowing a full canonical payload merge.
pnpm --filter @workspace/scripts cms:reconcile-financial-services-thesis -- --apply-db --target=development --write --report-conflict
# Task 317's localized Financial Services drafts are receipt-bound. It verifies
# a completed UAE-only release, replays an intact preparation, and reports an
# explicit uninitialized state rather than silently dropping fresh-task work.
pnpm --filter @workspace/scripts cms:reconcile-task-317-drafts -- --apply-db --target=development --write
pnpm --filter @workspace/scripts cms:reconcile
# Task 318's narrowly scoped historical recovery is the only people operation
# in this hook. It creates a draft only; normal authenticated CMS Publish is
# the sole publication path.
pnpm --filter @workspace/scripts cms:recover-people -- --apply-db --target=development --write
pnpm --filter @workspace/scripts cms:verify-people-recovery -- --target=development --write
pnpm --filter @workspace/scripts cms:reconcile-site-hero-media -- --apply-db --target=development
# Schema push applies columns and tables only; this development-only command
# performs the guarded historical availability/source reconciliation afterwards.
pnpm --filter @workspace/scripts cms:reconcile-document-availability -- --target=development
# Task 319 stages four exact Public Sector market drafts after the immutable
# hero and availability reconciliations. It never advances publication or
# availability pointers; conflicts are reported and preserved.
pnpm --filter @workspace/scripts cms:setup-public-sector-postmerge
pnpm --filter @workspace/scripts cms:reconcile-value-to-scale-hero -- --apply-db --target=development
pnpm --filter @workspace/scripts cms:reconcile-offices -- --apply-db --target=development
# Task 330 stages only the generated homepage draft. It never changes the
# published pointer or touches custom regional editions.
pnpm --filter @workspace/scripts cms:reconcile-homepage -- --apply-db --target=development
pnpm --filter @workspace/scripts cms:reconcile-methodologies-hero -- --apply-db --target=development
pnpm --filter @workspace/scripts cms:reconcile-methodologies-hero -- --verify-db --target=development
# Banking remains a human-reviewed, unpublished successor. This applies or
# replays only an exact candidate; a later editorial/published state is
# explicitly receipted as preserved rather than retried or overwritten.
pnpm --filter @workspace/scripts cms:setup-banking-postmerge -- --report-conflict
# Carry the reviewed Guardrails source into development as a hidden draft.
# The receipt replays without publication and conflicts preserve editorial work.
pnpm --filter @workspace/scripts exec tsx src/cms/guardrails-reconciliation.ts --apply-db --target=development
