---
name: Matrix browser fixture safety
description: Keep browser mutations scoped to the exact disposable document when a matrix contains real content.
---

Never substitute a visible row's control when an expected fixture selector is absent. Reopen the list, refresh, and search for the exact fixture document before continuing.

**Why:** A browser tester mistook a missing fixture control for a changed identifier and selected an existing document instead. The app correctly created a draft for the clicked document; the apparent wrong-document navigation was a test error requiring narrowly guarded cleanup.

**How to apply:** Scope every open/select/confirm/create action by the same document ID and verify the row title and source revision before mutation. Market catalog IDs are shared across rows; they do not identify a document edition. Readiness blockers on a saved source are allowed for draft-only copying and are not a reason to alter source content.