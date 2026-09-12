# CMS preview coverage

The website preview route (`/preview/:token`) renders the saved CMS revision
returned by the protected capability. It is not a public-content lookup and it
does not fall back to the published collection when a draft field or asset is
unavailable.

## Supported document kinds

| Kind | Website presentation | Shared with public route | Draft media policy |
| --- | --- | --- | --- |
| `person` | `AboutPeople` with an injected draft person record | The original `/about` team profile composition (background, contribution, initials, and group placement) | The draft is rendered in the actual About page context while related people requests are disabled. Structured focus areas, profile links, and the exact identity media are shown only in a clearly marked editorial supplement; they are not inserted into the public composition. |
| `partner` | `PartnerProfilePresentation`, the same card composition used by the public `/partners` route | `/partners` partner profile cards | An exact logo reference is used when present; no public logo is substituted. Draft evidence is shown for editorial review. |
| `platform` | `PlatformPresentation` | `/platforms/:slug` | Hero media is resolved only from capability media. Sections, capabilities, differentiators, and CTA use the saved draft. |
| `publication` | `PublicationPresentation`, the same CMS article composition used by `/insights/:slug` | CMS publication detail route | The public article composition intentionally keeps its approved metadata/hero treatment; POV PDF links and any metadata media use capability media only. Article/POV rich blocks are rendered from the saved body. |
| `case-study` | `CaseStudyLayout` for full records; `CaseStudyPreviewPresentation` for summaries | `/work/:slug` for full records | Full and summary drafts keep disclosure, controls, impact qualification, and evidence in the preview. No restricted or summary draft is turned into a public route. |
| `industry` | `IndustryEditorialView` or `BankingEditorial` | Industry public presentations | The requested market is checked against the saved snapshot. Education supporting imagery and all hero media use pinned preview media. The Financial Services thesis is not changed by preview rendering. |
| `framework` | `AgentAuthorityLayout` | Agent Authority methodology page | The buyer layout is reused. Missing draft hero media fails closed rather than using the compiled methodology image. |
| `office` | `OfficeContactCard` | Contact office card | Structured city, address, and optional phone use the saved office revision. |
| `landing-page` | `GovernedLandingRoute` with the public compiled page component selected by `pagePath` | `/about`, `/partners`, `/platforms`, `/insights`, or `/methodologies` | The issued landing snapshot is injected into the same governed route context. Related public collection requests are disabled; only the compiled route's approved fallback data is used where the snapshot does not carry a linked collection. Media slots resolve only exact preview versions. |
| `site-configuration` | `SiteConfigurationPresentation` | No public route | Contact configuration and hero-film poster/source references are editorial-only and are never linked into public page media. |

## Safety rules

- The API persists the issued revision ID and returns media URLs scoped to the
  same capability. The website does not make a second public CMS request while
  rendering a preview.
- `missingMediaIds` is a hard stop for every presentation family. A missing
  draft asset produces an explicit review warning instead of silently showing a
  published or compiled asset.
- Preview metadata is applied independently with `noindex,nofollow` and an
  explicit null canonical.
- Preview status messages sent to the embedding editor contain only opaque
  availability (`ready`, `unavailable`, `expired`, or `revoked`).

## Focused checks

The static and type-level checks for this surface are:

```text
pnpm --dir artifacts/cognirise-website run typecheck
pnpm --dir artifacts/cognirise-website exec tsx --test src/pages/cms-preview.test.ts src/pages/about-people.test.ts
```

Browser automation is intentionally not part of this coverage check. Visual
review should use the same protected capability and selected revision as the
editor session.