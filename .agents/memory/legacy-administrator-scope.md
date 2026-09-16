---
name: Legacy administrator scope
description: Why legacy content authority is frozen separately from explicit access matrices.
---

Keep legacy administrator geography frozen separately from explicit capability grants. Account administration is not blanket content authority, and configuring an empty matrix means deny-all.

**Why:** Preserving an unconfigured administrator's compatibility behavior must not let later market activation silently expand content access. Automatically converting everyone to a configured matrix would also falsely represent an explicit access decision.

**How to apply:** Use the frozen compatibility projection consistently in session hydration, Users, editor affordances and migration comparisons. Historical-source exceptions require explicit grants rather than restoring the global administrator shortcut.

New disposable release administrators need explicit authority for their intended content operations; do not give them synthetic historical compatibility snapshots.

**Why:** A newly provisioned administrator is not part of the migration's frozen legacy population. Its role alone cannot authorize content preview or release.

**How to apply:** Provision both the configured-matrix sentinel and prerequisite-complete grants for the release's exact topic and market. Keep them bound to the disposable account so normal account cleanup removes them.