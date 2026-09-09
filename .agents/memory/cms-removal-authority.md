---
name: CMS removal authority
description: How governed CMS removal must distinguish editable state from public and historical state.
---

For governed content, decide whether removal means archive or permanent deletion from the complete edition-level publication state and publication history, not from the latest revision's editorial status. A record can have a draft revision while an older revision remains publicly live. Public fallback is considered configured only after a completed immediate-publication audit—not approval or scheduling—and remains configured after archival and restore.

**Why:** Treating a latest-revision `draft` label as proof that a record was unpublished routed a live record into permanent deletion, which the API correctly rejected. The same UI branch also hid recovery after archival.

**How to apply:** Have the server expose an authoritative deletion capability computed across every market edition and historical publication. Published, scheduled, or previously published records must archive and retain a restore path; only never-published records may be permanently deleted. Test publish → edit draft → remove and archive → restore as lifecycle sequences.