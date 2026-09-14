# Guardrails source authority and review boundaries

## Authoritative inputs

- `attached_assets/guardrails-page-copy_1789364808531.md`: the eleven page sections, headings, prose, table cells, emphasis, actions, SEO and disclaimer.
- `attached_assets/illustration-A-four-layers_1789364808532.svg`: figure A’s visible text, ordering, threshold and strength marks.
- `attached_assets/illustration-B-sufficiency_1789364808532.svg`: figure B’s visible text and exposure-to-minimum relationships.
- `attached_assets/revised-framework_1789364808532.md`: context only. Its quantified attack claims, expanded citations and change log are not imported.

The staging importer extracts render fields from the committed attachments. It does not place raw markdown documents, section-number annotations, drawing instructions or SVG markup in the CMS payload. Markdown emphasis within reviewed prose is retained for semantic rendering.

## Deliberately preserved wording differences

The diagrams and tables are separately editable fields. These differences are not editorial corrections:

- A uses curly quotation marks and apostrophes in its worked rule and several examples; the prose/table uses straight quotation marks and apostrophes.
- A’s Prompt example says “The data is still in front of it.” The table says “The other customer's data is still in front of it.”
- A’s Runtime bypass description uses “Reliable against opportunistic misuse. Unreliable against a motivated attacker:” and “unsafe responses”. The table uses a semicolon, “against commercial guardrails”, and “unsafe-response rates”.
- B’s first compact band is “Undone at will, internal only”; the table says “Trivially or windowed-reversible, internal only”.
- B abbreviates the one-customer and regulator/public/safety bands. Their fuller table wording is retained in the table.
- B’s architectural-scoping addition says “the data and tools reached”; the table says “the data and tools it can reach”.
- B’s above-ceiling addition says “+ a named artefact that carries the authority”; the table says “and the design must name the artefact that carries the authority”.
- B’s quote and exposure explanation are diagram-specific footer text, not substitutes for the section’s prose and pull-out.

## Structural interpretation

The last two Runtime routes share a destination, but only the irreversible one adds architectural scoping. The last two Architecture routes share a destination, but their additions are separate: independent second control versus a named authority-carrying artefact. The final band does not inherit the previous band’s addition.

Exposure IDs are structural identifiers, not an extension of Agent Authority’s E-band assessment. No Guardrails score, questionnaire or saved assessment is introduced.

## Release boundary

Canonical route: `/methodologies/guardrails-framework`. No alternate route or redirect is introduced.

The initial source edition is UAE English. Source names are not invented URLs, verified citations, verification dates, provenance or legal approval. A hidden development draft and its authorized preview are review material, not publication certification. Production publication, production navigation changes and deployment require separate approval and are not part of this change.