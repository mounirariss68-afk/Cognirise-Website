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

## Public-access restoration verification — 2026-09-15

- **Environment:** Replit development preview (`http://localhost:80` through the managed artifact proxy).
- **Requested edition:** `uae/en`.
- **Direct delivery:** `GET /api/public/content/uae/en/framework/guardrails-framework` returned `200`, `set-prove-hold-v1`, and `usedFallback: false`.
- **Navigation policy:** the development environment has no published navigation snapshot (`isConfigured: false`), while its availability-filtered response marks `methodologies.guardrails` visible and the canonical page enabled.
- **Website fallback:** the unconfigured-policy fallback now contains the same Guardrails destination in the desktop and mobile How we do it menus. Navigation destinations retain `market` and `locale` in the URL.
- **Rendered route:** `/methodologies/guardrails-framework?market=uae&locale=en` rendered the governed Set, Prove & Hold page without browser-console errors. Static evidence is stored at `screenshots/guardrails/task-350-supported-route.jpg`.
- **Configured English markets:** Europe, KSA, and Türkiye currently receive the approved UAE English shared source with `usedFallback: true`, according to the pre-existing published availability state. This restoration did not alter those decisions.
- **Unsupported edition:** `uae/ar` returned `404`; the public configuration currently supports English only. No draft or implicit cross-locale delivery was introduced.
- **Automated coverage:** focused website tests passed for the compiled menu fallback, market-aware desktop/mobile links, governed metadata ownership, direct route registration, CMS render states, and Agent Authority linkage. API navigation tests passed for both available and unavailable Guardrails editions.

The legacy `guardrails-redesign.browser-test.mjs` reached the published page but stopped on its pre-existing mobile layer-selection assertion because the current control no longer reports one `aria-pressed` selection. The access restoration was instead confirmed by the focused regressions, public HTTP responses, and rendered screenshot above.

Deployment metadata reported no active production deployment for this workspace. Therefore no production URL or production publication state could be verified, and there is no production CMS publication action to perform here. The remaining release action is to publish the verified website/API artifacts; production content provisioning will follow the normal deployment/database lifecycle rather than direct pointer changes or a compiled content fallback.