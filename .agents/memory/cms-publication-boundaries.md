---
name: CMS publication boundaries
description: Security boundary between mutable editorial drafts and public CMS delivery.
---

Public visibility and media access must be derived from the exact approved revision selected by a published market edition. Document-level references that drafts can replace are not public-authorization evidence. Capture an immutable media version when the revision is created; publication must preserve that pin rather than resolving whichever asset version is newest at publish or request time.

**Why:** A draft saved after publication can reference a private asset, and a replacement uploaded after review can otherwise slip into an already-approved revision. Mutable asset identity is not enough to reproduce historical output.

**How to apply:** Use the same all-content visibility rule for public lists, details, sitemaps, and media. Resolve exact version pins from the selected approved revision, preserve pins when restoring historical content, and reject unbound or draft-only media.