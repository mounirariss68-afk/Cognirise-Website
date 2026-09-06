---
name: CMS merge reconciliation
description: Why governed development data migrations need an explicit post-merge path.
---

Database mutations performed while developing a task are not the durable deliverable of an isolated merge. Any governed development data required by the merged feature must have an explicit, idempotent reconciliation path on the main environment.

**Why:** A CMS cutover completed and verified against an isolated task database, but the merged main database remained empty because post-merge setup applied only the schema. The committed report therefore described the task environment rather than the main environment.

**How to apply:** For future governed data migrations, ship a production-blocked reconciliation command alongside the migration. Distinguish absent, complete, and partial states; verify a first application fully; preserve later editorial changes on complete replays; and fail visibly on partial or conflicting state.