#!/usr/bin/env bash
set -euo pipefail

# Keep the explicit development guard in the TypeScript helper as the source
# of truth; this wrapper only provides a short command for local automation.
exec pnpm --filter @workspace/scripts cms:owner-browser-fixture -- "$@"
