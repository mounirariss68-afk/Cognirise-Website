# Set, Prove & Hold source inventory

Source reviewed: `attached_assets/Set-Prove-Hold-AI-Guardrails-Framework_(1)_1789395806128.html`.
This inventory maps the attachment's non-UAE substance to
`guardrailsSetProveHoldFixture` in `scripts/src/cms/guardrails-set-prove-hold.ts`.

| Source section | Replacement contract field | Treatment |
| --- | --- | --- |
| Title, standfirst, strapline | `hero` | Sector-neutral source meaning retained. |
| Set, Prove & Hold 4 + 4 + 4 overview | `overview.phases` | All twelve action IDs are retained; Set is sequential, Prove is pre-launch testing, Hold is concurrent. |
| Customer-data rule and four-layer comparison | `layers` | Policy, prompt, runtime and architecture remain ordered and comparable. Absolute language is qualified where correct scoping or scanner coverage is an assumption. |
| Layer × lifecycle table and maintenance callout | `lifecycleMatrix` | All four rows and three lifecycle columns retained. |
| Set: Name, Build, Choose, Assign | `actions[0..3]` | Explanation, owner, output, failure condition, and callout are present for each. |
| Prove: Attack, Red-team, Count, Record | `actions[4..7]` | Explanation, accountable owner, output, failure condition, and callout are present for each. “47 of 50” is explicitly illustrative rather than evidence of a real result. |
| Hold: Watch, Re-test, Revisit, Report | `actions[8..11]` | Explanation, owner, cadence, failure condition, and callout are present for each. Release blocking and board cadence are described as local governance choices. |
| “What this is built from” | `references` | Kept as six non-UAE source records, with direct official URLs and non-certification qualification. The source-cited OWASP Agent Control Standard v0.1 is retained with its public-release status qualified. |
| Three starting moves | `moves.items` | Retained in order with the contact CTA. |
| Footer disclaimer | `references.disclaimer` | Retained as a sector-neutral, non-legal-advice qualification. |

## Explicit exclusions

The UAE public-sector tab, footer references to UAE instruments or authorities,
Arabic procurement discussion, Charter mapping, legal assertions, and phrases
such as “not in force here” are excluded. The replacement also excludes the
attachment's tabs: all material is intended to be concurrently accessible in
the page composition.

The previous standalone manuscript's E1–E5 stopping-rule/exposure explorer,
questions panels, measurement display, and standalone authority section are
not source material for this replacement. They remain valid only in
`guardrails-legacy-v1` historical revisions.

## Reference check record

On 2026-09-14, direct HTTP checks returned 200 for OWASP GenAI's LLM Top 10
and Agentic Security Initiative pages, MITRE ATLAS (`atlas.mitre.org`), the
NIST AI RMF 1.0 DOI (`NIST.AI.100-1`), and the NIST Generative AI Profile DOI
(`NIST.AI.600-1`). The Initiative page is an official OWASP destination, but
does not verify the source's named “Agent Control Standard v0.1” as a public
release; the fixture says so explicitly. ISO's canonical ISO/IEC 42001:2023
catalogue address (`standard/81230`) returned 403 to the automated check, so
the fixture retains the official catalogue URL and qualifies certification
scope rather than claiming a verified certification outcome. Source names and
versions are not represented as legal, security, or certification guarantees.