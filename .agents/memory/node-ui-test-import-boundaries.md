---
name: Node UI test import boundaries
description: Avoid transitive browser-only imports when exercising protected editor flows with Node module mocks.
---

Keep route and URL helpers in dependency-free modules, and load global component styles from the browser app entry rather than modules also imported by Node-rendered UI tests.

**Why:** The Node test runner loads transitive imports before assertions. A seemingly harmless helper import from a page can pull in router components or CSS that the module-mock runner cannot evaluate; the test then fails before it exercises the editor.

**How to apply:** When a UI test fails on an unrelated import rather than an assertion, trace the import boundary before altering test behavior. Move side-effect-free helpers out of browser UI modules and keep styles at the app entry when their components need to be imported by Node tests.