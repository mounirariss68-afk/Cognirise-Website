# Task 295 media import

## Using batch uploads in the Media Library

1. Sign in with an editor, publisher, or administrator account and open **Media Library**.
2. Choose **Collection for new files**. LinkedIn also has an asset-kind selection. These settings apply only to newly added files; changing the library tab does not change existing queue items.
3. Drop individual files onto the visible drop zone, or focus **Browse files** and press Enter to choose several files. Folders, empty files, unsupported types, and oversized files are rejected individually while valid files remain in the queue. Website and LinkedIn retain JPEG, PNG, WebP, AVIF and PDF support up to 50 MiB per file; motion retains MP4/WebM support up to 250 MiB.
4. Select **Review metadata** for each file. Set its alt text, caption/intended usage and known credit; LinkedIn files also have campaign fields and motion files have group, variant, poster, reduced-motion and accessibility fields. Confirm each file's metadata review. Unknown rights or credit must not be invented.
5. Select **Upload** for one file or **Upload reviewed files**. Transfers run one at a time, with actual byte-transfer progress and separate preparation/finalization states. Metadata becomes read-only once its request starts, so later selection changes cannot affect a retry.
6. An individual failure leaves successful files complete. **Retry** renews an expired transfer URL, or retries finalization alone if the file was already transferred. Do not add the same file again to retry it.
7. Reloading the same browser tab restores that user's queue metadata, not the local file contents. A file not yet transferred must be reselected, and its SHA-256 must match the original. A transferred file can finish finalization without reselection. Persistence errors are visible; initial uploads do not start without a saved retry identity. Unstarted items can be removed.
8. Completed assets remain **Awaiting review**. A publisher or administrator must inspect the preview, accessibility, usage rights and credit through the existing review flow before approving. Approval alone does not insert an image into a page or publish a page; this task does neither.

Queue recovery is scoped to the signed-in user and browser tab. Closing the tab is not a server-side job queue, and the UI does not promise cross-device file recovery.

## Verification

- The 17 original-image receipts below include durable SHA-256 readback and authenticated preview verification. An idempotent rerun reused all 17 and created none.
- Focused checks passed: 26 admin media/queue/intake tests, 18 API media tests (including signing and aborted preview delivery), and 5 import tests. The admin production build and affected TypeScript checks passed.
- Browser checks covered multi-file browse/drop, mixed invalid files, directory rejection, metadata/collection isolation, keyboard focus, real PUT/finalize, one-file failure and retry without retransferring completed items, finalization failure followed by fileless reload recovery, exact-byte draft reselection, viewer denial and unauthenticated denial. See `docs/task-295-browser-checks.json`.
- The managed browser service could not recreate its context during continuation. Only the blocked storage/refresh/permission steps were continued in installed Chromium through CDP; the passed intake flow was not repeated. Temporary users, sessions, media and stored test objects were removed.
- Browser verification exposed a signing incompatibility with external-account credentials and a GCS stream crash on preview cancellation. The repaired signing path passed a real storage PUT/readback. Preview delivery now defers upstream cancellation only until the SDK pipeline is safely attached, without draining the whole file; the real reload/finalization recovery and targeted abort regression were verified.

## Reconciling the 17 supplied originals

The focused manifest in `scripts/src/cms/task-295-media-manifest.ts` accounts for exactly 17 visually inspected originals. It records source bytes, SHA-256, detected type, dimensions, useful names, and image-specific alt text. Credit is not known and rights remain unresolved.

Run only this reconciliation in a non-production main environment:

```sh
pnpm --filter @workspace/scripts cms:import-task-295-media -- --apply-db --target=development
```

The command is explicitly blocked when `NODE_ENV=production` or `REPLIT_DEPLOYMENT=1`. It does not invoke broad CMS reconciliation, publish media, or create page references. It checks content identity across media assets and every immutable version, reuses only fully read-back exact bytes in the governed private `cms-media/objects/{identity}/sha256/{digest}` namespace, and refuses staging, arbitrary mutable, ambiguous, or metadata-only matches. Missing originals pass through the API server's governed media type, signature, inspection, immutable promotion, and derived-rendition helpers. Asset, original version, audit event, and receipt creation are one transaction; every new website asset remains `pending-review`.

A rerun validates the immutable object, asset, exact original-version result digest, and receipt without changing asset metadata, later editorial changes, or version history. Output includes one final asset/version receipt per source. `/api/media/{assetId}/file` is the authenticated preview path. The command starts an ephemeral Express app with the real media router, creates an MFA-satisfied temporary editor session with the existing `createSession` helper, verifies every response body by size and SHA-256, then deletes the temporary session and user without printing credentials.

Environment status must be reported separately:

- **Task environment:** report only the receipts emitted by an actual successful run here.
- **Main environment:** run the command after merge and retain its emitted receipts.
- **Production:** unverified and intentionally blocked; use an approved non-deployment reconciliation process rather than removing the guard.

## Task-environment execution receipt

Executed in the isolated task/development environment on 2026-09-10. The first run created 17 pending-review assets and original version 1 records. Full object downloads matched all 17 source SHA-256 digests and byte sizes after promotion and again after the database transaction. A second execution returned 17 `reused` dispositions and created no assets or versions.

The machine-readable final rerun receipt is committed at `docs/task-295-task-environment-receipts.json`. It contains no signed URLs or credentials.

| Source | Asset | Version |
| --- | --- | --- |
| cognirise-industry-banking | `40ae9b5d-5f4a-4c38-b5af-7f1c3694e065` | `076e620a-d0aa-4f24-b4c1-9641820d51ab` |
| cognirise-industry-defense | `8aa67d62-22fb-48b3-ab86-c15d4f55077d` | `98a17992-5d3b-47e6-a7da-df3bbc934545` |
| cognirise-industry-education | `cbe07187-41c8-4528-a3bd-952a48af2e7d` | `5f51c932-334f-4019-8b6f-e88d90d6fa15` |
| cognirise-industry-energy-resources | `3978516e-e670-4b27-bce7-827ab91f46bb` | `2f986e3f-7aa2-4f74-96a9-111d59a17cbd` |
| cognirise-industry-travel-hospitality | `adddf08b-1459-4130-bffe-4bd93cf4269f` | `4158ba2b-f3b9-4188-8fdf-98e639d16f3a` |
| cognirise-pulse-agentic-workflows-directed-action | `70dccd77-003d-4447-b5d4-503bcc4b8926` | `3a7b1812-3574-48dd-a56c-c58ed532de77` |
| cognirise-pulse-governed-ai-control-in-motion | `8202bf34-83fa-4970-94f4-d26e9798c043` | `4850312e-a192-4837-8aa7-59e17209a451` |
| cognirise-pulse-human-ai-collaboration-shared-judgment | `53945ac6-4a85-465f-9926-d9d91a894ff3` | `e5ec240a-91b9-4fea-a51e-914f7244f2ef` |
| cognirise-pulse-knowledge-intelligence-living-index | `ca426bb2-4518-4453-9003-6bbed653f974` | `5ff8da55-29a5-4715-8949-94cbafe3e7a9` |
| cognirise-pulse-orchestration-many-forces-one-rhythm | `5bf18cb2-7e83-457c-b094-6cf71e5fffea` | `ac122015-f74a-474c-8d12-01489250ba45` |
| cognirise-pulse-transformation-new-operating-form | `f1588b3f-588e-49d6-a68c-bebb3fa8bf33` | `57a0c80d-f564-4729-b4fc-d966028d7e09` |
| Healthcare | `fadd9a6c-18f7-4ace-9846-55e573338417` | `c30e8095-b290-4473-b9eb-feae381ec1d9` |
| Logistics | `f5de5319-a97e-4796-9f45-10b71ac60ce3` | `0f22989d-3ee9-4435-95ce-99a7e5433d4d` |
| Manufactoring (named “manufacturing” in CMS) | `067f9072-5540-4e39-b82c-4517ccef8a11` | `20546083-f94a-4863-be6d-a7604d31259d` |
| Public Sector | `6d0e14e8-e331-42d5-9ac2-d343c38b4a65` | `becef21b-b805-439c-80fe-0bde56beed8c` |
| Retail | `e93443fe-a270-48b4-8405-1f273e51f1e7` | `1b7ed7fe-56d3-4f38-87a0-4a50c5f8f663` |
| Telecoms | `a94fe3e9-0cad-434b-a714-e411cf523f67` | `d03e1926-e71a-4f07-a126-75b8023431a6` |

At initial import all rows were website collection, `pending-review`, unreferenced, unpublished, with unresolved rights and null credit. Rerun receipts report live asset status, filename, alt text, collection, and credit rather than overwriting or hardcoding those editorial fields. Authenticated previews were verified through an ephemeral Express app using the real media router and a temporary MFA-satisfied editor session; each response matched the original size and SHA-256. The temporary session and editor fixture were removed. These task-environment IDs do not assert main-environment or production state.