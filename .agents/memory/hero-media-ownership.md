---
name: Hero media ownership
description: Route ownership rules for approved hero films, posters, and browser encodes.
---

Treat each page’s approved hero film and poster as route-owned media. A new route-specific film must use dedicated asset paths rather than replacing files already consumed by another page.

**Why:** Reusing existing hero filenames for an Industries film unintentionally changed the approved Home hero because both pages resolved the same media paths.

**How to apply:** Before replacing hero media, search all references to the current filenames. If another route consumes them, preserve those files unchanged and create route-specific MP4, WebM, and poster assets for the new integration.