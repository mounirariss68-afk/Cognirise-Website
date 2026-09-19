---
name: Release parity evidence
description: Durable rules for binding CMS parity evidence to promoted release receipts.
---

Every CMS promotion and rollback must carry a passing, commit-stamped parity report. Bind the canonical report digest and source commit into a separate attestation digest that also includes the immutable release integrity digest.

**Why:** A local validation result is not durable release evidence, and a report detached from the promoted receipt cannot prove which release accepted it.

**How to apply:** Generate the report during the release build, fail the build and runtime promotion gate when it is missing or invalid, store it on the append-only receipt, and expose only report/release metadata without actor or session fields.