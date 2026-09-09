#!/bin/bash
set -e

pnpm install --frozen-lockfile
pnpm --filter @workspace/db prepare-schema-push
pnpm --filter db push-force
pnpm --filter @workspace/scripts cms:reconcile
