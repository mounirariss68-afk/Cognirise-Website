# Guardrails replacement contract

`framework.template` remains `"guardrails"` so the canonical methodology route,
editor permissions, media-reference collection and public-delivery boundary do
not change. New Set, Prove & Hold editions use
`contentVersion: "set-prove-hold-v1"` and validate against the dedicated
replacement arm of the Guardrails union.

The replacement arm deliberately has no `stoppingRule`, `questions`,
`measurement`, or standalone `authority` fields. Those fields describe the
superseded Guardrails manuscript and are retained only by
`contentVersion: "guardrails-legacy-v1"` for historical revision and preview
readability. `template: "guardrails"` content without a version is interpreted
as that legacy arm; an explicit unknown version is rejected.

The replacement owns one sector-neutral editorial composition:

- hero and the connected 4 + 4 + 4 action map;
- four enforcement layers, customer-data example and layer/lifecycle matrix;
- twelve fixed action IDs, each with statement, explanation, owner,
  output-or-cadence, failure condition and callout;
- six qualified, non-UAE source references (including the source-cited OWASP
  Agent Control Standard v0.1 with release status), three starting moves and the existing contact /
  Agent Authority links.

Fixed action, layer, lifecycle, and move identifiers protect the source model;
the explanatory text remains editorial. The fixture is staging-only and does
not provide a frontend fallback. UAE-specific source material is excluded from
the replacement fixture and its references.