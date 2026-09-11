# Document edition selection verification

## Scope

Shared content is edited independently of destination selection. Published availability is checked for the requested market and locale before selecting public content. Regional customizations retain separate revisions, slugs, media references, and publication history.

## Verification performed

- Workspace OpenAPI regeneration and TypeScript checks passed.
- Admin document, authoring, and availability tests passed: 18 tests.
- The final full API suite passed 146/146 after incorporating incoming person-visibility coverage. Some earlier runs exposed an intermittent existing stream-listener assertion; it passed in the final full run.
- PostgreSQL migration tests passed, including recursive and canonical fallback, locale boundaries, explicit person exclusions, published versus newer draft revisions, immutable migration receipts, and repeat application.
- Reconciliation tests passed, including transaction rollback on parity failure.
- A real HTTP/PostgreSQL lifecycle verified explicit legacy source selection, authorized and restricted editor access, editing the internal shared source, protected preview, staged destinations, review, atomic publication, and included/excluded public delivery. Fixture records were removed.
- A real PostgreSQL source-destination customization check verified that a destination-restricted editor can create its own draft while the existing shared edition retains its revision identity and live publication pointer. Public content remains unchanged until the custom draft is published.
- Rendered Admin checks cover source-destination customization and custom publication confirmation, which explicitly leaves destination changes pending.
- Configuration-drift tests reject both newly added markets and newly added locales between review and publication. Documents with authoritative availability cannot acquire a new public destination from a missing row.
- Stable editorial-origin checks preserve industry projection when a shared source moves to its internal authoring address. Final development reconciliation reports zero visibility-parity failures and zero ambiguous internal origins.
- Rendered controls validate complete-matrix saves against the generated API schema, retain failed shared/People selections, keep legacy source selection reachable, and default fully authorized editors to shared content.
- A real PostgreSQL media-eligibility regression verifies that an excluded customization cannot expose its private-only assets through a different shared destination on the same document; assets genuinely referenced by another eligible selected source remain available.
- The same database regression covers a published-but-private exact customization: public payload rules exclude it before source ranking, so eligible shared content and its pinned media remain deliverable.
- Sitemap regression checks verify that private or unapproved custom revisions do not suppress an eligible shared route.
- Navigation preserves replaced shared URLs as known-but-unavailable when a differently slugged customization wins, so links to the superseded shared URL are hidden rather than leading to a 404.
- PostgreSQL-backed navigation coverage confirms that the shared public-eligibility predicate is applied before ranking: a restricted exact customization does not shadow a valid shared page, while its own represented URL stays hidden.
- Industry publication validates projected delivery for affected destinations before changing live pointers. Banking's regional contract also gates public candidate selection before ranking; remaining projection exceptions become unavailable content, never a public server error.
- Contact configuration applies the same public-payload policy before selecting its source.
- The real HTTP/PostgreSQL lifecycle additionally verifies that both `show` and `off` saves for an absent destination preserve a live-off baseline in public lists and details. Only the subsequent approved shared publication makes the reviewed `show` destination public.
- Browser verification confirmed checkbox keyboard operation and reload persistence, customization before first publication, custom-copy independence, reviewed destination confirmation, successful shared publication, included public content and excluded public list/detail content. The blocked publication flow was corrected and retested in the same browser session.
- Mobile public detail was inspected at 390×844; no horizontal overflow or clipped critical content was observed.

## Migration and environment operations

- Development only: additive availability reconciliation was applied and replayed. The initial development inventory contained 55 documents and 220 destinations, with zero reported parity failures.
- Migration receipts preserve the original reconciliation baseline. The final migration additionally records selected-revision parity for new installations and tests the full configured fallback chain in isolated PostgreSQL fixtures.
- `scripts/post-merge.sh` invokes the development-only reconciliation command after schema/content setup. The command refuses production and rolls back on receipt parity failures.
- API and Admin services were restarted after implementation.
- Temporary browser users, sessions, and disposable content were cleaned up.
- No production content was published, and no production database operation was performed. Production release and any production migration remain subject to the normal authorized release process.

## Repeatable checks

```sh
pnpm run typecheck
pnpm --filter @workspace/api-server test
pnpm --filter @workspace/db test
pnpm --filter @workspace/scripts exec tsx --test src/cms/document-availability-reconciliation.test.ts
pnpm --filter @workspace/cognirise-admin exec tsx --test \
  src/pages/documents/DocumentDetail.test.tsx \
  src/pages/documents/authoring.test.ts \
  src/pages/documents/people-market-matrix.test.ts
```

The optional real HTTP verifier is `scripts/src/cms/task-307-shared-source-http-db.ts`. It requires explicit development flags and creates only disposable authenticated users, sessions, and content. An external development storage-state file is optional; credentials must never be checked into the repository. It uses an isolated loopback server, imposes bounded timeouts, and cleans up its fixtures.