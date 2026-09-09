#!/bin/bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

generated_paths=(
  "lib/api-client-react/src/generated"
  "lib/api-zod/src/generated"
)

snapshot="$(mktemp -d)"
trap 'rm -rf "$snapshot"' EXIT

for generated_path in "${generated_paths[@]}"; do
  mkdir -p "$snapshot/$(dirname "$generated_path")"
  cp -a "$generated_path" "$snapshot/$generated_path"
done

pnpm --filter @workspace/api-spec run codegen

stale=0
for generated_path in "${generated_paths[@]}"; do
  if ! diff -qr "$snapshot/$generated_path" "$generated_path"; then
    stale=1
  fi
done

if [[ "$stale" -ne 0 ]]; then
  echo "Generated API clients are stale. Commit the output of:" >&2
  echo "  pnpm --filter @workspace/api-spec run codegen" >&2
  exit 1
fi