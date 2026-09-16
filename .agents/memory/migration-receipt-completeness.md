---
name: Migration receipt completeness
description: How to handle databases where migration history exists but required triggers or seed invariants do not.
---

Treat migration receipts as evidence that execution was attempted, not proof that every required database invariant still exists. Verify critical triggers, functions, and seed rows directly.

**Why:** A database retained the migration history and target table while the required trigger and compatibility rows were absent, causing authorized CMS access to fail closed.

**How to apply:** Add a new idempotent forward repair rather than editing an already-recorded migration. Test both existing-row backfill and future-row trigger behavior, then verify the live invariant after applying it.