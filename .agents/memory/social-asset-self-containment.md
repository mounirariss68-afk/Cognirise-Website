---
name: Social asset self-containment
description: Why downloadable image-led SVG masters must embed their source imagery before preview and delivery.
---

Downloadable social SVG masters must embed their raster imagery as data URIs rather than reference preview-server paths. Always generate and visually inspect the matching production PNGs before packaging the set.

**Why:** An SVG can load correctly as a document while its external images disappear when that SVG is rendered through an image element or opened away from the preview server. The failure leaves typography and overlays on an empty field and can survive source-only checks.

**How to apply:** For image-led social exports, verify there are no environment-specific image references, confirm the expected number and dimensions of PNG renders, inspect a contact sheet, and package self-contained SVGs with their matching PNGs.

External SVG diagrams must embed complete valid font bytes; page font loading does not establish SVG font fidelity.

**Why:** A base64 font declaration can look correct in source yet fail the browser's OpenType sanitizer, silently replacing Comfortaa with a fallback.

**How to apply:** Verify the rendered external image and browser font warnings, not only the font-family string or file parser. After font repairs, recheck geometry and palette so rebuilding from source does not restore off-brand rounded shapes.

For LinkedIn headers, use the original image-led LinkedIn designs and their Pulse source artwork as the visual baseline, not just the brand colours.

Do not reuse the waves-breaking-through-a-wall launch artwork as the first
visual of a follow-on LinkedIn series.

**Why:** The owner has already used that artwork for the website-launch post
and explicitly requested a different image for the next series.

**How to apply:** Preserve the Pulse palette and editorial layout, but choose
a distinct scene and silhouette for subsequent campaign posts.

Keep Cognirise company-page covers separate from personal-profile headers.
Company covers use a shallow panoramic Pulse composition with the official
logo inset at the top right and no added headline unless requested.

**Why:** The owner explicitly distinguished the company-page requirement
from the existing personal-page designs.

**How to apply:** Reframe the original artwork for the company cover shape,
verify current upload specifications, and check the actual exports rather
than stretching a personal banner. Allow for responsive edge cropping.

For the website-launch LinkedIn post, the owner approved full-bleed original
waves-breaking-through-a-wall artwork, with the logo top left and only
“Built in practice. Now online.” bottom right.

**Why:** The owner preferred this minimal artwork-led composition over the
editorial split layout and explicitly confirmed the final version.

**How to apply:** Preserve this approved launch composition when adapting or
re-exporting it; do not restore extra launch labels, descriptions or footer bars.

**Why:** The user rejected newly generated futuristic cityscapes and split-image header layouts as far from Cognirise Pulse, and asked to return to the initial LinkedIn designs.

**How to apply:** Start from the original header and post compositions. Preserve the deep navy and ivory monumental structures and fine violet–magenta–coral currents. For text-free variants, remove editorial copy without introducing a different architectural style or added split-image dividers.