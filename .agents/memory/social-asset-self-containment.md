---
name: Social asset self-containment
description: Why downloadable image-led SVG masters must embed their source imagery before preview and delivery.
---

Downloadable social SVG masters must embed their raster imagery as data URIs rather than reference preview-server paths. Always generate and visually inspect the matching production PNGs before packaging the set.

**Why:** An SVG can load correctly as a document while its external images disappear when that SVG is rendered through an image element or opened away from the preview server. The failure leaves typography and overlays on an empty field and can survive source-only checks.

**How to apply:** Validate an explicit delivery manifest rather than every SVG in a shared folder: image-led exports must have decoded, production-scale embedded imagery and matching PNGs, while intentional live-copy SVG-only masters follow their separate handoff contract. Confirm expected PNG dimensions, inspect a contact sheet, and package the exact declared SVG/PNG/readme set.