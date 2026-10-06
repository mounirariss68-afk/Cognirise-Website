# First website publication

The MVP is a deliberate public presentation override, not a CMS publication.
No draft revisions, approvals or active release pointers were changed.

## Enabled behavior
- Common approved UAE English content remains the content source in every country.
- IDAO images on Home and IDAO are selected separately: AE → UAE, SA → KSA,
  TR → Türkiye, all other countries → Europe.
- The browser calls https://api.country.is/ without cookies or referrer to determine
  country from its IP. The provider receives the visitor's IP as part of that
  request; no coordinates, CMS content or identifiers are sent. Failure after
  2.5 seconds selects Europe. VPNs can affect country detection.
- Explicit `?market=uae`, `?market=ksa`, `?market=turkiye`, or `?market=europe`
  overrides detection. Old implicit local-storage defaults do not override it.
- Insights, platforms and partner organization links are suspended.
- Team names and titles are the two founder identities supplied by the owner;
  unpublished biographies and other people are not exposed.

## Restore later
The centralized switches are in `lib/api-zod/src/launch-policy.ts`. Re-enable
the desired surfaces, verify their CMS/release readiness and republish. Do not
delete CMS records or rewrite release history. Turning off launch mode also
restores exact-market release selection; first make sure all required regional
releases exist. Restoring CMS-driven founders requires approved person revisions
and a release that includes them.

## Before clicking Publish
For this first publication, there is no production database yet. In Publishing,
enable **Set up your production database with your current development data**.
This copies the approved release and required CMS records as well as the schema;
creating an empty database would leave this site without its active release.
Review the data included before enabling the copy. Drafts remain private.

Use the deployment preflight and inspect the production database/content setup:
development data is not proof that the production CMS rows and media exist.
Confirm the UAE English release and its pinned media are available to production.
Check Home, methodologies, IDAO, About, contact and industry pages, including
direct URL loads and mobile navigation. Inspect first-visit country detection
from the published site, including Europe fallback. Confirm hidden links stay
absent and contact paths still work.

The existing CMS publishing workflow remains unchanged. This MVP does not require
publishing the incomplete regional Homepage/IDAO or person drafts.
