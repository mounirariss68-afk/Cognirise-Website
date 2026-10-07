# Public Sector regional delivery status

## Current source and public delivery — 7 October 2026

The four October HTML manuscripts supersede the September Markdown source.
All four exact English editions have been approved and published through the
normal authenticated CMS API under the owner's explicit chat authorization:

| Website market | Direct page | Published immutable revision |
|---|---|---|
| UAE | `/industries/public-sector?market=uae&locale=en` | `4dffeb1d-29ec-4cf6-8b80-40c6fc7b1fbd` |
| Saudi Arabia | `/industries/public-sector?market=ksa&locale=en` | `d1f51776-6bba-4904-b1f9-ae571fe6a32b` |
| Türkiye | `/industries/public-sector?market=turkiye&locale=en` | `3d4c5a89-5c7c-4c2b-86f8-27050872b403` |
| Europe | `/industries/public-sector?market=europe&locale=en` | `5fde8258-34d9-46c6-8115-7897f08de009` |

The global market remains **Europe**. European Union legislation and metrics
retain their EU scope in the manuscript. UAE and Saudi content are independent.
This is verified workspace public delivery, not a claim of a new production
deployment or of independent verification of every research assertion.

The route uses the existing exact approved-publication API, including exact
revision/media references. It intentionally does not use the older UAE
whole-site release snapshot for its body. That older manifest initially caused
the browser to show the September page despite the new publications; the
route is now connected to its independent regional publication authority.
This does not replace other pages or publish a new whole-site release.
Missing Public Sector editions fail closed in every market, including UAE.

## Completeness, provenance and evidence

`public-sector-native-source-mapping.json` records source attachment hashes,
the full 14-section body sequence, tables, three illustrations per market,
research trails and URL corrections. The common hero is the fifteenth section.
The deterministic extractor checks every substantive source body text leaf
against the structured output. It excludes only the duplicated shell, CSS,
decorative SVG and implementation comments.

The distinct regional position, six elements, six “What changes” modules,
service/foundation tracks, six priorities, benefits, closing position and
research remain intact. The UAE readiness mapping remains. Semantic wrappers
keep each heading/introduction, metric and parallel track together. Action
cards show static values, validation indicators, consequences and declarations;
they have no government form controls, submissions or personal-data collection.

The manuscripts' “checked 7 October 2026” labels are retained with an explicit
inherited-date qualification. Publication accuracy confirmation records the
owner's approved replacement source, **not a new legal/research check date**.
Inherited CMS verification/review dates are not refreshed by the importer.
Earlier September blockers are not applied to superseded claims.

Executor checks were limited and concrete:

- EUR-Lex identifies Regulation (EU) 2026/1744, published 24 July 2026, and
  the amended AI Act high-risk Annex III timetable. The October source's
  2 December 2027 timetable is not the superseded September assertion.
- The official KVKK registry by-law was consulted for the source's reference
  to the public-institution contact-person amendment of 28 April 2019.
  This is not a broad opinion on Turkish public-sector data law.
- Automated HTTP reachability checked the 50 distinct research URLs.
  Two concrete 404s were corrected to **the same cited works**: BALSAM's ACL
  Anthology canonical page and the complete Capgemini 2025 news-release slug.
  Both corrected URLs returned HTTP 200. Original URLs remain in the mapping.
- Of the 50 delivered URLs, 39 returned HTTP 200. Eleven were not confirmed
  because of remote 403/429/202 access challenges or network timeouts.
  These are not represented as verified citations or proven broken links.
  See `public-sector-native-link-check.json` for the per-URL observations.

No current publication blocker was identified from these concrete checks.
No new client claim, independent research result or media clearance was invented.

## Governance and merge handoff

The optional version-2 structure coexists with legacy version-1 Public Sector
revisions. The original shared-source history is retained. The normal regional
customization endpoint relocated the existing UAE shared source to
`shared-source/und` and created its independent English edition; no immutable
revision, publication history or other industry's content was rewritten.

The approved civic hero remains pinned to asset
`5d3fa734-eeec-4cb2-8517-e443af14e96b`, version
`25167eda-ebcd-4b3e-9c94-ebabfc1d0434`. Each new immutable revision copies
the exact approved source's media references; publication validates their
delivery and existing clearance. The importer does not approve media.

Reconciliation uses document/edition locks and append-only digest-keyed
receipts. It can replace an exact known September automation draft or append a
corrected source import after this operation's own digest-matching revision.
A newer editor revision, uncertain receipt or conflicting pending draft is
preserved and reported, never overwritten. Re-running the stage command
returned `replay` for all four final revision IDs.

`scripts/post-merge.sh` now runs the native release command instead of the
superseded September staging command. It uses the already configured private
owner fixture and freshly built local API used by other owner-authorized
reconciliation. It publishes through the normal accuracy-confirmation and
publication endpoints, verifies protected preview and exact public responses,
then records release evidence. It does not write publication pointers directly.
Production/deployment mutation is refused. Other pending content is untouched.
Conflicts are reported per market for authorized follow-up rather than hidden.
Publishing actors can become authors of real immutable customization history.
Fixture retirement therefore suspends only exact verified fixture identities
and revokes their sessions instead of deleting users or documents. The private
credential file is removed after successful retirement. This preserves audit
attribution without leaving an active temporary administrator; retirement
failure is not hidden by the post-merge script.

Commands:

```sh
python scripts/extract-public-sector-native.py --check
pnpm --filter @workspace/scripts exec tsx --test src/cms/public-sector-native.test.ts
NODE_ENV=development pnpm --filter @workspace/scripts cms:stage-public-sector-native
# Normal release requires a private, mode-600 owner credential fixture:
NODE_ENV=development pnpm --filter @workspace/scripts cms:release-public-sector-native -- \
  --credentials=<private-file> --api-base=<fresh-local-api>/api
```

## Verification performed

- Exact public responses for all four markets: HTTP 200, matching requested
  market, English, no fallback and the complete expected native-content digest.
- Authenticated immutable preview capabilities: exact revision, matching
  native manuscript and hero pins; preview responses remain noindex.
- Browser visitor checks: all four direct pages at 390px and 1920px, one tablet
  check, loaded civic images, single shell, static illustrations, contact query
  preservation, start anchor, selector changes, refresh and back/forward.
  Visible keyboard focus and individually scrollable semantic tables passed.
  Reduced motion and representative 200% text-only enlargement passed without
  page-wide overflow. A later semantic-grouping adjustment was confirmed by
  source coverage and renderer checks rather than another full browser run.
- Actual CMS browser checks: UAE and Europe regional English outlines contain
  Hero plus 14 native sections. Text/table/card inspector paths match the
  native saved preview; research selection reaches the research section.
  The retained shared-source edition intentionally still shows the old outline.
- Focused source/model/legacy/projection/replay/conflict tests, native rendering
  tests and CMS inspector tests pass. Existing legacy Public Sector and
  industry inspector tests remain passing.
- Website, admin and shared API-Zod TypeScript checks pass.
  The unrelated full scripts typecheck still fails in
  `homepage-reconciliation.test.ts`, `homepage-reconciliation.ts` and
  `save-team-review-image.ts`; no new Public Sector type errors were reported.
  `bash -n scripts/post-merge.sh` passes.
