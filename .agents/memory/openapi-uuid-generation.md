---
name: OpenAPI UUID generation
description: Orval UUID schema generation compatibility with this workspace's Zod version.
---

While this workspace uses Zod 3, define UUID strings in OpenAPI with a UUID regex pattern rather than `format: uuid`.

**Why:** Orval 8 generates the Zod 4-only `zod.uuid()` helper for `format: uuid`, so generated clients succeed but downstream TypeScript builds fail against Zod 3.

**How to apply:** For new UUID path parameters and response fields, use `type: string` plus the established UUID regex pattern until the workspace moves to Zod 4.