# Cognirise Editorial Studio

Sanity Studio foundation for governed, multi-market Cognirise content. UAE is canonical; KSA, Türkiye, and Europe use explicit, approved overrides or an explicitly marked UAE fallback.

## Setup

1. Create or select a Sanity project and dataset. Use a private dataset unless public read access is an intentional architecture decision.
2. Set `SANITY_STUDIO_PROJECT_ID` and `SANITY_STUDIO_DATASET`. These identifiers are safe in browser bundles; they are not secrets. Replit's `PORT` is passed to the Sanity development/preview servers, and `BASE_PATH` is used as the Studio `basePath` (default `/`).
3. From the workspace root, install dependencies with the repository package manager, then run `pnpm --filter @workspace/cognirise-cms dev`. Build with `pnpm --filter @workspace/cognirise-cms build`; the configured `BASE_PATH` is embedded in the static Studio build.
4. In Sanity Manage, configure Studio origins, SSO and dataset roles. Never add an API token to Studio environment variables or browser code.
5. Create the UAE market first with code `uae` and `isCanonical` enabled; create KSA (`ksa`), Türkiye (`turkiye`) and Europe (`europe`) next. These are the same codes used by the delivery API.
6. Open **Global settings** in the desk and populate organization defaults, default SEO, public social/contact/legal/accessibility configuration, and the ordered market switcher. This singleton stores configuration only; subscriber, form submission, and enquiry data belongs in approved server-side systems, never Sanity.

## Governance and delivery

- Page layouts are constrained to approved section objects. Pages store route kind and stable slug.
- Every market edition declares `canonical`, `uaeFallback`, `override`, or `unavailable` and has an independent publication state. UAE uses `canonical`; every served market must have an edition record. Pages, navigation, profiles, organizations, and publications each use a purpose-built localized edition object rather than sharing page composition fields.
- Studio validations and publish-action guards provide editor feedback only. The trusted API must authenticate the operator, authorize the role and market, validate transitions and approvals, transact the release, and append revision/audit records. It is the enforcement boundary.
- `revisionRecord` and `auditEvent` are read-only in Studio, and existing records expose no actions. True immutability and append-only enforcement require server-side credentials with create-only access, dataset ACLs, and a webhook or trusted release service. Do not issue these writes from the browser.
- Future publication dates are deliberately blocked from manual publish. Configure Sanity Scheduled Publishing or a trusted server scheduler. The delivery query must enforce edition state, `publishAt`, and `expiresAt`.
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

## Generated client types

With the two public Sanity environment variables set and the Sanity CLI authenticated for that project, run:

```sh
pnpm --filter @workspace/cognirise-cms typegen
```

This runs `sanity schema extract --enforce-required-fields` and then Sanity TypeGen using `sanity-typegen.json`. It writes `src/sanity.types.ts` from `schema.json` and also generates result types for GROQ queries tagged with Sanity's `defineQuery` under `src`. Both generated files are ignored so CI or each consuming client can regenerate them against the checked-out schema; do not hand-edit generated types.