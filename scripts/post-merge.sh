#!/bin/bash
set -e

pnpm install --frozen-lockfile
pnpm --filter @workspace/api-spec run codegen
pnpm run typecheck:libs
pnpm --filter @workspace/db prepare-schema-push
pnpm --filter db push-force
pnpm --filter @workspace/scripts cms:reconcile
pnpm --filter @workspace/scripts cms:reconcile-value-to-scale-hero -- --apply-db --target=development
pnpm --filter @workspace/scripts cms:reconcile-offices -- --apply-db --target=development
pnpm --filter @workspace/scripts cms:reconcile-methodologies-hero -- --apply-db --target=development
pnpm --filter @workspace/scripts cms:reconcile-methodologies-hero -- --verify-db --target=development
# Banking remains a human-reviewed, unpublished successor. This applies or
# replays only an exact candidate; a later editorial/published state is
# explicitly receipted as preserved rather than retried or overwritten.
pnpm --filter @workspace/scripts cms:setup-banking-postmerge -- --report-conflict
