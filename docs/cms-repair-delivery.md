# CMS repair delivery

## Environment boundary

This work was implemented and tested in the isolated development workspace.
It has not been verified after merge or on a published deployment. Development
data and temporary browser fixtures are not evidence of production publication.
The post-merge hook stages the narrowly scoped historical people recovery; it
does not publish it or approve missing governance facts.

## Diagnosis and repairs

| Report | Diagnosis | Repair / remaining decision |
| --- | --- | --- |
| Review submission fails | Structured media references were not consistently pinned because snapshot payloads do not carry the document kind and pinning iterated only legacy media IDs. Submission also read revision state outside the edition lock. | Collect references with the authoritative document kind, preserve exact media versions, and validate the latest revision under the same transaction lock. Missing fields or unapproved media remain actionable validation failures. See `cms-publishing-diagnosis.md`. |
| Administrator cannot publish | UI and server required a separate in-review state. | Administrators can confirm Publish on eligible saved drafts. Optional review remains available. Shared destination version and source revision are pinned to the confirmation; stale confirmations fail without discarding newer destination edits. |
| Navigation cannot be released directly | Navigation also required review and lacked an exact saved-version contract. | Explicit administrator Publish confirmation, mandatory save/publish versions, serialized writes, and transactional release audit. |
| Lost people copy | Mounir's contribution was omitted; his biography is a newer editorial version. Other historical profiles either retain the exact contribution or have newer non-empty copy. | Recover the exact historical contribution as a governed draft. Preserve newer biographies, all other contributions, and explicitly excluded profiles. Publication still needs genuine verification/review dates and approved identity treatment. See `cms-people-recovery.md`. |
| Preview displays JSON | Most families fell through to a generic field renderer. Structured media authorization could omit their references. | Use website presentation components and correct route context; people render in About, landing previews inject the exact saved page, and draft-only supplemental fields use structured rendering. Related public CMS queries cannot substitute draft content. |
| Inbox rows do nothing | Listing/export were exposed but update controls were missing. | Detail dialog for status, active owner and notes; error-preserving save/reopen; CSV download; workflow events and audited changes. |
| Other disconnected controls | Market settings, audit filters and mutation permissions had incomplete UI wiring. | Wire market edit/delete with existing canonical protections, audit filtering/details/pagination, and truthful read-only media controls. |

The original owner's historical HTTP responses were not available. Synthetic
route/database reproductions and authenticated browser observations are labeled
separately; no claim is made that every reported failure had the same cause.

## Administrator instructions

1. Sign in and complete MFA.
2. Open the intended document and choose Shared content or the exact regional
   edition. Resolve an ambiguous legacy source explicitly when prompted.
3. Make changes and **Save Draft**. If saving fails, retain local edits and use
   the displayed field/conflict/recovery guidance rather than blindly retrying.
4. **Preview** the saved revision and intended destination. Local unsaved edits
   are never silently included in a preview or publication.
5. Select **Publish Saved Draft** and review the exact revision and destinations
   in the confirmation. Confirm once. A concurrent content or destination edit
   invalidates that confirmation.
6. If blocked, correct the named fields or select the approved immutable media
   version, save, preview again, and reopen Publish. Approval is not inferred
   from an upload or historical use.
7. **Submit for review** is optional for administrator-led release and remains
   useful for collaboration. Review/rejection of a successor does not replace
   the currently published revision.

Availability-only releases and navigation have their own exact-version
confirmation. Market configuration changes retain their existing immediate
administrative semantics; do not confuse those with content publication.

## Verification references

- `cms-journey-matrix.md`: control inventory and scope boundaries.
- `cms-browser-verification.md`: authenticated local browser evidence and gaps.
- `cms-preview-coverage.md`: content-family presentation/media coverage.
- API suite: 153 passed, including a real PostgreSQL authenticated publication
  route test for structured preview pins, direct publish, stale availability,
  editor denial and reviewed/draft divergence.
- Admin suite: 81 passed after exact-preview pin and review-comment refresh repairs.
- Scripts suite: 113 passed at the aggregate run; subsequent focused recovery
  tests passed after receipt verification was hardened.
- Website aggregate: 165 passed and one obsolete Contact source assertion
  failed. That assertion now checks the shared office card where optional phone
  rendering actually lives; both Contact tests pass in the focused rerun.
- Workspace typecheck passed. Later touched package/codegen checks also passed.
- Focused architecture/security review approved the repaired release,
  navigation and recovery boundaries.
- Database migration/schema tests: 5 passed.

## Browser-discovered repairs and remaining release gates

The authenticated browser pass proved real MFA sign-in, save/reopen, direct
publication/public delivery, archive/restore, editor restrictions, optional
review/rejection, and Inbox status/owner/notes persistence and CSV download.

It also exposed an indefinite people-preview loading state and an older
Mounir preview revision. Both were repaired:

- The exact draft person now supplies the About page's delivery state as well
  as its content, independently of suppressed public collection requests. A
  rendered About-under-preview-boundary test confirms the name and contribution
  appear and the loading message does not.
- Recovery advances only the shared draft source pointer under the edition
  lock, invalidates stale review selection, and leaves public pointers intact.
  Initial editor preview pinning waits for the exact document response rather
  than trusting an older cached edition matrix.
- Review comment/rejection success refreshes the exact revision's comments and
  reports success; failures retain typed reviewer guidance and show errors.

The attempted narrow post-fix browser check was blocked by the automation
browser closing before navigation. Earlier failed-preview screenshots are not
post-fix evidence. Rendered component, database and focused regression checks
pass, but a new authenticated rendered preview screenshot is not available.
Storage-backed upload/finalize/approval and successor-live-publication retention
were not exercised in the browser; the latter has API/database coverage.

Mounir remains an unpublished recovered draft. His verification date, next
review date and approved identity treatment require a real owner's decision,
not invented approval metadata. Merge/deployment and any resulting public
profile release remain separate verification gates.

The owner explicitly chose to finish this repair with Mounir staged as a draft.
They will review the governance fields, preview the exact saved revision, and
publish it through the authenticated CMS. This is the intended final state of
the recovery, not incomplete automated publication.

No additional proposed task duplicates the existing scheduling, backup,
validation, identity-asset, verification-date or reconciliation projects.