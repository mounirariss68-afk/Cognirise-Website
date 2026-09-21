---
name: Governed landing parity
description: How to migrate compiled landing pages into structured CMS control without losing template fidelity or reopening fallback bypasses.
---

Known-template landing migrations must generate their required slot identities and types from the approved template fallbacks, preserving the existing composition and separately governed entity collections. Configured delivery must fail closed when a required slot or immutable media version is unavailable; compiled content is only an explicit unconfigured fallback.

**Why:** A generic hand-written seed can satisfy row-count checks while producing invalid or incomplete snapshots. If publication does not require every bound slot, editors can delete governed sections and silently reactivate compiled copy or imagery.

**How to apply:** For compiled-to-CMS landing migrations, derive a deterministic parity inventory and publication contract from stable template slots. Seed editable full snapshots, block unresolved media until exact approved versions are pinned, and verify drift in the normal validation command.

Keep single-route migrations isolated from pre-existing parity drift on other routes.

**Why:** A full regeneration can pick up unrelated source edits and add new required slots to another page's publication contract, invalidating its already-approved content.

**How to apply:** Compare every regenerated route with its previous inventory. Preserve unrelated route inventories and report their drift separately rather than silently including another page's migration in a media replacement.

A compiled React component may remain as public authority for a route that has not been cut over. Once that specific route is cut over, it becomes only a presentation shell and must not replace a missing immutable revision.

**Why:** Applying one route's CMS cutover to the whole registry can make unrelated compiled pages disappear. Conversely, allowing a cut-over route to fall back silently reopens the legacy bypass.

**How to apply:** Track cutover authority per route. Preserve compiled delivery for routes not represented by an approved release revision; fail closed only for routes whose CMS cutover is complete.

A CMS cutover is not complete when the revision is merely approved and published. The market-locale also needs an active immutable release that includes every renderer-required media slot and exact delivered media version.

**Why:** The public router treats a missing active release as an absent route, and a landing renderer correctly rejects an approved snapshot when required media slots are missing from the release.

**How to apply:** Before declaring a migrated route live, verify the active release endpoint, the route revision in its manifest, every renderer-specific media slot, and a clean browser render from a fresh client cache.