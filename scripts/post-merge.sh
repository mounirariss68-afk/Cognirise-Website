#!/bin/bash
set -e

pnpm install --frozen-lockfile
pnpm --filter @workspace/api-spec run codegen
pnpm run typecheck:libs
pnpm --filter @workspace/db prepare-schema-push
pnpm --filter db push-force
pnpm --filter @workspace/scripts cms:reconcile
pnpm --filter @workspace/scripts cms:reconcile-offices -- --apply-db --target=development
