# Team visibility verification

## Scope and method

This is a read-only inspection of the development CMS database. Queries selected
person identifiers, market decisions, edition state, and duplicate keys only; no
credentials, session data, password data, or bearer values were selected. The
public API behavior was checked with isolated in-memory fixtures in
`artifacts/api-server/tests/market-availability.test.ts`; no API selection
change was needed.

## Development CMS findings

The development/shared environment has no `VITE_CMS_CUTOVER_PEOPLE` value or
secret configured (checked by key only). In the previous implementation that
made people non-authoritative. An empty API result, loading, or failure selected
the compiled roster, including people whose published availability was `off`.
This explains the development mismatch without a duplicate or API selection
defect. Production data and the deployed build were not inspected.

- There are **8 active, non-archived person documents**:
  `alexis-lecanuet`, `bulent-egrilmez`, `fadi-mattar`, `gokhan-guney`,
  `hisham-nofal-phd`, `mounir-ariss`, `omer-barbaros-yis`, and `rami-aslan`.
- The enabled markets are `uae` (canonical), `europe`, `ksa`, and `turkiye`.
  Each non-UAE market falls back to `uae/en`.
- Each person has one `uae/en` CMS edition, and it is a draft. No person has a
  non-UAE edition.
- There are **17 persisted availability rows**, **11 published `off`**
  decisions, and **0 staged decisions**. Missing rows resolve as `inherit`.
- No duplicate canonical slug or case/whitespace-normalized active person title
  was returned.

`published_decision` by enabled market (a missing row is `inherit`):

| Person slug | UAE | Europe | KSA | Türkiye |
| --- | --- | --- | --- | --- |
| `alexis-lecanuet` | show | inherit | inherit | inherit |
| `bulent-egrilmez` | show | inherit | inherit | inherit |
| `fadi-mattar` | show | off | inherit | inherit |
| `gokhan-guney` | off | off | off | off |
| `hisham-nofal-phd` | show | inherit | inherit | inherit |
| `mounir-ariss` | show | inherit | inherit | inherit |
| `omer-barbaros-yis` | off | off | off | off |
| `rami-aslan` | show | off | inherit | off |

## Published API output evidence

The development database has **0 published person editions** and **0 published
person documents** across enabled markets. Therefore the current development
public collection contract has no person payload to deliver: each valid enabled
market request should return HTTP 200 with `items: []`, rather than exposing a
draft edition. A person with a published UAE edition may still resolve for a
requested market through the configured UAE fallback when that requested market
does not have an explicit published `off` decision.

The regression fixtures additionally verify:

1. A mixed fixture returns only the visible person; the hidden person is absent
   from the collection and returns 404 from the public detail route.
2. An all-hidden fixture returns HTTP 200 with `items: []` and `total: 0`.
3. A requested KSA fixture resolves its published UAE edition with
   `market: "uae"`, `requestedMarket: "ksa"`, and `usedFallback: true` when
   KSA is `inherit`.
4. An editor-staged `off` decision leaves the person in public output until an
   administrator publishes it; after publication it is absent.

## Reproduction commands

The database inspection used the database tool with
`target: "replit_database"` and `environment: "development"` and only
`SELECT` statements against `cms_documents`, `cms_market_editions`,
`market_editions`, and `cms_person_market_availability`. No write query was
issued.

Focused API regression coverage uses the API server's existing esbuild test
pattern:

```sh
cd artifacts/api-server
rm -rf .focused-test-dist
pnpm exec esbuild tests/market-availability.test.ts \
  --outfile=.focused-test-dist/market-availability.test.cjs \
  --bundle --platform=node --format=cjs \
  --external:@google-cloud/storage --external:pino --external:pino-http \
  --external:pino-pretty --external:sharp --external:thread-stream
node --test .focused-test-dist/market-availability.test.cjs
rm -rf .focused-test-dist
```

Result: **4 tests passed, 0 failed**.