# Methodologies hero reconciliation

Run against an explicitly selected non-production development database and its
paired private object-storage bucket:

```sh
pnpm --filter @workspace/scripts cms:reconcile-methodologies-hero -- --apply-db --target=development
pnpm --filter @workspace/scripts cms:reconcile-methodologies-hero -- --verify-db --target=development
```

The apply command imports Task 294 once and preserves later editorial
publications. The read-only verify command checks the original receipts and
immutable revision, then checks the current live `/methodologies` pointer,
publish contract, exact hero media pin, approval metadata, and durable object
bytes. A legitimate later approved publication is valid and is never reset.

`scripts/post-merge.sh` runs apply and then verify after schema push. Any
missing live pointer, invalid published revision, missing media pin, inactive
or unapproved media, or unavailable/corrupt object fails the hook.

Pre-merge execution proves only the `DATABASE_URL` and object-storage bucket
selected in that shell. It does not prove a merged-main or other shared target.
The post-merge apply-plus-verify commands are the authoritative check for the
shared development target configured where that hook runs.