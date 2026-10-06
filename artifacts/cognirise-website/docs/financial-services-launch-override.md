# Financial Services launch override

**Route:** `/industries/financial-services` (and its legacy/market-query variants handled by `IndustryBanking`).

## What is governed vs overridden
- Code-owned (launch override): the full public page content in `src/content/financial-services-launch.ts`, rendered by `src/components/industries/financial-services/`.
- CMS-governed (unchanged): the `industry/financial-services` record, its `bankingPov`, drafts and all immutable release snapshots. Nothing is written to the CMS.

## Exact behaviour
- `FINANCIAL_SERVICES_LAUNCH_OVERRIDE` is on unless `VITE_FS_LAUNCH_OVERRIDE=off` at build time.
- On: public visitors (direct loads, market queries, active release context) see the new page regardless of whether published CMS content has a `bankingPov`. Metadata comes from `fsHero`.
- Protected CMS previews (`ReleaseProvider preview` or `CmsPreviewRequestProvider`) never show the override; they render the existing CMS-driven `BankingEditorial` / `IndustryEditorial` path honestly.
- Off: the previous behaviour returns unchanged (loading, under-review, BankingEditorial when `bankingPov` exists, otherwise IndustryEditorial).

## Source mapping
Slide 8 levels; 9 business areas; 10 starting projects; 11 voice journeys; 12 launch considerations and supplier note; 13 transition; 14 six cases. Research sources and caveats are listed in `fsResearch` (checked 6 October 2026).

## Claim ledger (not published as results)
Slide 10 figures (under one hour, 45–60 minutes, 50%, 80%, 60%, +40%) and slide 12 supplier figures (15 deployments, 80+ languages, 0.05% hallucination rate, SAMA/CBUAE/GDPR statements) are retained only in the source deck until baseline and evidence exist. Slide 8 30/50/70% appear only as labelled illustrative targets. The 71% figure appears only as "reported gate pass rate"; sub-two-second response only as a reported result for one project.

## Returning to CMS delivery
1. Add a CMS schema/section model able to carry these sections (levels table, work map, projects, credit flow, voice, cases, research).
2. Author and publish through the normal editorial workflow; verify in protected preview.
3. Set `VITE_FS_LAUNCH_OVERRIDE=off` (or remove the override branch in `src/pages/IndustryBanking.tsx`) and delete the code-owned content.
