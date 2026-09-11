# Team visibility browser verification

Task310 was verified through the local proxy at `http://127.0.0.1:80/about`.
The test was read-only; no CMS or database records were changed.

## Real API checks

`GET /api/public/content?kind=person&market={market}&locale=en&pageSize=100`
returned HTTP 200 with `items: []`, `total: 0`, and `isConfigured: false` for
`uae`, `europe`, `ksa`, and `turkiye`. The About page showed the published
empty states for both Leadership Team and Board of Advisors. No
`Omer Barbaros Yis` name was rendered.

Initial navigation and reload were checked. Market switching was also checked
with an isolated delayed browser fixture: a UAE leader disappeared immediately
when switching to Europe (while loading), and remained absent when Europe's
delayed empty response resolved.

## Isolated browser fixtures

Using Playwright route interception:

- delayed valid mixed leader/advisor response: no names before resolution;
  after resolution one profile appeared in each group and each was numbered
  `01 / 01`;
- malformed contract/envelope: unavailable state and no names;
- HTTP 500: no profile names appeared immediately (the final alert was not
  sampled before the fixture was replaced);
- empty configured response: both published empty states rendered.

The first two fixture attempts were intentionally corrected after observing
the CMS contract requirements: `verificationDate` and `reviewDate` must be
`YYYY-MM-DD` strings.

## Legacy behavior/source check

`cms-delivery.test.ts` was inspected. For `person`, cutover is authoritative
for `undefined`, `false`, and `true`, and compiled fallback data is discarded
for loading, API error, contract error, intentional empty, and fallback
delivery states. No people legacy flag reference was found in the website
source; the existing source test explicitly asserts there is no compiled
roster.

## Notes

The real development API currently has no published person records, so
real-data grouping/numbering could only be verified with the isolated,
schema-valid browser fixture. The desktop header CTA is slightly clipped at
the 1280px viewport edge, but this did not affect the About/team behavior.