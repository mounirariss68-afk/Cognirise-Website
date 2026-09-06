# Backup, export, restore, and rollback

## Content metadata export (implemented)

The content export is deliberately **not** a full database or media backup. It contains CMS documents, market editions, revisions, market/taxonomy configuration, redirects, and media asset/version/reference metadata (including their recorded checksums). It excludes CMS users, password/TOTP/recovery secrets, sessions, submissions/raw forms, analytics raw data, audit events, and media binaries.

Run from the repository root with `DATABASE_URL` set. The output directory is required, must not already exist, and is created as `0700`; its two JSON files are written as `0600`. Use a private, encrypted operator-controlled location, not a repository path or public object prefix.

```sh
pnpm --filter @workspace/scripts cms:backup -- --out=/secure/cms-backups/content-YYYY-MM-DD
pnpm --filter @workspace/scripts cms:verify-backup -- --out=/secure/cms-backups/content-YYYY-MM-DD
```

Verification checks schema version, every manifest count, the SHA-256 checksum of `content-metadata.json`, and that neither directory nor files are group/world accessible. It does not prove database restore or media-object recoverability.

### Full database and media procedures (not performed by the metadata export)

Take a separately encrypted PostgreSQL dump, then test it in an isolated database before considering it recoverable:

```sh
umask 077
pg_dump "$DATABASE_URL" --format=custom --file=/secure/cms-backups/cms-YYYY-MM-DD.dump
# isolated target only; never paste production credentials into shell history
pg_restore --clean --if-exists --no-owner --dbname="$RESTORE_DATABASE_URL" /secure/cms-backups/cms-YYYY-MM-DD.dump
```

Copy App Storage media separately using the approved S3-compatible endpoint and credentials, retaining the object/version manifest and validating checksums after the copy:

```sh
aws s3 sync "s3://$CMS_MEDIA_BUCKET/" "s3://$CMS_MEDIA_BACKUP_BUCKET/cms-YYYY-MM-DD/" \
  --endpoint-url "$CMS_S3_ENDPOINT" --only-show-errors
aws s3api list-objects-v2 --bucket "$CMS_MEDIA_BACKUP_BUCKET" \
  --prefix cms-YYYY-MM-DD/ --endpoint-url "$CMS_S3_ENDPOINT" > /secure/cms-backups/media-YYYY-MM-DD-manifest.json
```

The commands above are procedures, not evidence that a database dump or media-binary copy has occurred.

## Restore procedure

1. Declare incident/change owner, target recovery point, and freeze publishing. Preserve relevant audit evidence.
2. Restore the PostgreSQL dump into an isolated environment with the matching application and checked-in migration version. Restore the separately copied media objects and verify their count/checksums against the media manifest.
3. Run `cms:verify-backup` against the metadata export; validate document/revision counts, markets, redirects, media references, permissions, and public routes in isolation.
4. Obtain Administrator and incident-owner approval before any production replacement. Take a new protective snapshot immediately before the approved window.
5. Invalidate affected caches, validate published public responses, and record recovery timing, gaps, and follow-up work. An export completion alone is not a restore success.

## Content rollback rehearsal (implemented)

The rehearsal creates an isolated temporary published UAE fixture with an approved revision and a changed draft, creates a rollback draft from the approved payload, asserts that the current revision is the rollback draft while the public revision remains approved, and deletes the fixture, cascading its editions/revisions. It requires both flags and refuses `NODE_ENV=production`; use only a development `DATABASE_URL`.

```sh
NODE_ENV=development pnpm --filter @workspace/scripts cms:rehearse-rollback -- \
  --development --rehearse-rollback
```

Successful development rehearsal recorded: **2026-09-06T17:40:28.581Z**. The fixture and its suspended viewer attribution account were cleaned up in the transaction; this was not a production exercise and did not test a full database or media restore.