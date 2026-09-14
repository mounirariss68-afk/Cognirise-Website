# Guardrails governed contract

The source of truth is `guardrailsFrameworkContentSchema` in
`lib/api-zod/src/cms-content.ts`. Its OpenAPI counterpart is
`CmsGuardrailsFrameworkContent` in `lib/api-spec/openapi.yaml`; generated
clients retain the discriminated `framework` union.

The runtime composition has the eleven ordered editorial groups:
`hero`, `distinction`, `layers`, `stoppingRule`, `questions`, `method`,
`maintenance`, `measurement`, `authority`, `references`, and `moves`.
The separate `relatedLink` is the approved backlink displayed on Agent
Authority only when a Guardrails edition is publicly delivered.

`references` contains the page’s three display-only source groups.
The existing governance `sources` array remains separate: displaying source
names does not supply verified evidence or satisfy publication checks.
SEO stays on the existing revision snapshot, not inside the composition.

`layers.diagram` and `stoppingRule.diagram` retain the SVG-specific wording;
their fuller tables remain separate editorial fields. Fixed ordered IDs,
strength values, threshold placement, exposure destinations/addition IDs,
phase order and step counts are validated, not inferred from editable labels.

`scripts/src/cms/guardrails-fixture.ts` is a staging-only source importer.
It extracts reviewed fields from the committed attachments; the website
does not import it, and missing CMS content never falls back to it.

See `docs/guardrails-source-authority.md` for preserved source differences
and the publication boundary.