# Cognirise Editorial Studio

Sanity Studio foundation for governed, multi-market Cognirise content. UAE is canonical; KSA, Türkiye, and Europe use explicit, approved overrides or an explicitly marked UAE fallback.

## Setup

1. Create or select a Sanity project and dataset. Use a private dataset unless public read access is an intentional architecture decision.
2. Set `SANITY_STUDIO_PROJECT_ID` and `SANITY_STUDIO_DATASET`. These identifiers are safe in browser bundles; they are not secrets. Replit's `PORT` is passed to the Sanity development/preview servers, and `BASE_PATH` is used as the Studio `basePath` (default `/`).
3. From the workspace root, install dependencies with the repository package manager, then run `pnpm --filter @workspace/cognirise-cms dev`. Build with `pnpm --filter @workspace/cognirise-cms build`; the configured `BASE_PATH` is embedded in the static Studio build.
4. In Sanity Manage, configure Studio origins, SSO and dataset roles. Never add an API token to Studio environment variables or browser code.
5. Create the UAE market first with code `uae` and `isCanonical` enabled; create KSA (`ksa`), Türkiye (`turkiye`) and Europe (`europe`) next. These are the same codes used by the delivery API.
6. Open **Global settings** in the desk and populate organization defaults, default SEO, public social/contact/legal/accessibility configuration, and the ordered market switcher. This singleton stores configuration only; subscriber, form submission, and enquiry data belongs in approved server-side systems, never Sanity.

## Governed AI assistant

The document action is available on governed document types and defaults to a
clearly marked pilot. Configure `SANITY_STUDIO_API_BASE_URL` with the trusted API
origin and, only if the deployed route differs, set
`SANITY_STUDIO_GOVERNED_AI_RUNS_PATH` (default
`/api/cms/editorial-assistant/runs`). Set
`SANITY_STUDIO_GOVERNED_AI_ROLLOUT=off` to leave the action visible but disabled
during a staged rollout.

The assistant uses the existing CMS workflow principal convention:
`Authorization: Bearer <credential>`. An editor enters that credential when
opening the action; Studio keeps it only in component memory, does not persist
it, and never puts it in a request body. Do not place workflow credentials,
Sanity API tokens, or other secrets in `SANITY_STUDIO_*` variables because those
values are compiled into browser code.

Editors choose the market, operation, supported field, constraints, and one or
more approved Sanity source document IDs. The document's AI processing
classification is stored in Sanity and verified by the trusted API rather than
being asserted by the editor request. The service also verifies the document's
exact revision, current field value, content type, and target market. It returns
proposed text, verified citations, explicit uncertainties, quality gates, and a
diff. Studio validates that response, presents
current and proposed text side-by-side, and requires an explicit accept,
accept-without-edits, accept-with-edits, or reject decision. A different
reviewer/publisher/admin principal must record the decision, preserving
separation of duties. Acceptance patches a draft field only;
the assistant has no lifecycle, approval, scheduling, or publication action.
The action requires a saved Sanity draft and uses a revision-preconditioned
`drafts.*` mutation; it never patches the published document.
The patch adds an `assistantReview` quarantine marker. Manual publish and
trusted workflow transitions remain blocked until the API has verified the
accepted revision, recorded the independent human decision in PostgreSQL and
Sanity, and atomically cleared that marker. Interrupted audit writes are
idempotently recoverable by submitting the same decision again.
Create grounding records as **AI approved source** documents. The API reads only
published records whose `approvalStatus` is `approved`, whose classification is
`public` or `internal`, whose approved markets include the target market, and
whose approval, verification, review-due, and optional expiry dates are current.
The API redacts high-confidence personal identifiers and rejects common secret,
credential, session, signed-URL, and connection-string patterns before any
provider call. The same policy fail-closes generated suggestions, citations, and
uncertainties before they can be stored or shown; generated text is never
silently redacted. Citation claim spans must cover the proposed text, with exact
quotes from the approved source revision; translation uses complete
sentence/line alignment with distinct, in-order source units and remains outside
the default low-risk rollout.

The Studio action exposes draft improvement, summary, report abstract,
transcript cleanup, chapters, newsletter subject/preheader variants, market
adaptation, translation, SEO metadata, tags, alt text, internal-link
suggestions, and quality review. It passes the selected feature, document
content classification, content type, target field, BCP 47 language, and maximum
length as dedicated fields in the closed API contract. Configure
`SANITY_STUDIO_GOVERNED_AI_FEATURES` as `all` or a comma-separated allow-list of
feature IDs to stage a feature. Transcript cleanup writes `transcript`, chapters
write `chapterNotes`, newsletter suggestions write `newsletterVariants`, tags
write `topics`, links write `internalLinkSuggestions`, and translations or
adaptations write only an explicitly selected market-edition field. The default pilot enables summary, report
abstract, transcript cleanup, newsletter variants, SEO metadata, tags, alt
text, and quality review; disabled options are shown as unavailable and cannot
issue a request.

## Governance and delivery

- Page layouts are constrained to approved section objects. Pages store route kind and stable slug.
- Every market edition declares `canonical`, `uaeFallback`, `override`, or `unavailable` and has an independent publication state. UAE uses `canonical`; every served market must have an edition record. Pages, navigation, profiles, organizations, and publications each use a purpose-built localized edition object rather than sharing page composition fields.
- Studio validations and publish-action guards provide editor feedback only. The trusted API authenticates the operator, authorizes the role and market, validates transitions and approvals, transacts releases, and appends revision/audit records for pages, navigation editions, and redirects. It is the enforcement boundary.
- `revisionRecord` and `auditEvent` are read-only in Studio, and existing records expose no actions. True immutability and append-only enforcement require server-side credentials with create-only access, dataset ACLs, and a webhook or trusted release service. Do not issue these writes from the browser.
- Future publication dates are deliberately blocked from manual publish. The trusted API due processor handles scheduled publication and expiry for pages, navigation editions, and redirects; configure an external scheduler to call it. Delivery enforces state, `publishAt`, and `expiresAt`.
- Schema validation is editorial assistance, not authorization. A server-side release endpoint should call the same policy rules, write a revision snapshot and audit event, and use transactions.
- Provision the release service as a separate Sanity machine identity. Its token may read/write governed content and create `revisionRecord`/`auditEvent` documents, but project/dataset ACLs must deny update and delete on those immutable record types and deny project administration. Studio `readOnly` fields do not enforce this machine-token boundary.
- Market uniqueness (one edition per market), one canonical UAE market, redirect collisions, and cross-document expiry checks should also be enforced in CI or a trusted publish service because schema validation cannot guarantee global uniqueness under concurrent edits.
- The Global settings desk entry uses the fixed document ID `globalSettings` and is removed from Studio's create menu. The trusted API must reject any other `globalSettings` ID because desk structure is not authorization.

## Sanity roles and operator setup

These roles are a deployment plan, not a claim that roles, SSO, or operators have already been provisioned. Create custom roles in Sanity Manage (availability depends on the Sanity plan), then enforce the same matrix in the trusted API:

| Cognirise role | Sanity dataset access | Trusted API permissions | Explicitly denied |
| --- | --- | --- | --- |
| Author | Read published content; create/update ordinary drafts | Submit owned drafts to regional or internal review | Approval, scheduling, publishing, audit/revision writes |
| Regional editor | Author access plus update assigned-market override drafts | Submit assigned editions from regional to internal review | Other-market changes, final approval, publishing |
| Reviewer | Read all governed content; update review/approval metadata | Request changes; move internal/compliance review to approved | Scheduling, publishing, role administration |
| Publisher | Read all; update release metadata | Schedule/publish only approved editions; expire/archive releases | Self-approval, rewriting audit/revision records, role administration |
| Admin | Dataset and project administration; emergency content access | Audited recovery/override operations | Routine bypass of review; audit/revision mutation |

Recommended provisioning sequence:

1. In Sanity Manage, require organization SSO and connect the approved identity provider; verify domains and MFA/session policy.
2. Create IdP groups for the five Cognirise roles. Create matching Sanity custom roles with least-privilege dataset permissions and market filters where the plan supports them.
3. Assign operators through IdP groups, not ad-hoc shared accounts. Test one non-production operator per role against a staging dataset before production assignment.
4. Create a separate machine identity for the trusted API. Store its token only in server secrets, scope it to required datasets/actions, rotate it, and never expose it through `SANITY_STUDIO_*`.
5. Configure the trusted API to derive identity/role from verified SSO claims, apply the transition matrix, prevent reviewer/publisher self-approval, enforce market assignment, and write revision plus audit records transactionally.
6. Review operator and machine access on a fixed cadence; immediately remove leavers, retain Sanity/API audit logs, and test emergency admin recovery.

Run policy tests with `pnpm --filter @workspace/cognirise-cms test` and type-check with `pnpm --filter @workspace/cognirise-cms typecheck`.


## Repeatable migration

The workspace migration command builds deterministic, fixed-ID fixtures for all
four markets and the governed page, section, navigation, person/advisor,
organization/partner, publication-format, media, evidence, redirect, and global
settings shapes:

```sh
## Generated client types

With the two public Sanity environment variables set and the Sanity CLI authenticated for that project, run:

```sh
pnpm --filter @workspace/cognirise-cms typegen
```

This runs `sanity schema extract --enforce-required-fields` and then Sanity TypeGen using `sanity-typegen.json`. It writes `src/sanity.types.ts` from `schema.json` and also generates result types for GROQ queries tagged with Sanity's `defineQuery` under `src`. Both generated files are ignored so CI or each consuming client can regenerate them against the checked-out schema; do not hand-edit generated types.

# Create only missing documents after editorial approval (never overwrites)
SANITY_PROJECT_ID=... SANITY_DATASET=... SANITY_API_TOKEN=... \
  pnpm --filter @workspace/scripts cms:migrate -- --apply


# Optionally retain newline-delimited JSON for review/import
pnpm --filter @workspace/scripts cms:migrate -- --output=/approved/path/cognirise.ndjson


# Validate locally without network writes
pnpm --filter @workspace/scripts cms:migrate


# Revision-checked update of reviewed records; requires every current revision
SANITY_PROJECT_ID=... SANITY_DATASET=... SANITY_API_TOKEN=... \
  pnpm --filter @workspace/scripts cms:migrate -- --apply --force \
  --revision-map=/approved/path/revisions.json
```

The default command uses `createIfNotExists` with stable IDs, so reruns never
overwrite editorial changes or duplicate records. A deliberate `--force`
requires a complete revision map and uses Sanity's `ifRevisionID` optimistic
locking; stale reviews fail atomically rather than overwriting newer edits.
Migrated lifecycle and market editions
are deliberately **draft**, and the migrated redirect is inactive. Operators
must review and release one market/route through the trusted workflow; merely
running the migration cannot cut public pages, navigation, or redirects over.
The consuming site retains its reviewed code-owned routes, menus, markets,
forms, redirects, and sitemap whenever a governed record is absent, non-live,
invalid, or unavailable.

The browser application can only perform a client-side redirect; it cannot
emit an HTTP 301/302/307/308 after the document has loaded. `statusCode` is
therefore retained as governed deployment-edge metadata. Configure the hosting
edge to consume that metadata for status-bearing redirects; until then the
website safely navigates in-browser and makes no claim that it preserved an
HTTP redirect status.
