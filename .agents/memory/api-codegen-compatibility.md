---
name: API codegen compatibility
description: Compatibility corrections required after regenerating Orval Zod clients with the current workspace toolchain.
---

Orval currently emits `zod.int()` for integer fields even though the workspace uses Zod 3, which requires `zod.number().int()`. It can also export query-parameter names as both Zod values and generated TypeScript types, causing ambiguous star exports.

**Why:** This surfaced repeatedly after regenerating clients during a rebase; untouched generated output failed the shared library typecheck.

**How to apply:** After API regeneration, run the library typecheck. Until the generator or Zod version is aligned, correct integer schemas and remove duplicate parameter-type re-exports without changing the OpenAPI contract.