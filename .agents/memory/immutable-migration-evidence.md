---
name: Immutable migration evidence
description: Verify additive metadata changes against populated append-only history, not only empty fixtures.
---

Test metadata migrations with existing rows and the actual immutability triggers installed.

**Why:** An empty fixture can accept a migration whose historical metadata update fails against populated append-only history. Adding a column does not authorize rewriting old revisions.

**How to apply:** Prefer validated compatibility reads for historical metadata and capture new metadata on future immutable inserts. Do not disable history guards to make a backfill pass. Compare effective authority per revision before and after, including when the new column does not yet exist; an empty before-state is not evidence of unchanged access.