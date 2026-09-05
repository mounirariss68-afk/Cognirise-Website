# Task 37 — Representative-content CMS decision spike

**Status:** provisional recommendation; not a production CMS approval  
**Decision under evaluation:** Sanity for the Cognirise editorial foundation  
**Scope of evidence:** the implementation in `artifacts/cognirise-cms` and
`artifacts/api-server` only. This is a representative-content spike, not proof
that a Sanity project, organisation, plan, roles, or release operations have
been procured and configured.

## Recommendation

Proceed to a controlled Sanity project validation using the existing schema and
API contract. Sanity is the leading option because the implemented Studio
already expresses the proposed content model, constrained page composition,
market editions, governance fields, and a delivery/preview boundary. Do **not**
treat that as a production go-live decision until the gates below pass.

Retain **Storyblok** and **Contentful** as fallback options. Reassess the choice
if the Sanity validation cannot supply the required identity, role, scheduling,
audit, residency/procurement, support, cost, or export assurances at the
selected plan and contract level, or if a representative editorial workflow
cannot be operated without material custom service work.

## Representative content evaluated

The implemented schema covers representative marketing and editorial content,
rather than a generic rich-text CMS:

| Area | What the code models now | What it demonstrates |
| --- | --- | --- |
| Routes and pages | Route-aware pages (`home`, service, platform, industry, case study, about, contact, landing, legal), stable slugs, summaries, SEO and approved section arrays | Editors assemble approved modules rather than arbitrary layouts. |
| Editorial library | Publications (article, report, video, webinar, news, newsletter, podcast, download), people, organisations/partners, navigation and redirects | The primary advisory-site content shapes have a schema home. |
| Evidence | Claims link to proof/reference sources; proof stores value, context, references, verification date and approved markets | Evidence and market approval can be structured instead of embedded only in copy. |
| Media | Governed image/video/audio/document/diagram assets, caption, rights fields, market approval, decorative flag, alt text and transcript field | Accessibility and rights metadata are represented. |
| Page building blocks | Hero, rich text, claim/evidence, metric, quote, reference grid, media, timeline, comparison, CTA, FAQ and download gate | The design-system constraint exists in schema; front-end rendering has not been assessed here. |

The Studio desk separates UAE (canonical), KSA, Türkiye and Europe and exposes
evidence/governance and operations collections. The API accepts those same four
market codes. This is useful representative coverage, but it is **not** a
migration of real content or an editor usability study.

## Plan and procurement assumptions

The source makes no claim about a purchased Sanity tier. It assumes a Sanity
project and dataset will be created, recommends a private dataset unless public
reads are deliberate, and instructs configuration of Studio origins, SSO and
dataset roles in Sanity Manage. The Studio uses public project/dataset
identifiers only; server-only delivery and preview credentials are separate.

Before selection, procurement must validate with Sanity—not infer from this
spike:

- the suitable plan, contract, price and usage limits for Studio users,
  datasets, API/CDN traffic, assets, backups and any scheduling feature;
- organisation-level SSO, least-privilege roles, audit capability, support,
  data residency/processing terms, retention and exit assistance required by
  Cognirise;
- whether Scheduled Publishing meets the desired workflow or a trusted
  scheduler/release service must be funded and operated;
- authenticated export, restore responsibilities and a documented recovery
  objective.

Storyblok and Contentful remain viable procurement fallbacks. They should be
asked to demonstrate the same constrained components, per-market independent
publication and explicit fallback, server-only draft preview, audit/export, and
role/SSO requirements before a substitute is selected.

## Editorial workflow and governance

The policy code defines `author`, `regionalEditor`, `reviewer`, `publisher` and
`admin` roles and state transitions:

`draft → regional/internal review → (compliance review where needed) → approved
→ scheduled/published → expired → archived`.

The Studio publish action blocks governed document types lacking an owner,
approval/approver, or valid timing; it prevents a manual future publish and
blocks expired content. Schema validation also requires an approver/time for
approved, scheduled and published market editions, and requires a local title,
approver and approval time for an override. Policy unit tests cover author vs.
reviewer/publisher separation and publish timing/expiry blockers.

This is editorial assistance in a Studio client, **not authorization**. The
README correctly identifies Sanity dataset roles as the security boundary and
calls for a trusted server release endpoint to reapply policy, create a
revision/audit entry, and use transactions. That endpoint and configured
role/SSO mappings are not present in the reviewed implementation.

## Localization, overrides and fallback

UAE is the canonical market. Every served market edition has independent
publication state, title/body/sections/SEO, approval and timing. Its required
`fallbackMode` is one of:

- `canonical` — UAE content only;
- `override` — approved local content;
- `uaeFallback` — visible, explicitly declared UAE fallback;
- `unavailable` — deliberately not served.

The delivery adapter proves the critical policy: a KSA, Türkiye or Europe
request resolves UAE only where its **own live** edition explicitly declares
`uaeFallback` and the live UAE canonical edition exists. Missing, unavailable,
scheduled, expired or otherwise non-live editions return unavailable; they do
not silently fall back. Published delivery enforces `publicationState`,
`publishAt`, and `expiresAt`; preview can expose a non-live requested edition.
The API tests cover explicit fallback, no fallback for missing/unavailable/
expired editions, scheduling, and rejection of the former top-level market
shape.

Remaining validation: create real market documents, prove one edition per
market under concurrent edits, establish the product/UI treatment for a
visible fallback and unavailable page, test localized slugs/redirects, and
confirm language, legal and SEO policy per market. The schema's `Rule.unique()`
does not by itself guarantee global market uniqueness.

## Preview security

The implemented preview flow is appropriately separated from published reads:

- a workflow bearer key authorizes token issue; tokens are HMAC-SHA256 signed,
  market-and-slug bound, nonce-bearing, and default to 15 minutes (maximum one
  hour);
- only configured server-side preview access uses `SANITY_API_TOKEN`; draft
  requests query Sanity's drafts perspective and are `private, no-store`;
- exchange stores the token in an HttpOnly, SameSite=Strict cookie, restricted
  to `/api/cms/preview`, and the page endpoint rechecks the exact market and
  slug;
- preview keys support an ordered verification key ring and the operations
  guide describes rotation.

This proves route-level controls and secret-handling intent, not a completed
production threat model. Validate production HTTPS/cookie deployment,
workflow-caller identity, rate limiting, CORS/origin policy, logging/retention,
Sanity token scope, Studio origins and SSO before launch.

## Audit, revisions, scheduling, rollback and expiry

`revisionRecord` and `auditEvent` schemas are read-only in Studio; existing
records have no Studio actions. The API records preview token issue/exchange
and accepted publish webhook metadata in PostgreSQL workflow-event records,
and uses durable webhook receipt IDs plus a transaction to make webhook retry
handling idempotent. Audit metadata is designed to exclude secrets and
personal form data.

Neither Studio read-only fields nor the reviewed API alone make Sanity-side
revision records immutable or append-only. The trusted API implements fixed
transition, due-processing, and all-market-admin rollback endpoints. Release
mutations snapshot the prior content into a `revisionRecord`, append an
`auditEvent`, and replace only the approved target market edition in the prior
published edition set. Other markets' pending draft values remain in the draft
document and cannot be promoted by an unrelated market release. The API exposes
no arbitrary GROQ. The external Sanity service identity still requires create-only
governance-record permissions and dataset ACLs; no production scheduler is
configured by this repository.

`publishAt`/`expiresAt` are modeled at both lifecycle and market-edition level;
delivery enforces edition timing and expiry. Future manual publish is blocked.
For actual scheduling, configure Sanity Scheduled Publishing or a trusted
server scheduler. At expiry, the adapter makes an expired requested edition
unavailable; an explicit, still-live `uaeFallback` edition is the only route
to UAE. The schema description mentions product-policy fallback at expiry, so
that policy must be settled and tested rather than assumed.

## Export, backup and portability

The operations guide directs authenticated Sanity dataset export tooling under
organisation controls and PostgreSQL backup for webhook receipts/workflow
events; it says to restore receipts before re-enabling webhooks. This is an
operational instruction, not evidence of scheduled backups, a tested restore,
or retained exports.

Portability is reasonably supported at the model level by structured documents,
references, Portable Text, explicit market editions and JSON revision snapshot
fields. It is still vendor-coupled through Sanity schemas, references, GROQ,
the Studio and CDN/drafts APIs. Require a sample authenticated export, media
export/accounting, a transformation proof to a neutral documented format, and
a restore rehearsal. Apply equivalent exit tests to Storyblok and Contentful.

## Delivery performance, caching, accessibility and SEO

Published reads use Sanity's CDN endpoint with a four-second fetch timeout,
runtime contract validation, a 60-second in-memory cache and deterministic
stale-on-error service up to 24 hours. A signed publish webhook clears the
cache. During CMS outage without usable cache, the API returns the explicit
`cms-migration-v1` envelope with `page: null`; preview never uses cache or a
fallback and returns 503 on CMS failure. This is a resilient API boundary, not
proof of CDN hit rate, frontend rendering performance, cache sharing across
instances, monitoring, or Core Web Vitals.

SEO fields support title/description length warnings, canonical URL, no-index,
Open Graph image and a small structured-data type list, including per-market
SEO overrides. Redirect documents validate path form and supported status
codes. Media validation requires alt text for non-decorative images; substantive
audio/video has a transcript field, but the schema does not enforce it.
Portable Text permits normal, H2, H3 and blockquote rather than H1. These
metadata and authoring guardrails do not prove frontend semantic HTML, one H1,
heading order, JSON-LD rendering, sitemap/robots/canonical output, image
optimization, caption/transcript rendering, keyboard behavior, or WCAG
conformance. Those require consuming-site and content QA.

## Decision matrix

Scores are directional from the implementation evidence only (1 weak, 5
strong); they are not vendor feature scores or procurement findings.

| Criterion | Sanity spike | Storyblok fallback | Contentful fallback | Decision evidence |
| --- | ---: | ---: | ---: | --- |
| Structured, constrained representative content | 5 | Not evaluated | Not evaluated | Implemented Sanity schemas and section allow-list |
| Explicit market edition/fallback delivery | 5 | Not evaluated | Not evaluated | Adapter and tests enforce it |
| Editorial governance model | 4 | Not evaluated | Not evaluated | State/role policy, publish guard, and trusted API enforcement implemented |
| Secure draft preview boundary | 4 | Not evaluated | Not evaluated | Signed, bound short-lived tokens and no-store endpoint |
| Scheduling, rollback and immutable revisions | 3 | Not evaluated | Not evaluated | Trusted endpoints and records exist; tenant ACLs and scheduler remain external gates |
| Audit/export/recovery validation | 2 | Not evaluated | Not evaluated | Procedures/schema exist; no project export or restore proof |
| Procurement, enterprise controls and cost fit | 0 | 0 | 0 | No vendor plan or contract was evaluated |
| Frontend performance, accessibility and SEO outcome | 2 | Not evaluated | Not evaluated | CMS metadata/API only; delivery UI not validated |

## Go/no-go governance gates

**Go to production only when all gates pass:**

1. A real private Sanity project/dataset is provisioned with approved contract,
   plan, SSO/origins, least-privilege roles and server token scopes.
2. Representative UAE, KSA, Türkiye and Europe content is entered and accepted
   by editorial, regional, legal/compliance and accessibility/SEO owners,
   including explicit fallback/unavailable cases.
3. A trusted release/scheduling integration enforces transitions and global
   market/redirect/expiry rules, produces immutable revision/audit records, and
   has an approved rollback runbook.
4. Preview workflow, secret rotation, webhook signing/idempotency, production
   origins, abuse controls and token/cookie behavior are security reviewed.
5. Sanity export, PostgreSQL backup and a restore/webhook-recovery rehearsal
   meet agreed recovery objectives.
6. The consuming site proves semantic/accessibility behavior, localization UI,
   redirects, sitemaps/canonicals/structured data and performance targets with
   representative content.

**Reassess Sanity and formally compare Storyblok and Contentful if** any gate
cannot be met within acceptable cost and operational ownership; the needed
Sanity plan lacks required SSO/audit/scheduling/export/support or
residency/contract terms; the custom trusted-release work is disproportionate;
or a migration/restore and per-market editor acceptance exercise exposes
unacceptable usability, portability, latency or governance risk.
