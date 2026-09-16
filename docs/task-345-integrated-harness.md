# Task 345 integrated acceptance harness

`cms:task-345-harness` provisions a disposable, isolated fixture for the
integrated browser/API/storage acceptance pass. It is test infrastructure only:
it does not change application routes, workflow configuration, public content,
or the live object namespace.

## Provision

Use a development database and a new private state path for every run:

```sh
export NODE_ENV=development
pnpm --filter @workspace/scripts cms:task-345-harness -- \
  --development setup --state /tmp/task-345-task-$(date +%s).json
```

The command:

- captures a read-only preservation baseline for published pointers,
  availability decisions, immutable media pins, and revision digests;
- creates a random `task345_*` schema, clones the public table definitions, and
  truncates the clone before seeding it;
- creates distinct `author/editor`, `reviewer/publisher`,
  `publisher/publisher`, and `administrator/administrator` accounts;
- creates one representative document of every CMS kind, with UAE published
  and KSA draft editions;
- uploads real PNG bytes to a unique App Storage
  `PRIVATE_OBJECT_DIR/cms-media/objects/<fixture-prefix>/...` namespace and
  records approved-use rights and approved accessibility metadata on immutable
  media versions;
- requires the central capability tables and applies the isolated
  0035/0036/0037 compatibility migrations, the current 0038 reviewer-integrity
  function, and the 0039 configuration sentinel. A missing table or missing
  `accountable_editor_user_id` column fails setup and API startup; it never
  falls back to public-schema authorization behavior.
- records that `CREATE TABLE ... LIKE` does not copy foreign keys or triggers,
  then recreates the public foreign-key definitions and user workflow/media
  review triggers only in the fixture schema under its fixture search path.
  Setup prints the isolated counts as proof; public definitions are not
  modified. Review transition triggers remain database-local and no email
  transport is invoked.

The state file contains passwords, TOTP seeds, and the fixture session secret.
It is created mode `600` below `/tmp`; secret values are never printed. Do not
commit it, paste it into chat, or send it through test logs.

An optional read-only baseline can be captured independently:

```sh
pnpm --filter @workspace/scripts cms:task-345-harness -- \
  --development baseline --state /tmp/task-345-baseline.json
```

## Serve without global cutover

Start the loopback API after provisioning:

```sh
pnpm --filter @workspace/scripts cms:task-345-harness -- \
  --development serve --state /tmp/task-345-task-<timestamp>.json
```

The command prints an API origin and a disposable local proxy origin, then
remains in the foreground. The imported API uses
`search_path=<fixture-schema>,public` and listens only on loopback. It does not
replace the normal application workflow.

For an already-running local admin/website dev server, opt into a test-only
proxy:

```sh
pnpm --filter @workspace/scripts cms:task-345-harness -- \
  --development serve --state /tmp/task-345-task-<timestamp>.json \
  --frontend-upstream http://127.0.0.1:<frontend-port>
```

The proxy sends `/api/*` to the fixture API and other paths to the explicitly
provided frontend upstream. It does not edit Vite/workflow configuration and
does not enable any application-owned route cutover. Vite HMR/websocket
behavior is not part of this proxy; use the direct API origin if the local
frontend server requires a different origin strategy.

For protected website previews in the same isolated session, also pass
`--website-upstream http://127.0.0.1:18741`. With both upstreams, `/admin*`
uses the admin server, `/api/*` uses the isolated API, and other paths use
the website server. This changes only the disposable loopback proxy.

## Authentication and verification

Browser/API clients must use the ordinary authentication endpoints:

1. `POST /api/auth/login` with the fixture email and password.
2. `POST /api/auth/mfa/verify` with a current TOTP code.

To obtain a current code without printing the seed:

```sh
pnpm --filter @workspace/scripts cms:task-345-harness -- \
  --development totp --state /tmp/task-345-task-<timestamp>.json --role author
```

The `verify` command checks the ten documents, immutable references, and exact
fixture storage objects without mutating the schema:

```sh
pnpm --filter @workspace/scripts cms:task-345-harness -- \
  --development verify --state /tmp/task-345-task-<timestamp>.json
```

No session row is manufactured by setup. A browser tester must log in and
complete MFA normally; no real email delivery is used.

### Repair older fixture availability references

Older fixtures could store document-edition IDs where configured-market IDs
were required. Inspect the isolated fixture using the dry-run default:

```sh
pnpm --filter @workspace/scripts cms:task-345-harness -- \
  --development repair-availability --state /tmp/task-345-task-<timestamp>.json
```

Add `--apply` only after inspecting that report. The command accepts the exact
owned UAE/KSA mappings, refuses mixed or ambiguous states, preserves decisions
and revision/publication pointers, and checks the public preservation baseline.
Already-correct mappings return an explicit no-op. This repairs test
infrastructure, not existing user content or shared-source ownership.

### Repair a non-monotonic staged availability state

Older fixtures may have staged visibility decisions whose `draft_version`
does not exceed `published_version`, which hides the release UI. Inspect the
exact owned fixture with the dry-run default:

```sh
pnpm --filter @workspace/scripts cms:task-345-harness -- \
  --development repair-availability-state --state /tmp/task-345-task-<timestamp>.json
```

Add `--apply` only after reviewing that report. The command is restricted to
the four fixture identities and ten fixture documents, requires an unchanged
public preservation baseline, and repairs only documents with differing staged
decisions and `draft_version <= published_version`. It sets
`draft_version=published_version+1`, clears stale review receipts and
destination pins, attributes the staged state to the fixture author, and
preserves published decisions, versions, source pointers, content, revisions,
and media pins. Re-running it is an explicit no-op:

```sh
pnpm --filter @workspace/scripts cms:task-345-harness -- \
  --development repair-availability-state --apply \
  --state /tmp/task-345-task-<timestamp>.json
```

### Repair older fixture capability authority

Older fixtures may have explicit Shared grants only for the UAE source market.
Inspect the exact owned fixture users with the dry-run default:

```sh
pnpm --filter @workspace/scripts cms:task-345-harness -- \
  --development repair-capabilities --state /tmp/task-345-task-<timestamp>.json
```

Add `--apply` only after reviewing that report. The command is restricted to
the four identities and ten documents recorded in the private state file,
requires an unchanged public preservation baseline, preserves content,
revisions, availability, and publication pointers, and is idempotent:

```sh
pnpm --filter @workspace/scripts cms:task-345-harness -- \
  --development repair-capabilities --apply --state /tmp/task-345-task-<timestamp>.json
```

It adds prerequisite-complete Shared view/edit/review authority for the
author (without publish) and Shared view/edit/review/publish authority for
the independent reviewer and publisher across every enabled destination.

## Teardown and limitations

Stop the foreground `serve` process first, then run:

```sh
pnpm --filter @workspace/scripts cms:task-345-harness -- \
  --development cleanup --state /tmp/task-345-task-<timestamp>.json
```

Cleanup validates the random schema name, fixture identities, and every
storage key before deleting the exact keys referenced by the fixture schema.
It drops only that schema, then compares the public preservation baseline. The
state file is removed only after the schema is gone, storage cleanup succeeds,
and the public baseline matches exactly. A mismatch or ownership uncertainty
retains the state file and fails loudly.

This harness cannot make a missing central-capabilities migration available and
cannot make an externally hosted frontend reach a loopback API. Those are
reported prerequisites, not auth or routing bypasses. It also does not perform
storage cleanup outside objects referenced by the isolated fixture schema.
No browser tester is launched by setup, serve, verify, or cleanup.