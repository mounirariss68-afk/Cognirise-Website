---
name: Navigation provenance
description: Physical history offsets must remain aligned when unsaved-work guards cancel traversal.
---

Navigation provenance and its dirty-work guard must run before any router or market subscriber can notify React about a traversal.

**Why:** A guard can cancel `popstate` after the browser has already moved. Missing that movement skews physical offsets. Real-browser checks also found that earlier subscribers can synchronously unmount a late guard before it runs; capture alone is insufficient for these window-targeted events.

**How to apply:** Preserve initialization before market/router imports and invoke dirty-work guards from the early observer. Do not count both native History calls and router-generated synthetic events. Verify actual browser cancellation, native hashes, and cold restoration; isolated ledger mocks do not reproduce subscriber ordering.