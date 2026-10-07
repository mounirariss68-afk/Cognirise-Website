---
name: Website domain transfer
description: Previous-project custom domain ownership during website launch.
---

On 2026-10-07 the user stated that cognirise.ai and www.cognirise.ai were already used by another Replit project hosting earlier website versions.

**Why:** A pending certificate on the new project may involve an existing domain binding, not just DNS propagation. The old project should remain available as a fallback.

**How to apply:** Check both projects' Publishing domain bindings before diagnosing SSL delays. Guide transfer of each domain separately, using current official instructions and exact new DNS records; warn that disconnecting a domain interrupts service there. Do not assume the transfer has been completed or unpublish the old project.
