---
name: Chromium CDP target selection
description: Avoid attaching raw-CDP browser checks to extension background pages exposed by workspace Chromium.
---

Give each raw Chromium/CDP check a unique initial page identity and select that exact target rather than taking the first target or first page-like target.

**Why:** Workspace Chromium may expose an extension background target and browser UI targets before the test tab. A check can then navigate or inspect the wrong context and report misleading selector timeouts even though the application rendered correctly.

**How to apply:** Start a tokenized data page with a unique title, inspect `/json/list`, and choose the `type=page` target with that exact title. Reserve a per-process debugging port and keep a focused contract test for these invariants.