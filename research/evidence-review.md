# Evidence review: `ai-starting-situations.draft.md`

**Review date:** 14 September 2026  
**Scope:** Critical review of the draft against `research/sources.json`, every cited `evidencePath`, and `research/method-boundaries.md`. The main report, source register, application, CMS and design were not changed.

## Initial review verdict: NEEDS FIX

The evidence architecture is unusually careful: the draft distinguishes procurement intent from delivery success, survey responses from causal ROI, field experiments from universal claims, and supplier commentary from independent prevalence evidence. The seven situations are explicitly presented as editorial buyer-language judgments, not customer-tested segments. However, one cited company example is wrong, one date record needs a stronger qualification, several commercial-survey claims should state “self-reported/noncausal” at the point of use, and a few registry tier labels overstate independence or methodological strength.

## Citation and source-resolution audit: PASS

- The draft contains **25 unique citation keys**. All 25 resolve to registry entries, and all 25 registry entries resolve to an existing saved evidence file.
- `sources.json` contains 39 registered/screened entries; the draft’s distinction between 39 screened sources and 25 cited sources is correct.
- No citation points to an absent evidence file, and no cited claim was found to depend on a search-only snippet.
- The source register’s limitations generally match the draft’s caveats. The corrections below are therefore targeted, not a reason to discard the evidence set.

## Claim-by-claim check

| Citation key and saved evidence | Status | Finding |
|---|---|---|
| `@oecd-ai-adoption-barriers` — `research/sources/ai-business-case-01-oecd.md` | **PASS** | Supports use-case, value-over-alternative, skills, integration, data and cost barriers. It is desk research reproducing mostly older surveys, not a current prevalence or causal estimate; the draft says this accurately. |
| `@csiro-ai-project-selection` — `research/sources/ai-business-case-02-csiro.md` | **PASS** | Supports problem definition, value, full cost, non-AI alternatives and active portfolio choices, including continue/pivot/stop. It is guidance, not observed buyer behavior; the draft preserves that boundary. |
| `@gap-sme-uk-dsit-2026` — `research/sources/gap-sme-02-uk-dsit-2026.md` | **PASS** | The February 2026 publication, 3,500 business interviews and 100 follow-ups, blockers and business-case qualitative evidence resolve. UK scope and self-reported limitations are stated. |
| `@gap-sme-oecd-2025` — `research/sources/gap-sme-01-oecd-2025.md` | **PASS** | Supports skills, finance, organizational change and “generative AI not suited to the work” among selected non-users. It does not test AI against a non-AI intervention; the draft does not claim that it does. |
| `@gap-sme-eurostat-2025` — `research/sources/gap-sme-03-eurostat-2025.md` | **PASS** | Supports size differences and conditional expertise, legal/privacy and usefulness barriers. The draft correctly notes the population excludes enterprises below ten people and does not generalize the conditional percentages. |
| `@g2-procurement-survey-cio-dive-2025` — `research/sources/ai-operations-needs-05-page.md` | **PASS** | Supports stricter AI procurement requirements and willingness to pay only when value/productivity is demonstrated. The draft correctly identifies this as secondary reporting of a commercial survey, not a conversion or ROI forecast. |
| `@london-civ-ai-automation-implementation-partner` — `research/sources/gap-roadmap-01.md` | **PASS** | The 19 June 2026 tender separates a recently initiated strategy programme from an implementation partner. The draft correctly says this is a planned handoff, not proof of a completed consultant roadmap, award, delivery or success. |
| `@dbt-ai3-delivery-partners` — `research/sources/ai-roadmap-delivery-06-page.md` | **PASS** | Supports the AI Lab/AI Factory/AI Operations distinction and specialist resourcing. The draft correctly treats these as that buyer’s terms rather than a Cognirise lifecycle. |
| `@home-office-ai-infrastructure-delivery-partner` — `research/sources/gap-roadmap-02.md` | **PASS** | Supports an awarded AI infrastructure delivery contract. The draft correctly says it does not establish a previous consultant strategy. |
| `@govuk-ai-procurement-guidelines` — `research/sources/ai-roadmap-delivery-01-page.md` | **PASS with date qualification** | Supports multidisciplinary evaluation, discovery, problem-based requirements, lifecycle support, knowledge transfer and training. The page shows **© Crown copyright 2020**, but the exact publication date is not shown; “historical guidance” is appropriate, while “published in 2020” would be too strong. |
| `@nber-generative-ai-at-work-2023` — `research/sources/ai-operations-needs-03-page.md` | **PASS** | Supports heterogeneous effects by worker experience in one workplace deployment. The draft omits a universal productivity percentage and labels the older working-paper evidence appropriately. |
| `@alibaba-customer-service-field-experiment-2025` — `research/sources/ai-operations-needs-02-page.md` | **NEEDS FIX: date metadata** | The four-week randomized experiment and heterogeneous outcomes resolve. The PDF says **November 2025** as the manuscript date, while `2603.29888v1` is a 2026 arXiv identifier; the exact arXiv posting date is not established in the saved evidence. Describe it as “November 2025 manuscript, archived under a 2026 arXiv identifier; posting date not established,” and update the registry date field accordingly. |
| `@mbs-ai-redesign-of-work-2026` — `research/sources/ai-operations-needs-06-page.md` | **PASS** | Supports task/workflow redesign, decision rights, learning and measurement cautions. The draft correctly calls it a qualitative leadership/roundtable whitepaper, not a controlled trial. |
| `@rand-ai-failure-roots-2024` — `research/sources/evidence/ai-production-results-01-rand.md` | **PASS for claim; NEEDS FIX in registry descriptor** | The 13 August 2024 RAND report and 65-practitioner interview mechanisms resolve. The saved page does not establish that it is peer-reviewed. Keep it as a Tier 1 research-institute report, but remove “peer-reviewed RAND research report” from the registry. |
| `@cisco-ai-readiness-index-2025` — `research/sources/evidence/ai-production-results-02-cisco.md` | **PASS with qualification** | The 8,039-leader, 30-market 2025 survey and infrastructure/scaling/measurement claims resolve. The draft correctly calls it vendor-sponsored self-reporting, not independent readiness certification. |
| `@mckinsey-gcc-state-ai-2025` — `research/sources/evidence/ai-production-results-04-mckinsey-gcc.md` | **PASS with qualification** | The 139 executives/board directors, 14 interviews and consulting definitions of adoption/value resolve. Keep “reported” and do not present the sample or value-realizer category as audited GCC prevalence. |
| `@deloitte-middle-east-state-ai-2026` — `research/sources/evidence/ai-production-results-05-deloitte-me.md` | **PASS with qualification** | The 2026 release supports discussion of production, role/workflow redesign and governance. It is a press-release summary with self-reported expectations; the draft correctly declines to use regional percentages as population benchmarks. |
| `@ibm-enterprise-ai-stall-2026` — `research/sources/evidence/ai-production-results-06-ibm.md` | **PASS** | The April 2026 supplier commentary supports the mechanism that curated pilots/manual review do not prove integrated production readiness. The draft does not use the unnamed bank vignette or IBM commentary as prevalence evidence. |
| `@redhat-uae-2025` — `research/sources/ai-gcc-adoption-01-redhat.md` | **PASS with qualification** | The UAE survey’s adoption, skills and operational-priority claims resolve. Keep the existing vendor-sponsored, n=100, 500+-employee and self-reported limitations attached to any percentage. |
| `@pwc-uae-workforce-2025` — `research/sources/ai-gcc-adoption-02-pwc-uae-workforce.md` | **PASS with qualification** | Supports employee use, confidence and upskilling discussion. The source lacks UAE sample size/fieldwork detail and reports employee perceptions; the draft correctly says these are not organizational readiness or audited outcomes. |
| `@kpmg-uae-future-of-work-2024` — `research/sources/ai-gcc-adoption-07-kpmg-uae.md` | **NEEDS FIX: factual attribution** | The report cover is **June 2024** and the saved evidence names **Al Ghurair, Ports, Customs and Free Zone Corporation, and Etihad Airways**. Replace “Majid Al Futtaim” in draft line 78 with “Al Ghurair” (or list the three named organizations). Keep the account examples attributed and unaudited. |
| `@wharton-genai-adoption-2025` — `research/sources/evidence/ai-production-results-03-wharton.md` | **PASS claim; NEEDS FIX: qualification/tier** | ROI tracking and reported returns resolve for an approximately 801-person US enterprise sample. Add “self-reported, sponsored commercial survey; not audited or causal” directly to the draft sentence, not only in the general methods caveat. The registry should not call this Tier 1 academic evidence solely because Wharton is involved; use a Tier 2 academic-affiliated/sponsored survey classification. |
| `@servicenow-oxford-economics-maturity-index-2025` — `research/sources/ai-operations-needs-04-page.md` | **PASS claim; NEEDS FIX: qualification** | Supports strategy, integration, talent, governance and value-realization dimensions. If its findings remain in the report, call it vendor-sponsored, self-reported and noncausal at the point of use; its maturity score is not an independent benchmark. |
| `@pwc-saudi-ai-value-2026` — `research/sources/ai-gcc-adoption-03-pwc-saudi.md` | **PASS claim; NEEDS FIX: qualification/tier** | The 35 senior respondents at large Saudi organizations and the directional value/execution framing resolve. Add “PwC proprietary self-report, n=35, not a Saudi population estimate or causal value study.” A Tier 3 consulting-proprietary survey label is more consistent than the current generic Tier 2. |
| `@bcg-gcc-ai-pulse-2025` — `research/sources/ai-gcc-adoption-05-bcg.md` | **PASS claim; NEEDS FIX: tier** | Supports country-level GCC readiness context and does not support enterprise buyer-needs prevalence. Reclassify the registry entry from Tier 2 industry survey to Tier 3 consulting/country-readiness analysis; the draft’s non-survey caveat is correct. |

## Dates and freshness: PASS after the Alibaba correction

- **Alibaba:** retain the distinction between the November 2025 manuscript date and the 2026 arXiv identifier; do not invent an exact posting date.
- **UK procurement guidance:** retain “historical” or “page marked © Crown copyright 2020”; do not convert the copyright year into a verified publication date.
- **KPMG:** the report cover explicitly says **June 2024**, so the draft’s “older UAE report” treatment and historical-use caveat are appropriate.
- **NBER, RAND, UK guidance and KPMG:** the draft uses older material for mechanisms/context, not current market prevalence or guaranteed outcomes.
- **UK DSIT, Deloitte, IBM, London CIV and PwC Saudi:** the dates in the draft/register resolve to the saved evidence. UK DSIT is dated 13 February 2026, with fieldwork in February–May 2025; those are publication and fieldwork dates, not interchangeable.

## Source-tier corrections

Apply these corrections in `sources.json` before treating the register as final; this review does not edit that file:

1. `rand-ai-failure-roots-2024`: **Tier 1 — research-institute report**; remove the unsupported “peer-reviewed” descriptor.
2. `wharton-genai-adoption-2025`: **Tier 2 — sponsored academic-affiliated commercial survey, self-reported/noncausal**, rather than Tier 1 academic evidence.
3. `bcg-gcc-ai-pulse-2025`: **Tier 3 — consulting/country-readiness analysis**, not an industry survey.
4. `pwc-saudi-ai-value-2026`: **Tier 3 — consulting-firm proprietary self-report survey**, given n=35 and the source’s own interpretive framing.
5. `pwc-uae-workforce-2025` and `redhat-uae-2025`: either use Tier 3 vendor/consulting-survey labels or make the Tier 2 labels explicitly say “vendor-sponsored/self-reported.” Their limitations already contain the necessary caveat, but the bare `Tier2` labels hide it.
6. `kpmg-uae-future-of-work-2024`: Tier 2 can remain only if labelled as professional-services/employee-survey evidence with unaudited named accounts and undisclosed sampling; it should not be presented as independent case-study evidence.

## Method mapping and task coverage: PASS

The mapping is faithful to `method-boundaries.md`:

- IDAO is used for opportunity framing and evidence-dependent gates, with later entry allowed when existing evidence is sufficient.
- Use-Case Prioritization is used for comparative selection, not as a financial business case or ROI calculator.
- Agentic Operations Readiness is limited to one proposed workflow and its operating conditions; it is not treated as generic implementation readiness.
- Human–Agent Operating Model is used for roles, handovers, decision rights, capability and adoption; it is not made a universal process-improvement method.
- AI Value-to-Scale is used for systemic maturity/evidence gaps, not financial valuation.
- Agent Authority is reachable directly for consequential Knowledge, Decision or Action handovers, rather than being a compulsory category.

The audited draft covers the stated mandatory cases: investment/business-case uncertainty, choosing among proposals, an existing strategy/roadmap moving toward delivery, an operational process problem without assuming agents, pilot-to-routine release, expansion of proven use, underperformance/recovery, adoption/work-design needs, direct authority decisions, and a valid no-AI outcome. The fourteen scenarios are explicitly constructed reasoning tests, not customer validation. No missing task requirement was identified.

## Required edits before approval

1. Replace **“Majid Al Futtaim”** with **“Al Ghurair”** in the KPMG sentence, or list all three named organizations from the evidence.
2. Qualify the Wharton, ServiceNow and PwC Saudi findings in the sentences where they are used: **self-reported commercial/consulting survey, noncausal, and not audited ROI**; retain the already adequate caveats for Cisco, Red Hat, PwC UAE, McKinsey, Deloitte and G2.
3. Update the Alibaba date description and registry metadata to distinguish the **November 2025 manuscript** from the **2026 arXiv identifier**, with exact posting date unknown.
4. Correct the registry tier/descriptors listed above, especially RAND, Wharton, BCG and PwC Saudi.

After those edits, the draft’s evidence claims, limitations, method mapping, seven editorial recommendations and mandatory-case coverage are supportable for user review. They remain recommendations—not validated customer segments, measured demand, causal ROI or approval for design/publication.

## Resolution by the main researcher

All four required corrections were applied before final rendering: the company is Al Ghurair; commercial-survey limitations are explicit at the point of use; Alibaba metadata distinguishes manuscript and archive dates without inventing a posting date; and the source-tier descriptions have been corrected. The final report, brief and cited-source register were regenerated from the corrected source register. No second independent review is claimed.