# Guardrails Framework — development review

## Content-owner approval — 2026-09-14

The content owner explicitly approved the supplied Guardrails page copy and both
diagrams in response to the content-only approval question. This approval applies
to the following source files, identified by SHA-256:

| Source | SHA-256 |
| --- | --- |
| `attached_assets/guardrails-page-copy_1789364808531.md` | `46396a6aebafa1eef724a46206dbdf27b11993ce2e0bfb44097840cf216ec302` |
| `attached_assets/illustration-A-four-layers_1789364808532.svg` | `b2392d8870420089b3136bda249adf66a12e04b7943dc4f11410cca11926bcd8` |
| `attached_assets/illustration-B-sufficiency_1789364808532.svg` | `19e7b91de600075df27128ea4e3fab1bcfc3569308e32507e6fdc544bedadbc4` |

This is source-content approval only, not a CMS workflow approval, independent
factual/legal verification, approval of subsequent content changes, or permission
to publish/deploy. The approval date is not a substitute for verification or
scheduled review dates. The authenticated preview and remaining release checks
below still require evidence. No CMS revision or publication pointer was changed
to record this approval.

## Delivery

- Canonical website route: `/methodologies/guardrails-framework`.
- Source edition: UAE / English only.
- Admin draft: `/admin/content/dfa342e1-7e21-4926-8e8b-af082f7e55f5`.
- Staging receipt: `cms.guardrails.page.stage-v1`.
- Staged immutable revision: `e9e3c8b8-1dde-47d0-8c0c-7da16a172f32`.
- **No deployment, production publication, or production navigation change occurred.**

The public CMS endpoint currently returns HTTP 404 for this hidden draft. This is
intentional: neither the page, navigation entry, sitemap entry nor Agent Authority
backlink may expose an unavailable edition. No compiled-copy fallback was added.
An authorized editor can open the draft in Admin and issue its normal protected preview.

## Implemented scope

All eleven reviewed sections, three full responsive tables, supplied actions, source
groups, exact SEO and legal note are represented in the existing framework document
family under the distinct `guardrails` template. Diagram-specific wording is separate
from the fuller tables. See `guardrails-source-authority.md` for documented differences.

The four compositions support page-local selection without hiding essential content.
The five exposure mappings retain independent additions; the final band does not inherit
the previous band's independent-control requirement. Diagram centers are measured from
native labels so connectors track responsive wrapping and editorial changes.

Agent Authority received only template narrowing, a publication-aware related-document
lookup, and the approved near-end backlink with market/locale context. Its canonical
body, existing diagrams, calculations and assessment remain unchanged. No methodology
starting situation was added.

The CMS editor exposes prose, diagram labels/descriptions, tables, steps, source groups,
SEO and actions while locking ordered structural IDs, strengths, threshold and mappings.
Legacy Agent Authority revisions lacking the template discriminator retain their
previous normalization behavior.

## Checks actually run

The first completion review found a post-rebase generated-contract failure that
incremental checks had missed. It was corrected by giving the Agent Authority
union member a named OpenAPI component while preserving all its constraints.
The following clean final-tree checks passed after regeneration:

- Forced project-reference rebuild: `pnpm exec tsc --build --force`.
- Entire workspace: `pnpm run typecheck`, including regenerated-contract freshness.
- API build and all 222 API tests.
- Existing Agent Authority source check plus Guardrails fidelity/structural checks: 9/9.
- Website render, routing, preview, sitemap and backlink checks: 22/22.
- Guardrails editor checks: 2/2.
- Duplicate generated exported-constant declarations: zero.
- Subsequent boundary review removed all compiled reviewed SEO from loading/unavailable
  states (generic noindex metadata, no canonical) and excluded populated related-record
  ID arrays from prose editing. Focused document-head and editor regressions cover both.

Earlier implementation-stage checks, retained for a complete evidence record:

- OpenAPI generation and `codegen:check`: passed.
- Library, website, API, admin and scripts TypeScript checks: passed.
- Website production build: passed with managed `PORT` and `BASE_PATH` supplied.
- Reviewed-source fidelity and exhaustive structural mutation tests: 7 passed.
- Rendered editorial fidelity and absent-content fail-closed tests: 2 passed.
- Focused route, sitemap, preview and backlink checks: 20 passed.
- Navigation policy checks: 17 passed.
- Guardrails editor initializer/editability checks: 2 passed.
- Full admin suite: 150 passed.
- Real development staging apply and immutable receipt replay/verification: passed.
- Post-merge shell syntax and scoped whitespace checks: passed.
- Independent backend/governance review: passed after resolving the identified issues.

### Browser evidence and its limits

The existing browser harness ran in its explicit **fixture-render mode**. It intercepts
only its synthetic preview request in the test browser. It does not change application
authentication, create a preview capability or bypass MFA.

Passed checks include 1440px, 768px and 390px layouts, body/content overflow, computed
heading typography, pointer/keyboard selections, mobile touch selections, all five static
exposure relationships, selected relationship summaries, reset, reduced-motion rendering
and print understanding. Test-only selectors were corrected after semantic controls
moved away from whole-answer buttons. A later visual inspection identified connector
scaling; this was fixed with an explicit viewBox and measured native node centers.

Screenshots and the browser print PDF are under `screenshots/guardrails/`.
The Agent Authority desktop before/after capture is pixel-identical. Mobile captures
retain the same geometry and content, with a small image-rendering difference
(normalized RMSE approximately 0.026).

**The real MFA-authorized preview journey remains unverified.** Fixture screenshots
prove rendering and interaction behavior, not authorization. Content-owner approval
of the exact supplied sources is recorded above. Independent factual/legal checks,
evidence links where appropriate, actual verification/review dates, and publication
approval remain editorial gates. None was fabricated.

## Scoped diff inventory

Against the merged main baseline, the final text diff comprises approximately
106 files, including 62 generated-contract files, 11,600 inserted lines and 793 removed
lines. The other changes are the new page/components, scoped CSS, schema/editor
support, route/navigation/preview wiring, tests, reconciliation, documentation and
review-capture metadata. Binary screenshots/PDFs are counted separately.

The final narrow connector check passed all five measured endpoint alignments at
1440px and 768px, within two pixels of their native label centers.

## Existing/environment findings

- A bare shell build initially lacked the workflow-injected `PORT`; supplying the
  managed build context succeeded without changing build configuration.
- The production build reports the existing large-bundle advisory. No dependency,
  lockfile or build-configuration changes were made.
- The API's pre-existing media streaming path emitted listener warnings while loading
  Agent Authority artwork. This work does not change media delivery.
- The existing two modified generated API files retain trailing-newline whitespace
  warnings; their pre-task edits were preserved.
- Public Agent Authority logs an expected missing Guardrails CMS request while this
  edition is unpublished; no reviewed draft prose is exposed.

## Merge and release boundary

The post-merge hook invokes development-only reconciliation. It validates the fixture,
locks the edition, verifies the exact receipt and immutable revision, and refuses to
supersede unrelated editorial work. It never advances publication or availability
pointers. Conflicts fail explicitly rather than overwriting a newer draft.

After merge, an editor should open the staged UAE/English draft, complete a real
authenticated preview and resolve the normal review gates. Public release and any
deployment require separate approval.