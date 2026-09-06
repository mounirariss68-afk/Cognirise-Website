---
name: API TypeScript route tests
description: Why API tests that import the Express route graph use an esbuild-backed runner.
---

Run route-level TypeScript tests through the API server’s esbuild-backed test runner rather than Node’s native type-stripping mode.

**Why:** Native type stripping can run isolated utility tests, but it does not resolve the extensionless ESM imports used throughout the server route graph. Bundling preserves the production module-resolution behavior without changing source import conventions or adding a second TypeScript runtime.

**How to apply:** Keep route-level tests on the bundled runner, and explicitly externalize native or runtime-loaded packages that esbuild should not inline.