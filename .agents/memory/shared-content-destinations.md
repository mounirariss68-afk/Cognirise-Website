---
name: Shared content destinations
description: Preserve editorial source identity separately from approved delivery and historical custom versions.
---

Treat the saved shared source, the frozen published source, and the destination selection reviewed with that source as distinct authorities.

**Why:** An editor must be able to customize from an unpublished saved revision without making that draft public or hiding an older approved revision. Publishing destinations separately from shared content can release an unreviewed combination.

**How to apply:** Resolve public content only from approved published source pointers and apply requested-market/locale exclusions before fallback. Changed Shared content must release with its reviewed destination snapshot. A separate reviewed-visibility release is safe only against already-approved published exact content or an unchanged live Shared source, without moving content pointers. Validate locales for the requested market, not their union.

Never infer a shared source from equal regional payloads or choose an arbitrary region for a multi-edition legacy document.

**Why:** Matching content does not authorize collapsing independently governed editions, and picking one can overwrite the intended regional ownership.

**How to apply:** Preserve historical regional versions and publication pointers; use an explicit administrator choice to create a separate unpublished shared source when the legacy source is ambiguous.

Separate secure defaults for new destinations from historical availability reconstruction.

**Why:** A new destination must remain private until an approved release, but applying that default to legacy-baseline inserts can silently remove previously published content. Schema synchronization may also apply new defaults before historical reconciliation runs.

**How to apply:** Write reconstructed legacy decisions explicitly, independently of table defaults. Test both migration-only upgrades and schema-first reconciliation; preserve published-source selection, not just a coarse visible/hidden count.

Apply public eligibility before selecting the winning content source, consistently across every public consumer.

**Why:** Ranking a private regional revision before filtering it can hide a valid shared page or deny that page's media. Conversely, document-wide media permission can expose assets belonging only to an excluded customization.

**How to apply:** Navigation, content, sitemaps, and media must agree on the eligible winning revision. Keep represented historical URLs known separately from currently deliverable URLs, so superseded links can be suppressed without suppressing valid fallback content.

Treat a successful publication readback as insufficient evidence of live shared delivery.

**Why:** A targeted media cutover can update the edition publication while leaving the shared destination's approved source behind; the strict public gate then correctly hides the page despite a published database revision.

**How to apply:** Targeted cutovers must release the reviewed shared source and its existing authorized destination snapshot together, including replay. Verify the public collection and actual media response, not only revision status.

Use a neutral, locale-specific Shared editorial baseline, never a permanent UAE master or a public “Global” market.

**Why:** Shared wording and market-specific imagery must evolve independently without turning one country's editorial ownership into authority over every other market. Market-only content remains legitimate without a baseline.

**How to apply:** Keep unchanged fields inherited, record intentional field overrides, and require explicit comparison/adoption of shared successors. Creating a managed draft must preserve the previous live source; only reviewed publication transfers delivery authority. Source-market permissions remain relevant to inherited content even when an exact destination revision exists.

Classify managed materializations separately from their legacy storage address, and authorize published history from immutable lineage.

**Why:** A real-market edition formerly used as the Shared source can become an adaptation. Treating it as the global source causes false stale errors and an unreachable visibility-release action. Conversely, a newer Independent draft does not remove source restrictions from an older Adapted publication.

**How to apply:** Use binding identity for current exact-edit intent. For historical release, follow the published revision's own lineage; a NULL baseline requires sealed Independent-publication evidence, not the binding's current mode. Confirm public 404→200, pinned media and draft isolation, not just a successful publish response.

Verify the published subsection in the rendered page, not only in the public API.

**Why:** A valid published response can still be ignored by a page whose CMS cutover is disabled. That leaves the old compiled page visible and makes successful publication appear to have done nothing.

**How to apply:** Check the actual heading and figures in the public DOM after asynchronous loading. Activate only the authorized page when unrelated pages are not ready for CMS cutover.