---
name: Visual inspector verification
description: How to verify section-focused editors when specialist content shares a public template.
---

Verify actual rendered inspector controls against the public section that consumes each field, not just an expected section-path table.

**Why:** A path-map test can pass while an editor control remains inside a different section gate. Specialist and common fields both exposed this gap during visual authoring integration.

**How to apply:** Include rendered control presence/absence assertions for adjacent sections, and check that immutable review states disable inputs without disabling preview navigation. Keep presentation-only migrations separate from editorial approval; a new arrangement is not approval of revised content.