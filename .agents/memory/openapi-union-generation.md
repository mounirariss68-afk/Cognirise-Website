---
name: OpenAPI union generation
description: Preventing generated declaration collisions and stale incremental validation
---

Generated-contract correctness must be checked independently of incremental
TypeScript build caches.

**Why:** A successful incremental check can reuse results that no longer describe
regenerated source, especially across a merge. Generator success alone does not
guarantee that its output compiles.

**How to apply:** For changes to generated contracts, validate the generated
output with a fresh compiler build. Fix defects in the source contract rather
than manually editing generated output or weakening validation constraints.