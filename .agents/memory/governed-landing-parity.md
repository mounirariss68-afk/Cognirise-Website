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

A compiled React component may remain as a presentation shell after cutover, but it must never decide whether a route exists or supply public content when the exact immutable release is absent.

**Why:** Treating every compiled component as publication authority creates false audit failures, while allowing its embedded copy to reappear on manifest failure silently reopens the legacy bypass.

**How to apply:** Audit route reachability, content, links, and media against the active market-locale receipt. Classify compiled code separately as a renderer shell and fail whenever it can become public authority.