---
name: Media schema reconciliation
description: Media-library repair must remain separate from content publication and clearance decisions.
---

Keep media-library reconciliation separate from content publication and reviewer clearance.

Retiring a static media path must also stay separate from immutable historical delivery. Remove or quarantine the public source and exclude its exact identity from inventory, upload, and picker flows, while preserving version-pinned CMS objects needed by historical revisions and rollback.

**Why:** Repairing storage or schema compatibility is an operational action, not editorial authorization. Combining them could change live pages or manufacture approval while an operator only intends to restore access to an existing asset. Deleting version-pinned objects would also break revision history, while leaving retired paths selectable can restore rejected artwork.

**How to apply:** Preserve existing publication pointers, immutable media versions, and exact reviewer evidence during library repair or retirement. Block retired identities at current selection/import boundaries, and require the normal explicit review and publication workflow for any content or clearance change.