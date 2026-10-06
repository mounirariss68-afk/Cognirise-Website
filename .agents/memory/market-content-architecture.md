---
name: Market content architecture
description: Durable market-localization approach for the Cognirise website.
---

The UAE edition is the canonical launch version, but the content model must support distinct UAE, KSA, Türkiye, and Europe editions rather than simple translated copies.

**Why:** Each market needs different proof, terminology, priorities, calls to action, SEO metadata, legal content, and potentially imagery; automatic geolocation must not silently override user choice. The public API rejects an unknown or disabled requested market before considering canonical fallback, so every market exposed by the website switcher must also exist as an enabled global market edition.

**How to apply:** Model shared content separately from market overrides, provision every switcher market through the governed reconciliation baseline, use explicit locale fallbacks, preserve a visible market switcher, and let editors preview and publish each market independently.

For the first website launch, country-specific IDAO imagery is the required regional difference: UAE, Saudi Arabia, Türkiye and Europe each have a distinct approved set; countries outside these groups use Europe's images. Do not assume choosing an image region implies a published regional content edition.

**Why:** The owner set image localization as the immediate launch requirement while other market content and CMS publication are still incomplete. A Europe visual fallback should not silently switch users to an absent or unapproved CMS release.

**How to apply:** Resolve the visual region independently from editorial market; allow an explicit user region choice to take priority over automatic country detection. Revisit the shared-content launch bridge only when exact regional content releases are ready.

## Exact editions versus fallback enrichment

Treat an exact-market published edition as editorial authority even when its copy is deliberately neutral. Regional fallback enrichment must not append evidence or convictions just because the approved text omits the country's name.

**Why:** Neutral wording is a valid editorial choice, not proof that localization is missing. Re-enriching an exact edition can undo removals, exceed validated section counts, or restore evidence that editors intentionally excluded.

**How to apply:** Carry the edition's provenance into server projection, preserve safe same-market content, and make a second frontend projection idempotent. Validate the complete projected snapshot and its source associations, not just the visible regional paragraph.

## Publication must survive regional filtering

Check every market derivative that a source edition can serve before approving publication. Keep delivery validation non-recursive.

**Why:** A source can satisfy every array minimum yet lose all application items, signals or source associations after regional filtering. Discovering that only during public delivery turns a valid editorial save into a broken page.

**How to apply:** Canonical fallback authority must pass all supported audience projections; an exact noncanonical edition must pass its declared audiences. Allow incomplete drafts to save, but return market-specific validation errors before publication.