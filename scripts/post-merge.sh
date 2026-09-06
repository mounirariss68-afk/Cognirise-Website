#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm --filter @workspace/db push
pnpm --filter @workspace/db verify:cms
pnpm --filter @workspace/scripts cms:seed
