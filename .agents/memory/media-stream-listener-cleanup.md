---
name: Media stream listener cleanup
description: How API media routes should combine client-abort handling with bounded stream listeners.
---

Use promise-based stream pipelines for media responses, then remove only listeners added during that delivery while preserving listeners that existed on the storage stream beforehand.

**Why:** Node's stream pipeline correctly destroys the readable when a client disconnects, but it can leave internal listeners attached after completion. Repeated delivery can therefore retain listeners even when each response otherwise succeeds.

**How to apply:** Treat listeners already present on a storage stream as storage-owned. Media delivery may add temporary listeners, but it must release only the listeners it owns when the response finishes or aborts.

Coordinate consumer cancellation with asynchronous upstream initialization.

**Why:** A storage SDK can continue initializing after an HTTP client disconnects. Destroying its stream prematurely can cause a later callback to fail outside the request's error handling.

**How to apply:** Verify cancellation both during initialization and after delivery starts. Bound upstream work after cancellation; draining an abandoned large file is not an acceptable substitute for safe abort handling.

Distinguish upstream-adapter lifetime from HTTP-response lifetime.

**Why:** Upstream cancellation can report a delayed connection-reset error after the HTTP consumer has finished cleaning up. Without an adapter listener, that late error becomes an unhandled event and crashes the API.

**How to apply:** Keep delayed upstream errors handled until that upstream operation ends, even when the HTTP response is already closed.