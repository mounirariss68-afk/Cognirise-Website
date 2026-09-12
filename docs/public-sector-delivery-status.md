# Public Sector regional delivery status

## Release state

The UAE, KSA, Türkiye and `europe` editions are staged as separate, governed
English-language drafts. `europe` is labelled **European Union** inside this
page only; global market names and routes are unchanged.

**None of the new editions has been published.** All four retain explicit
review blockers. The existing approved UAE publication remains live; the
other three markets do not receive UAE fallback content. Existing availability
decisions and immutable civic hero references have not been changed.

The development reconciliation was applied and replayed successfully.
Read-only verification confirmed all four publication pointers unchanged.
This is development verification, not a claim that a merge or production
publication has already occurred.

## Editorial and legal review still required

- Shared: identify the planning-service digitisation example and the
  conversational document-issuance example; substantiate the NYC and federal
  audit figures; narrow or substantiate universal containment and
  suspensive-appeal assertions.
- UAE: reconcile Zero Government Bureaucracy, UAE PASS and TAMM figures and
  verify the precise government-data exclusions and current legal position.
- KSA: reconcile Nafath/Absher denominators and the BALSAM benchmark figures.
- Türkiye: confirm the decree/action-plan text and current e-Devlet,
  MERNİS/KPS and social-assistance metrics.
- EU: confirm the wallet deadline, benchmark/language figures and the
  distinct AI Act application provisions; never describe EU law as applying
  to all Europe.

The source ledger records bounded checks and limitations. Original support
and limitation notes remain in the draft alongside the additional findings.
The application examples are attributed to their actual institutions and
jurisdictions, not described as local or Cognirise client deployments.

`publicSectorPov.reviewBlockers` prevents publication while nonempty. Editors
must resolve the corresponding claim, not merely delete a warning. Use the
normal authenticated CMS review and publisher controls for each edition and
any required destination availability.

## Verification and merge handoff

The checked-in post-merge setup invokes the conflict-safe draft reconciler.
It preserves newer editorial changes, approved media pins and historical
revisions. Corrections to an exact prior automated draft append a successor
revision and receipt rather than rewriting either.

```sh
pnpm --filter @workspace/scripts cms:setup-public-sector-postmerge
pnpm --filter @workspace/scripts cms:verify-public-sector-editions -- \
  --target=development --base-url=http://127.0.0.1:80 --write
```

Inspect both generated reports under `scripts/cms/output/`; a successful
command exit with `preserved-conflict` is not a successfully staged edition.
The verification command distinguishes pending drafts from published
exact-market content. Run it after merge and again after an authorised
publication; do not infer public delivery from staging alone.

Targeted checks passed for the shared contract, authoring, renderer,
API market isolation, sitemap/navigation policy and reconciliation.
The development website, admin and API type checks passed. Authenticated
browser checks covered all four protected editions on desktop and mobile:
nine sections, working civic hero delivery and no horizontal overflow.
KSA, Türkiye and EU final-successor previews also confirmed keyboard Enter
expansion, both action links, all five success measures, and absence of
internal attachment-mapping prose. The EU hero explicitly says European
Union. UAE's earlier preview exercised the same renderer; the final copy-only
successor was confirmed by reconciliation tests and matching stored digests.
Public UAE was checked separately and still serves the approved prior copy.