# CMS ownership, routes, and cutover

Contract version 1 lives in the neutral API contract package and is enforced by the API, admin, migration, preview, and public client. UAE/English is canonical. Market fallback follows enabled market configuration; no translated locale is inferred.

| Experience | CMS-owned | Code-owned | Public route | Sort / empty behavior |
| --- | --- | --- | --- | --- |
| People / advisors | Entity identity, role, title, biography, contribution, focus, links, approved identity asset/fallback, visibility, order, sources/review | About/advisor art direction and surrounding marketing copy | `/about`, `/advisors` | `content.order`; compiled collection fallback until the people cutover switch passes |
| Partners | Alliance content, evidence, coverage, links/logo, relationship/visibility/order, sources/review | Page framing and alliance-group presentation | `/partners` | `content.order`; intentional empty review queue when authoritative |
| Platforms | Entity summary, standard sections, capabilities, differentiators, CTA, relations, SEO/media/order | CogniOS specialist architecture and named legacy specialist interactions | `/platforms`, `/platforms/:slug` | Specialist static routes win; new standard records use the generic route |
| Publications | Article/POV variant, teaser/body, author/dates, topics/relations, hero/PDF, SEO/social/order | Insights landing composition | `/insights`, `/insights/:slug` | Articles render structured blocks; POVs require an approved PDF |
| Case studies | Summary/full variant, disclosure, narrative, controls/outcomes, approved evidence, quote/media/CTA | Work landing narrative | `/work`, `/work/:slug` | Only public, full, non-restricted records receive detail routes |

The five `VITE_CMS_CUTOVER_*` switches are independent and default off. While a switch is off, an API/contract/empty state may use the compiled collection. Once on, empty stays intentionally empty and API or contract failure is observable instead of reverting to compiled content.

## Header navigation visibility

Administrators can independently enable or disable every registered header menu and submenu item from **Website Navigation** in the CMS. The registry owns labels and safe internal targets in code; the CMS owns only visibility. A disabled parent hides its complete submenu without deleting the saved child choices. Public delivery defaults to the complete safe registry if the settings API is unavailable, so an outage cannot strand visitors without navigation.

## Media boundary

The manifest reconciles 22 governed website assets. `blueprint-annotated.png` is a twenty-third physical file and remains explicitly code-owned with the CogniOS specialist experience. Five currently used collection/detail images are CMS candidates. Their checksums, dimensions, usages, accessibility status, and rights status are recorded; they stay private and `pending-review` until rights, alt/decorative state, and durable-object availability are approved.

## Initial cutover status

All 18 imported UAE/English records are drafts. No edition is approved or published, no fallback switch is removed, and static files remain available for rollback. `scripts/cms/output/cutover-report.json` is the machine-readable release record.