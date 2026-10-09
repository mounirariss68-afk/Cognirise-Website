---
name: Git restore provenance
description: Avoid selecting a rebased backup commit when restoring the state before an import or pull.
---

A commit labelled as a pre-pull or pre-import backup is not sufficient evidence that its tree predates the imported changes. Verify its ancestry and the original pre-pull reference in the reflog before recommending a restore.

**Why:** A rebase preserved the backup commit's message while replaying it onto the new website redesign. The Git panel then displayed that label on a commit whose parent already contained the unwanted redesign.

**How to apply:** Prefer the checkpoint immediately before the import, or identify the original, unreplayed backup. Keep database rollback separate from a visual/code rollback unless data restoration is explicitly requested.
