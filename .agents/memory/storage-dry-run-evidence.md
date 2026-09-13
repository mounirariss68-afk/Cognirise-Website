---
name: Storage dry-run evidence
description: Avoid treating empty operational scans as proof that cleanup candidates are safe.
---

An empty storage dry run is evidence only after the adapter's namespace has
been checked against the actual upload writer. Pair it with an independent
read-only database inventory and production-shaped adapter tests.

**Why:** A doubled staging suffix produced an apparently successful empty
scan while looking in the wrong database namespace. Empty results could not
exercise the safety classification at all.

**How to apply:** Verify namespace construction before interpreting counts.
When storage and database inventories are empty, explicitly say no candidate
was classified; rely on focused adapter tests for committed/published retention
and never treat a dry run as permission to apply deletion.