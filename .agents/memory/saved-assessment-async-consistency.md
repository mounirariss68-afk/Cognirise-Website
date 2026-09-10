---
name: Saved assessment async consistency
description: Consistency rule for asynchronous save and reopen flows that attach stable links to fixed assessment answers.
---

A stable assessment link must never be attached to answers that differ from the fixed record returned by the server. Lock answer-changing and reset controls while save or reopen requests are pending, or apply responses only when an explicit assessment revision still matches. Keep the deletion capability for every record the server successfully creates.

**Why:** A delayed save can otherwise return after an edit and install a share link whose reopened decision differs from the decision still displayed. A delayed initial load can similarly overwrite answers entered before the response.

**How to apply:** Use this rule whenever a public assessment or decision tool saves an immutable snapshot or restores one asynchronously. Cover both delayed save and delayed reopen in browser-level regression checks.