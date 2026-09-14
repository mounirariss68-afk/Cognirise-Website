# Set, Prove & Hold publication evidence

## Scoped release

- **Route:** `/methodologies/guardrails-framework`
- **Document kind:** `framework`
- **Replacement content version:** `set-prove-hold-v1`
- **Development successor revision:** `4565707e-cfa9-4dec-bb45-253ab569ab8d`
- **Publication method:** the authenticated CMS `POST /api/documents/:documentId/publish` lifecycle, after normal administrator login, TOTP MFA verification, and CSRF validation.
- **Publication authorization:** the scoped project-owner chat instruction recorded in the CMS publication note and replacement staging audit metadata.

The reconciliation did not update a publication pointer directly. It created one digest-bound successor from an exact receipted legacy predecessor and retained prior revisions. The normal CMS endpoint is the only code path allowed to produce `document.published`.

The initial disposable-fixture teardown removed audit rows whose actor was the
fixture user, including the test publication event. This was corrected in
`cms-owner-browser-fixture.ts`: teardown now removes only fixture-target audit
records and retains a real document's audit evidence even when the actor was a
disposable test principal. The exact replacement was then re-published through
the normal MFA+CSRF CMS endpoint, and the release receipt was recorded from
the resulting ordinary `document.published` event. Fixture cleanup completed
after that repair, and an idempotent release replay confirmed both the durable
audit and receipt remained available.

On a merged development target, post-merge uses the project’s existing
development-only CMS fixture lifecycle with a private `mktemp` state file:
setup, normal MFA+CSRF release of the exact receipt-bound revision, verification,
and cleanup in a shell trap. It does not elevate an existing user, manufacture
a session, or write publication pointers directly.

Protected preview parity was also verified through its authenticated capability:
the exact replacement payload matched, `usedFallback` was false, expected media
pins were empty, and the response carried forced noindex metadata. Preview
tokens and private preview URLs were neither recorded nor included here.

## Delivery evidence

The development public CMS endpoint was queried after publication:

`GET http://localhost:80/api/public/content/uae/en/framework/guardrails-framework`

The endpoint returned the published replacement and verification required:

1. `content.template === "guardrails"` and `content.contentVersion === "set-prove-hold-v1"`;
2. all twelve Set–Prove–Hold actions and all six final reference records, including the qualified OWASP Agent Control Standard v0.1 record;
3. no `heroMedia` or `heroMediaId` fields and no replacement media pins;
4. no UAE-specific editorial strings (`UAE`, Dubai, Abu Dhabi, PDPL, Arabic, or Charter).

An inexpensive delivery-boundary check also queried
`GET http://localhost:80/api/public/content/uae/ar/framework/guardrails-framework`.
It returned `404`; the English replacement is not used as an implicit
cross-locale preview or fallback. This was an HTTP-only check (no browser
preview).

The same reconciliation command was replayed after publication and returned the identical successor revision with no write. If a later editor revision exists, the receipt path returns `preserved` and never changes the later draft or published history.