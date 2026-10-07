---
name: Publishing footprint and design boundaries
description: Keep creative tooling and Canvas prototypes out of the production website footprint without deleting source assets.
---

Treat the Design Canvas as workspace-only unless the owner explicitly asks to publish a particular design.

**Why:** During the first website launch, the owner said the many Canvas designs do not need publishing, and required approval before any deletion.

**How to apply:** Exclude prototypes from the deployment bundle rather than deleting or unregistering the Canvas. Preserve the working design previews, original artwork and uploaded source files. Do not assume permission to exclude prototypes authorizes removing live website assets or CMS media.

Keep the production system-tool footprint limited to verified application needs; creative export tools can be reinstalled when needed.

**Why:** Publishing failed at the platform's 8 GiB image limit after the website had built successfully. Removing development tools is a dependency-footprint change, not a content cleanup.

**How to apply:** Check executable use in the API before proposing removals. Preserve video-probing support for CMS uploads. Obtain explicit approval for package removals and explain which local creation/export workflows will need those tools reinstalled. Never present a successful local build as proof that the published image is under the limit.
