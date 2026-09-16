---
name: Isolated database import order
description: Prevent test harnesses from retaining a public database singleton before schema isolation is configured.
---

Configure database isolation before any helper imports the application's database module, including preflight guards and connection-constructor discovery.

**Why:** A fixture preflight imported the database singleton before switching the search path. The later API import reused that public-scoped pool, so correctly seeded private credentials failed authentication. Successful isolated seed queries did not prove the API used the same schema.

**How to apply:** Set isolation before the first import and verify the running API's schema identity, not merely a separate fixture connection. Keep ordinary login/MFA as acceptance prerequisites; never manufacture sessions to bypass an unexplained login failure.