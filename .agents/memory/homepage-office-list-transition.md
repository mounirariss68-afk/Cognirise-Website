---
name: Homepage office list transition
description: Compatibility rule for introducing a required homepage list while published editions remain immutable.
---

When introducing a new governed homepage list, keep legacy published editions deliverable while their exact revisions await editorial review. An absent office list is tolerated for the historic homepage, but a present list must be type-correct; other required slots remain strict. Do not inject unapproved office claims into old published content or auto-publish a draft to make the list visible.

**Why:** Regenerating the slot contract before an editor approves the new revision otherwise causes the existing published homepage to fail validation, while serving compiled fallback copy would bypass editorial authority.

**How to apply:** Stage the updated edition as a draft and render a list only when it is present in an approved delivered revision. Once historic editions have been replaced through review and publication, reconsider the temporary missing-list exception.