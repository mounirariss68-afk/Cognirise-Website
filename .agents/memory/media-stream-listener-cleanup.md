---
name: Media stream listener cleanup
description: How API media routes should combine client-abort handling with bounded stream listeners.
---

Use promise-based stream pipelines for media responses, then remove only listeners added during that delivery while preserving listeners that existed on the storage stream beforehand.

**Why:** Node's stream pipeline correctly destroys the readable when a client disconnects, but it can leave internal listeners attached after completion. Repeated delivery can therefore retain listeners even when each response otherwise succeeds.

**How to apply:** Treat listeners already present on a storage stream as storage-owned. Media delivery may add temporary listeners, but it must release only the listeners it owns when the response finishes or aborts.

Do not expose a Google Storage SDK user stream directly to an aborting HTTP pipeline before the SDK has installed its deferred response pipeline. Isolate it behind a pass-through and cancel upstream immediately after safe readiness.

**Why:** With Google Storage 8 and Node 24, a page reload could destroy the SDK user stream before its response callback ran. The callback then threw `ERR_STREAM_UNABLE_TO_PIPE` outside the route's awaited pipeline and crashed the API.

**How to apply:** GCS emits its response event before attaching the internal pipeline: defer cancellation to a microtask after that callback. First-data readiness is a fallback for ordinary readables. Never drain the entire remaining file after abort; public videos would amplify cheap cancelled requests into large storage reads. Include “consumer aborts, then upstream response arrives” and bounded upstream cancellation in regression coverage.

Keep a bounded adapter-owned error listener on the pass-through after response-pipeline cleanup.

**Why:** Upstream cancellation can report a delayed connection-reset error after the HTTP consumer has finished cleaning up. Without an adapter listener, that late error becomes an unhandled event and crashes the API.

**How to apply:** Distinguish adapter-lifetime listeners from response-lifetime listeners; clean only the latter when delivery ends and exercise delayed upstream errors after consumer abort.