# Task 241 methodology editorial reconciliation

## Scope and authority

`cms:reconcile-methodology-editorial` is the sole importer for these unpublished UAE/English methodology drafts:

| Route | Shared exact seed |
| --- | --- |
| `/methodologies/idao` | `idaoEditorial` |
| `/methodologies/ai-use-case-prioritization` | `aiUseCasePrioritizationEditorial` |
| `/methodologies/ai-value-to-scale` | `aiValueToScaleEditorial` |
| `/methodologies/agentic-operations-readiness` | `agenticOperationsReadinessEditorial` |
| `/methodologies/human-agent-operating-model` | `humanAgentOperatingModelEditorial` |

The command consumes the page-owned definitions exported from
`@workspace/api-zod/methodology-editorial`. It does not recreate editorial
sections from a generic inventory. It recursively inventories every media
slot in each definition (including all eleven IDAO occurrences), verifies
local file bytes before upload, and writes only an environment-local immutable
asset/version reference into the draft payload. Each distinct asset/version is
recorded exactly once at the CMS API's canonical `revision:<revisionId>` media
reference location; nested slots retain their own immutable pins in the
schema-valid payload. This is the same location queried by preview delivery,
not an importer-private field path.

The general inventory import and reconciliation deliberately exclude these
five routes and their media paths. This prevents a broad framework import from
turning a nested hero/media shape into a generic `heroMediaId` mapping or
creating generic receipts. Agent Authority and Guardrails remain outside this
task and are not changed by its command.

## Safe operation

Run these development-only commands in order:

```sh
pnpm --filter @workspace/scripts cms:reconcile-methodology-editorial
pnpm --filter @workspace/scripts cms:reconcile-methodology-editorial -- --apply-db --target=development
pnpm --filter @workspace/scripts cms:reconcile-methodology-editorial -- --verify-db --target=development
```

The first command is a dry run: it makes no database, object-storage, receipt,
approval, audit, or fixture write. The apply command requires an explicit
development target and refuses production/deployment environments. It creates
only draft documents, UAE/English draft editions, draft revisions, private
immutable media objects, pending-review media assets, pending-review media
versions, and revision media pins. It does **not** create operation receipts,
audit events, approval fields, or publication pointers.

Before media provisioning, apply locks and classifies the complete five-route
document/edition/revision set. A conflict in any route aborts before media
objects are touched; any later database-stage failure rolls its provisional
media rows back. Database staging commits before the
content-addressed objects are written and byte-verified; therefore a database
rollback (including an injected failure) makes zero storage mutations. A
post-commit object verification failure is surfaced explicitly and is never
reported as a successful reconciliation.

Every result reports a canonical stable digest over the exact shared seed and
the source media identity. That digest intentionally excludes local database
UUIDs; asset and version IDs are resolved anew in each environment. Media
metadata records `needs-review` for rights, accessibility, and review status.
The import does not infer rights or approval from a source file or from an
existing active asset.

Apply creates the five exact drafts on a fresh development database. It is
repeatable thereafter: it replays only when the current latest draft payload and
every API-loadable revision media pin exactly matches the resolved local
payload. A narrowly recognized untouched earlier Task 241 seed draft may
receive a successor draft revision when shared schema slots are added; its
predecessor remains intact. A
publication pointer, non-draft latest revision, ambiguous media binary,
missing pin, placeholder ID, changed seed, or newer/different editorial
payload is a fail-closed conflict. Nothing is overwritten or appended in that
case. The verify command is read-only and confirms the full seven-framework
inventory: these five drafts plus untouched Agent Authority and Guardrails.

### Post-merge bootstrap lifecycle

The permanent post-merge hook uses `--bootstrap`. Bootstrap is intentionally
non-destructive: absent routes receive their exact draft; an exact known Task
241 draft may reconcile; and a newer editor-authored, reviewed, or published
route is reported as `preserved-terminal` with no route, media, or storage
write. Its verification reports portfolio presence and each route's truthful
draft/terminal readiness rather than requiring every future environment to
remain an unpublished draft. A placeholder identity is never terminal and
still fails closed. The ordinary commands above remain strict: they report
meaningful newer history as a conflict for an operator to review.

## Authorized publication cutover and rollback

Task 241 stops at draft creation. Each route above requires an editor to:

1. review the exact draft copy and every media occurrence;
2. set rights/accessibility review states from real evidence;
3. obtain the normal editorial approval; and
4. publish that approved revision through the authenticated CMS publication
   workflow.

There is no batch publication authorization and this reconciler accepts no
publish flag. A production cutover is separately **PUBLICATION-gated**: a
named release owner must explicitly authorize the individual route and
approved immutable revision in the authenticated CMS before that CMS workflow
can advance its pointer. The development post-merge hook is never that gate.
Cut over one route at a time,
verify its published revision and immutable media pins, then proceed to the
next route. If a route must be rolled back, use the CMS rollback workflow to
point that route to its prior approved revision. Do not delete revisions,
media, or objects, and do not rerun Task 241 as a rollback mechanism.

## Post-merge behavior

The existing `scripts/post-merge.sh` hook runs dry run, authorized
development draft apply, and read-only all-seven verification in that order.
The command is idempotent and conflict-preserving, so a subsequent merge
replays an exact draft or reports a safe conflict rather than altering newer
editorial history. A hook failure should be treated as a reconciliation
blocker: inspect the stated route and resolve it through editorial review or
the per-route CMS cutover path; never bypass it with receipts, approval writes,
or direct publication.