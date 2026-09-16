---
name: Fixture relationship evidence
description: Validate fixture identifier domains through the same relationships used by application readers.
---

Validate fixture relationships through application joins, not just valid UUIDs, row counts, or preservation hashes.

**Why:** Different identity domains can share the same UUID representation. Valid rows and unchanged hashes can therefore conceal broken relationships and do not establish what an application reader actually sees.

**How to apply:** Check the staged/live API projection before a browser release journey and assert that every fixture reference joins its intended identity domain. Keep fixture repair isolated; an invalid fixture is not authority to infer visibility, invent a shared source, or change existing user content.