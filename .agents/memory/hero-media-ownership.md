---
name: Hero media ownership
description: Route ownership rules for approved hero films, posters, and browser encodes.
---

Treat each page’s approved hero film and poster as route-owned media. A new route-specific film must use dedicated asset paths rather than replacing files already consumed by another page.

**Why:** Reusing existing hero filenames for an Industries film unintentionally changed the approved Home hero because both pages resolved the same media paths.

**How to apply:** Before replacing hero media, search all references to the current filenames. If another route consumes them, preserve those files unchanged and create route-specific MP4, WebM, and poster assets for the new integration.

For an image-governed landing route gaining a compiled motion layer, keep the exact approved image intact beneath the film and its matching poster. Enable the film only for the edition explicitly receiving it until a separate, edition-aware publishing contract exists; do not assume that an image approval authorizes a film in every market.

**Why:** An image slot can already pin a reviewed immutable revision while other markets have different approvals. Reusing or silently superseding that authority makes poster failures, rollback and cross-market delivery misleading.

**How to apply:** Treat the route-owned film as presentation for the intended edition, retain the governed image as the last fallback, and add CMS film authoring only with separate immutable poster/encode pins and explicit market selection.