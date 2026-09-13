---
name: Router query verification
description: Deep-link tests must model pathname and search as separate router inputs.
---

Keep pathname and search separate in routing mocks and verify query-driven selection against the installed router contract.

**Why:** A test mock that included the query string in the pathname let a market-selection test pass even though real browser routing supplied only the pathname. That concealed a wrong-market editing risk.

**How to apply:** Use the router's reactive search API for market/locale parameters. Test code and catalog-ID links with independent pathname and search values, including delayed catalog loading.

An explicit market/locale URL must not fall back to a default while any required catalogue is still loading.

**Why:** A fast availability response and slow edition matrix caused a cold reload to open UAE instead of KSA even after pathname/search handling was corrected. Tests with all data immediately present missed the race.

**How to apply:** Exercise both catalogue arrival orders, reject unavailable explicit targets visibly, and distinguish initial URL selection from later deliberate manual switches.