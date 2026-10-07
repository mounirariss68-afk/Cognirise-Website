---
name: Composite image animation
description: How to animate artwork supplied inside a designed page or campaign screenshot without reproducing its typography.
---

When a video reference is a composed page screenshot, use the clean underlying artwork—or a text-free crop of the same scene—as the image-to-video source. Do not animate the entire screenshot.

**Why:** Image-to-video models treat visible page typography and layout as part of the scene, reproducing distorted or persistent letterforms even when the prompt forbids text.

**How to apply:** Confirm the source frame contains only the visual field, matches the requested video ratio without bars, and has no captions or logos before starting an expensive generation. If the generator cannot emit the source ratio, choose the closest orientation, then crop the generated master to the intended composition before web export and inspect a contact sheet for empty bands.

For still-photo revisions, also locate the original image rather than regenerating a website screenshot. When replacing people, use the supplied portraits as identity references and render background depth of field within the new scene, not as a blurred patch pasted onto the screenshot.

**Why:** The user rejected a screenshot-derived replacement for degraded detail and an unnatural blurred insertion, requesting a clean redraw from the original.

**How to apply:** Deliver the clean, full-frame redraw for review first. Do not apply it to the website when the user has requested approval before replacement.

For changes to the number or placement of people, use an explicit visual composition guide if text-only edits preserve the old arrangement.

**Why:** Repeated identity-reference prompts retained one background person despite a request for two; a guide showing both at their intended scale allowed the image model to render both.

**How to apply:** Treat any rough placement composite as an intermediate guide only. Regenerate a coherent scene from it and inspect the final person count, depth, likeness and foreground preservation before delivery.