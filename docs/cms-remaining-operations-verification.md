# CMS remaining operations verification

## Boundary and outcome

This is a sanitized, read-only staging verification. It did not send email,
request or print a secret, mutate the database, delete an object, use
`--apply`, touch browser fixtures, or perform a production operation.

The Replit environment existence callback was used for these configuration
keys. The callback returned existence only; values were not requested or
recorded.

| Configuration | Existence | Operational requirement |
| --- | --- | --- |
| `DEFAULT_OBJECT_STORAGE_BUCKET_ID` | present | App Storage bucket for the staging janitor |
| `PRIVATE_OBJECT_DIR` | present | Private prefix whose `cms-media/staging/` namespace is scanned |
| `ACCESS_DELIVERY_ENCRYPTION_KEY` | absent | Preferred encryption secret for queued access payloads |
| `ACCESS_EMAIL_WEBHOOK_SECRET` | absent | Provider authorization secret; also accepted as the encryption fallback |
| `ACCESS_EMAIL_WEBHOOK_URL` | absent | Provider endpoint required before any delivery attempt |
| `ADMIN_PUBLIC_URL` | absent | Admin origin required to construct password-setup links |

Therefore administrator access delivery is **not ready** in this environment.
No delivery attempt was made. Before an approved delivery operation, an owner
must configure one of the two accepted encryption secrets, the provider
endpoint, and the admin public URL. Values must remain in environment
configuration and must not be placed in an operation receipt, report, log, or
chat.

After configuration, invitation and reset delivery still require an explicitly
approved safe test recipient before either message may be sent. No recipient
approval was requested while these configuration prerequisites were absent.
This is a blocked live-delivery check, not a successful provider test.

The checked-in delivery implementation also requires the `cms_access_delivery_jobs`
schema from migrations `0027_cms_access_delivery_jobs.sql` and
`0028_cms_access_delivery_leases.sql` (including `processing_lease`) before the
worker can operate. This verification did not apply migrations or exercise the
worker. The media janitor command did successfully authenticate to the
configured App Storage sidecar and database for its read-only scan.

## Exact janitor evidence

The first run below was made before the adapter contract correction. Its empty
result was **not** treated as proof of an empty namespace: the production
adapter had exposed a prefix that already ended in `cms-media/staging`, while
the janitor runner correctly treated its adapter prefix as the normalized
private directory and appended that namespace. The first run therefore queried
the doubled path and was vacuous.

Initial pre-fix command result (retained as a diagnostic, not as cleanup
evidence):

```text
pnpm --filter @workspace/scripts cms:media-staging-janitor -- --older-than-hours=24
```

```json
{
  "mode": "dry-run",
  "cutoff": "2026-09-12T05:13:02.991Z",
  "scannedObjects": 0,
  "scannedDatabaseRows": 0,
  "items": []
}
```

The production-shaped adapter now returns the normalized private directory as
`stagingPrefix`. Both storage listing and database matching compose the same
full namespace as the upload writer:
`<normalized PRIVATE_OBJECT_DIR>/cms-media/staging/<upload-id>`. This preserves
bucket-qualified directory text in `PRIVATE_OBJECT_DIR`; the selected bucket
remains `DEFAULT_OBJECT_STORAGE_BUCKET_ID`.

The corrected command was rerun with no `--apply` flag:

```text
pnpm --filter @workspace/scripts cms:media-staging-janitor -- --older-than-hours=24
```

Corrected sanitized command result:

```json
{
  "mode": "dry-run",
  "cutoff": "2026-09-12T05:17:05.057Z",
  "scannedObjects": 0,
  "scannedDatabaseRows": 0,
  "items": []
}
```

The corrected storage listing found zero objects in the full staging
namespace. The janitor read zero matching database rows, so it evaluated no
candidate, retention, failure, or reclaim decision. With `apply` false, its
status update, audit marker, and generation-guarded delete paths were not
entered.

An independent read-only database query, using the same normalized
`PRIVATE_OBJECT_DIR` plus `cms-media/staging/%` but not the janitor report,
returned:

```json
{
  "staging_assets": 0,
  "assets_with_versions": 0,
  "assets_with_references": 0,
  "assets_with_published_payload_references": 0,
  "assets_with_committed_status": 0
}
```

This independently confirms zero committed/versioned, referenced, published
payload, or committed-status asset rows in the staging-key namespace. It does
not claim that any candidates were individually classified: zero rows and
zero objects make the no-candidate conclusion vacuous.

The operator command remains dry-run by default. An apply run is a separate,
explicitly authorized operation and was not run here.

## Janitor inspection

The janitor implementation and existing focused tests were reviewed for the
following safety boundaries:

- only exact UUID objects below the configured
  `cms-media/staging/` prefix are eligible;
- an old storage timestamp and generation proof are required;
- pending rows must be old, while failed rows must carry the janitor marker;
- media versions, references, and published revision payload references retain
  the object;
- apply locks the asset row and commits the terminal marker before storage
  deletion; and
- deletion uses the observed generation as its precondition.

One genuine precision defect was corrected during this inspection. The
production adapter converted a provider `int64` generation string through
JavaScript `Number`, which could reject or lose precision for generations above
`Number.MAX_SAFE_INTEGER`. It now validates a decimal generation proof and
passes the original string to the storage SDK. A focused test covers a
large-precision generation and invalid proofs. This change was not exercised
against a live delete: no object existed and no delete operation was run.

The more fundamental namespace defect was also corrected. A
production-shaped regression uses a bucket-qualified private directory with
leading/trailing slashes, checks that the adapter lists the exact namespace
written by the upload path, then runs the janitor dry run and asserts that no
delete or database update occurs.

Code verification completed without application startup:

```text
pnpm --filter @workspace/scripts exec tsx --test src/cms/media-staging-janitor.test.ts
7 passed, 0 failed

pnpm --filter @workspace/scripts typecheck
passed
```

## Remaining approved operations

1. Keep access delivery disabled until the prerequisites above are configured
   and separately verified by an authorized owner.
2. Preserve this janitor result as read-only evidence; do not infer that an
   empty staging namespace proves a production cleanup.
3. If a future cleanup is approved, rerun the default dry run, review every
   candidate against its asset/version/reference and publication state, and
   only then invoke the explicitly authorized `--apply` command.
4. Keep all future evidence sanitized. Do not include bucket names, private
   prefixes, access links, webhook URLs, bearer credentials, tokens, email
   addresses, or raw payloads.