#!/usr/bin/env bash
set -Eeuo pipefail

: "${TASK_354_STATE:?TASK_354_STATE must point to the private fixture state file}"
: "${NODE_ENV:?Set NODE_ENV=development}"
[[ "$NODE_ENV" == development ]] || { echo "Task 354 requires NODE_ENV=development" >&2; exit 2; }

cleanup() {
  status=$?
  # Verify first even after a browser failure; cleanup itself performs the
  # ownership and public-baseline comparisons before removing the state file.
  pnpm --filter @workspace/scripts cms:task-345-harness -- --development verify --state "$TASK_354_STATE" || status=$?
  pnpm --filter @workspace/scripts cms:task-345-harness -- --development cleanup --state "$TASK_354_STATE" || status=$?
  exit "$status"
}
trap cleanup EXIT

pnpm --filter @workspace/scripts cms:task-345-harness -- --development verify --state "$TASK_354_STATE"
node "$(dirname "$0")/src/cms/task-354-browser-smoke.mjs"