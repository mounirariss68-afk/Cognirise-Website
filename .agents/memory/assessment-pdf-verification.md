---
name: Assessment PDF verification
description: Verify browser-generated reports, not fallback fixtures, for typography and personal evidence fidelity.
---

Validate the actual browser download path with rendered pages and extracted text, including one free-text field longer than a page and mixed-script evidence.

**Why:** Synchronous PDF fixtures passed while browser-only font embedding produced garbled extraction and incorrect glyph advances. Several short records also failed to reveal clipping of a single oversized field.

**How to apply:** Use real font metrics and established shaping support, and inspect a downloaded cover and interior after font/rendering changes. Metadata naming the brand fonts is not evidence they are embedded correctly. Unsupported characters must produce an explicit export error rather than silently corrupting a user's evidence.

For browser-printed methodology cards, exact text checks can report fragmentation when a hard-hyphen compound wraps and PDF extraction inserts a space. Inspect the missing paragraph before diagnosing clipping; retain intact compound words and destination URLs rather than weakening the one-page content assertion.