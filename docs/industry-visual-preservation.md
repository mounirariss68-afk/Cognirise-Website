# Industry visual preservation map

This map records the approved industry material before the common nine-section
composition is applied.  It is a rendering map only: it does not publish a CMS
revision, change an approval, or alter a media pin.

## Stable common section order

1. `hero`
2. `opportunity`
3. `pressures`
4. `capabilities`
5. `applications`
6. `perspective`
7. `market`
8. `sources`
9. `cta`

The named sections above are present even where a sector has no optional
submodule.  Optional modules render *inside* their assigned section; they do
not add another top-level page section.

## All industries

| Existing field or treatment | Common destination | Preservation requirement |
| --- | --- | --- |
| `thesis`, `dek`, `image`, `imageAlt`, hero media and responsive crop | `hero` | Keep proposition, approved image, alt text and any pinned hero reference. |
| `opportunity` | `opportunity` | Keep the strategic statement visible rather than behind an interaction. |
| `pressures` | `pressures` | Keep every title and short explanation visible. |
| `capabilities` | `capabilities` | Use selected disclosure detail without clipping long copy. |
| `uses` | `applications` | Keep application, evidence status and human-control boundary visible. |
| `reversal`, `myth` | `perspective` | Keep the reversal and verdict together and visible. |
| `gcc` and market projection | `market` | Continue using the selected governed market; no local toggle. |
| `sources` and consolidated Industries destination | `sources` | Keep labels, publishers, evidence kinds, links and `/industries#selected-work`; no detail-page case rail. |
| `service`, first move and Value Scan action | `cta` | Retain a direct primary action and the relevant service destination. |

## Financial Services specialist modules

| Banking POV module | Common destination | Preserved content and behavior |
| --- | --- | --- |
| `hero`, `descriptor`, hero media, starting-point and selected-work anchors | `hero` | Keep approved/pinned hero media, descriptor, labels and query-preserving consolidated-work link. |
| `valueOutcomes` | `opportunity` | Keep outcome bodies and all measure chips. |
| base `pressures`, `adoptionLevels` | `pressures` | Keep every base pressure plus value, illustrative work, owner, readiness, measures and decision boundary for each level. |
| `valueDomains`, `startingPoints` and their image references/focal points | `capabilities` | Keep purpose, examples, measures and every starting-point field. Cards use the shared disclosure engine and retain tap, keyboard and focus access. |
| base `uses`, `voiceBanking` platform/contribution/qualification/journeys | `applications` | Keep use evidence and boundaries, platform qualification, each journey scope, measures and acting boundary. |
| `productionReadiness`, its media/annotation/focal point, `deliveryPath` | `perspective` | Keep every practice, stage owner/outcome and all approved artwork metadata. Stages use the shared disclosure engine. |
| base `gcc` | `market` | Keep regional qualification visible. |
| base `sources`, `evidenceSignals`, `partners`, `caseMembershipSnapshot` | `sources` | Keep claim qualification, period, jurisdiction, access date, partner qualification and the consolidated case destination. A membership snapshot is not rendered as a case rail. |
| `cta` | `cta` | Keep approved CTA copy and href. |

## Education specialist modules

| Education POV module | Common destination | Preserved content and behavior |
| --- | --- | --- |
| base hero plus `introduction`, `strategicShift` | `hero` / `opportunity` | Keep campus hero, introduction and strategic shift; retain market projection. |
| `imagery.educatorPractice`, `imagery.researchCoordination` and each pinned `media` reference | `capabilities` | Keep source, alt text, pinned media identity and responsive image treatment when these optional approved scenes are present. |
| `convictions` | `pressures` | Keep all conviction title/body pairs as a nested, visible module. |
| base `capabilities`, `targetState`, `valueDomains` including examples | `capabilities` | Keep all three capability layers. Value domains use the shared disclosure engine so long details remain available on keyboard and touch. |
| base `uses`, `applications`, `signals` and source URLs | `applications` | Keep application and signal source associations and all market qualifiers. |
| `roadmap`, `patternQuote`, `globalDirection`, base `reversal` and `myth` | `perspective` | Keep ordered roadmap labels, summaries and full detail through shared disclosure; retain myth/reversal and global evidence text. |
| base `gcc`, `leadershipTest` | `market` | Keep contextual qualification and leadership test visible. |
| base `sources` | `sources` | Keep identity, publisher, evidence kind and all linked evidence. |
| base `service`, `selectedWork` | `cta` | Keep relevant service and direct Value Scan action. |

## Compatibility notes

- The content fields remain additive and continue to be projected through the
  existing market governance layer.
- Financial Services supporting images remain resolved from their immutable CMS
  media references.  No fallback artwork is introduced for missing protected
  media.
- The public Banking renderer and its protected preview both call the same
  `BankingEditorial` component.  Education and the other industries share
  `IndustryEditorialView`.