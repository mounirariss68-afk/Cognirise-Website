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
# Task 345 database recovery is intentionally additive and receipt-backed. It
# runs only for a local development schema; it never invokes content release.
if [[ "${NODE_ENV:-}" == "development" && "${REPLIT_DEPLOYMENT:-}" != "1" ]]; then
  pnpm --filter @workspace/scripts cms:regional-editor-schema -- --apply --development
fi
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
# Task 338 performs a read-only homepage preflight, then stages only the
# targeted generated homepage draft. It never changes the published pointer or
# touches custom regional editions; normal editorial publication remains
# required.
pnpm --filter @workspace/scripts cms:reconcile-homepage -- --apply-db --target=development
pnpm --filter @workspace/scripts cms:reconcile-methodologies-hero -- --apply-db --target=development
pnpm --filter @workspace/scripts cms:reconcile-methodologies-hero -- --verify-db --target=development
# Task 241 is intentionally separate from the general CMS inventory importer:
# it creates its five exact page-owned editorial drafts on a fresh development
# database (or replays/safely successors an exact known draft only), without
# approvals, receipts, fixtures, or a publication transition. The dry run
# inventories every nested media slot before the guarded development apply and
# read-only all-seven framework verification.
pnpm --filter @workspace/scripts cms:reconcile-methodology-editorial
pnpm --filter @workspace/scripts cms:reconcile-methodology-editorial -- --apply-db --bootstrap --target=development
pnpm --filter @workspace/scripts cms:reconcile-methodology-editorial -- --verify-db --bootstrap --target=development
# Banking remains a human-reviewed, unpublished successor. This applies or
# replays only an exact candidate; a later editorial/published state is
# explicitly receipted as preserved rather than retried or overwritten.
pnpm --filter @workspace/scripts cms:setup-banking-postmerge -- --report-conflict
# Task 340 must not send this release through a possibly stale managed API
# process: post-merge precedes workflow reconciliation. Build the current API
# source and use a temporary local process on an ephemeral port instead.
guardrails_api_port="$(node -e 'const net=require("node:net"); const server=net.createServer(); server.listen(0,"127.0.0.1",()=>{console.log(server.address().port); server.close();});')"
guardrails_api_log="$(mktemp /tmp/cognirise-guardrails-api.XXXXXX)"
guardrails_api_pid=""
guardrails_fixture_credentials="$(mktemp /tmp/cognirise-guardrails-release.XXXXXX)"
rm -f "$guardrails_fixture_credentials"
cleanup_guardrails_release() {
  if [[ -f "$guardrails_fixture_credentials" ]]; then
    NODE_ENV=development pnpm --filter @workspace/scripts cms:owner-browser-fixture -- \
      --development cleanup --credentials "$guardrails_fixture_credentials" || true
  fi
  if [[ -n "$guardrails_api_pid" ]]; then
    kill "$guardrails_api_pid" 2>/dev/null || true
    wait "$guardrails_api_pid" 2>/dev/null || true
  fi
  rm -f "$guardrails_api_log"
}
trap cleanup_guardrails_release EXIT
pnpm --filter @workspace/api-server build
PORT="$guardrails_api_port" NODE_ENV=development pnpm --filter @workspace/api-server start \
  >"$guardrails_api_log" 2>&1 &
guardrails_api_pid="$!"
for _ in $(seq 1 80); do
  if curl --fail --silent --show-error "http://127.0.0.1:${guardrails_api_port}/api/healthz" >/dev/null; then
    break
  fi
  sleep 0.25
done
if ! curl --fail --silent --show-error "http://127.0.0.1:${guardrails_api_port}/api/healthz" >/dev/null; then
  echo "Fresh private CMS API did not become healthy for the authorized Guardrails release." >&2
  exit 1
fi
# The established isolated-development fixture lifecycle provisions an
# ephemeral MFA-enrolled administrator. It then calls the normal login/CSRF
# API release and protected preview capability; preview tokens never leave the
# process. Fixture teardown retains audit evidence for the real document.
NODE_ENV=development pnpm --filter @workspace/scripts cms:owner-browser-fixture -- \
  --development setup --with-guardrails-authority --credentials "$guardrails_fixture_credentials"
NODE_ENV=development pnpm --filter @workspace/scripts cms:release-guardrails-set-prove-hold -- \
  --credentials="$guardrails_fixture_credentials" \
  --api-base="http://127.0.0.1:${guardrails_api_port}/api" --verify-preview
cleanup_guardrails_release
trap - EXIT
