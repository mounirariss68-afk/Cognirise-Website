---
name: Media stream listener cleanup
description: How API media routes should combine client-abort handling with bounded stream listeners.
---

Use promise-based stream pipelines for media responses, then remove only listeners added during that delivery while preserving listeners that existed on the storage stream beforehand.

**Why:** Node's stream pipeline correctly destroys the readable when a client disconnects, but it can leave internal listeners attached after completion. Repeated delivery can therefore retain listeners even when each response otherwise succeeds.

**How to apply:** Treat listeners already present on a storage stream as storage-owned. Media delivery may add temporary listeners, but it must release only the listeners it owns when the response finishes or aborts.