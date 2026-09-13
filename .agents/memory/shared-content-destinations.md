---
name: Shared content destinations
description: Preserve editorial source identity separately from approved delivery and historical custom versions.
---

Treat the saved shared source, the frozen published source, and the destination selection reviewed with that source as distinct authorities.

**Why:** An editor must be able to customize from an unpublished saved revision without making that draft public or hiding an older approved revision. Publishing destinations separately from shared content can release an unreviewed combination.

**How to apply:** Resolve public content only from approved published source pointers, apply requested-market/locale exclusions before fallback, and atomically release shared content with its reviewed destination snapshot. Validate locales for the requested market, not against the union of all market locales.

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