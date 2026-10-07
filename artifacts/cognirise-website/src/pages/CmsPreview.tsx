import { useEffect, useRef, useState } from "react";
import { useRoute } from "wouter";
import { PulsePlatformPresentation, platformPreviewPresentation } from "@/components/cms/pulse-platform";
import {
  type CaseStudyContent,
  type CmsDocumentKind,
  type FrameworkContent,
  type IndustryContent,
  type LandingPageContent,
  type OfficeContent,
  type PartnerContent,
  type PersonContent,
  type PlatformContent,
  type PublicationContent,
  type SiteConfigurationContent,
  validateCmsSnapshot,
} from "@workspace/api-zod";
import NotFound from "@/pages/not-found";
import { applyMetadata } from "@/lib/metadata";
import {
  isIndustryPreviewFocusMessage,
  resolvePreviewIndustryMedia,
  resolvePinnedCmsMedia,
  CmsPreviewRequestBoundary,
  type CmsRecord,
} from "@/lib/cms";
import { frameworkPreviewWarnings } from "@/lib/framework-preview";
import { CmsPreviewFramework, normalizeCmsPreviewFramework } from "@/pages/CmsPreviewFramework";
import { OfficeContactCard } from "@/components/OfficeContactCard";
import { BankingEditorial } from "@/components/industries/BankingEditorial";
import { Shell, type PreviewMarketContext, type PreviewNavigationSnapshot } from "@/components/layout/Shell";
import { GovernedLandingRoute } from "@/components/GovernedLandingRoute";
import AboutPeople from "@/pages/AboutPeople";
import CoreValues from "@/pages/CoreValues";
import Home from "@/pages/Home";
import InsightsEditorial from "@/pages/InsightsEditorial";
import MethodologiesPortfolio from "@/pages/MethodologiesPortfolio";
import Partners from "@/pages/Partners";
import PlatformsOverview from "@/pages/PlatformsOverview";
import { IndustryEditorialView } from "@/components/industries/IndustryEditorial";
import {
  CaseStudyPreviewPresentation,
  PartnerProfilePresentation,
  PlatformPresentation,
  PublicationPresentation,
  SiteConfigurationPresentation,
} from "@/components/cms/PublicCmsPresentations";
import { CaseStudyLayout } from "@/components/work/case-study-ui";
export type Preview = {
  kind: CmsDocumentKind;
  document: Record<string, unknown>;
  market: string;
  locale: string;
  requestedMarket: string;
  requestedLocale: string;
  revisionId: string;
  revisionNumber: number;
  usedFallback: boolean;
  media: CmsRecord<FrameworkContent>["media"];
  missingMediaIds: string[];
  validationWarnings: string[];
  navigation: PreviewNavigationSnapshot;
};

type PreviewError = {
  kind: "expired" | "revoked" | "forbidden" | "authentication" | "invalid-response" | "unavailable";
  message: string;
};

const previewMarkets = ["uae", "ksa", "turkiye", "europe"] as const;
type IndustryPreviewStatus = "ready" | "unavailable" | "expired" | "revoked";

const landingCompiledRoutes = {
  "/": Home,
  "/about": AboutPeople,
  "/about/core-values": CoreValues,
  "/partners": Partners,
  "/platforms": PlatformsOverview,
  "/insights": InsightsEditorial,
  "/methodologies": MethodologiesPortfolio,
} as const;

function PreviewShell({ preview, children }: { preview: Preview; children: React.ReactNode }) {
  const marketContext: PreviewMarketContext = {
    market: preview.market,
    locale: preview.locale,
  };
  return (
    <Shell navigationOverride={preview.navigation} marketContext={marketContext}>
      {children}
    </Shell>
  );
}

function isPreview(value: unknown): value is Preview {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const preview = value as Record<string, unknown>;
  return (
    typeof preview.kind === "string"
    && ["person", "partner", "platform", "publication", "case-study", "industry", "framework", "office", "landing-page", "site-configuration"].includes(preview.kind)
    && Boolean(preview.document) && typeof preview.document === "object" && !Array.isArray(preview.document)
    && typeof preview.market === "string"
    && typeof preview.locale === "string"
    && typeof preview.requestedMarket === "string"
    && typeof preview.requestedLocale === "string"
    && typeof preview.revisionId === "string"
    && typeof preview.revisionNumber === "number"
    && typeof preview.usedFallback === "boolean"
    && Array.isArray(preview.media)
    && Array.isArray(preview.missingMediaIds) && preview.missingMediaIds.every((id) => typeof id === "string")
    && Array.isArray(preview.validationWarnings) && preview.validationWarnings.every((warning) => typeof warning === "string")
    && Boolean(preview.navigation) && typeof preview.navigation === "object" && !Array.isArray(preview.navigation)
  );
}

function fetchError(response: Response, body: unknown): PreviewError {
  const detail = body && typeof body === "object" && typeof (body as Record<string, unknown>).error === "string"
    ? (body as Record<string, string>).error
    : "The protected preview could not be loaded.";
  const reason = body && typeof body === "object" ? (body as Record<string, unknown>).reason : undefined;
  if (response.status === 410 && reason === "revoked") return { kind: "revoked", message: detail };
  if (response.status === 410) return { kind: "expired", message: detail };
  if (response.status === 403) return { kind: "forbidden", message: detail };
  if (response.status === 401) return { kind: "authentication", message: detail };
  return { kind: "unavailable", message: detail };
}

function industryPreviewStatus(
  preview: Preview | undefined,
  error: PreviewError | undefined,
  loading: boolean,
): IndustryPreviewStatus | null {
  // A newly mounted preview has not yet made a protected request. Reporting it
  // as unavailable would cause the parent to discard the still-live iframe.
  if (loading) return null;
  if (error?.kind === "revoked") return "revoked";
  if (error?.kind === "expired") return "expired";
  if (error || !preview) return "unavailable";
  if (preview.kind !== "industry") return "ready";

  const validation = validateCmsSnapshot(preview.kind, preview.document, "draft");
  if (!validation.success) return "unavailable";
  const content = validation.data.content as IndustryContent;
  if (
    !previewMarkets.some((market) => market === preview.requestedMarket)
    || (content.bankingPov && content.bankingPov.market !== preview.requestedMarket)
  ) return "unavailable";
  const media = resolvePreviewIndustryMedia(content, preview.media);
  return preview.missingMediaIds.length || media.missingReferences.length ? "unavailable" : "ready";
}

function PreviewBanner({ preview }: { preview: Preview }) {
  return (
    <header className="sticky top-0 z-[60] border-b border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 sm:px-6 sm:py-4">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
        <strong>Protected saved-version preview</strong>
        <span className="font-mono text-[10px] uppercase sm:text-xs">{preview.requestedMarket} / {preview.requestedLocale} · revision {preview.revisionNumber}{preview.usedFallback ? " · fallback" : ""}</span>
      </div>
    </header>
  );
}

function PreviewWarningPanel({ warnings, missingMedia }: { warnings: string[]; missingMedia: string[] }) {
  if (!warnings.length && !missingMedia.length) return null;
  return (
    <aside className="border-b border-amber-300 bg-amber-50 px-6 py-5 text-amber-950" role="alert">
      <div className="mx-auto max-w-[1100px]">
        <h2 className="font-semibold">Review warnings</h2>
        <ul className="mt-3 list-disc pl-5 text-sm">
          {warnings.map((warning) => <li key={warning}>{warning}</li>)}
          {missingMedia.map((reference) => <li key={reference}>Media unavailable: {reference}</li>)}
        </ul>
      </div>
    </aside>
  );
}

function unresolvedPinnedMedia(value: unknown, media: NonNullable<Preview["media"]>): string[] {
  const missing = new Set<string>();
  const inspect = (candidate: unknown) => {
    if (Array.isArray(candidate)) {
      candidate.forEach(inspect);
      return;
    }
    if (!candidate || typeof candidate !== "object") return;
    const record = candidate as Record<string, unknown>;
    if (typeof record.mediaId === "string" && typeof record.mediaVersionId === "string"
      && !resolvePinnedCmsMedia(media, record as Parameters<typeof resolvePinnedCmsMedia>[1])) {
      missing.add(`${record.mediaId}@${record.mediaVersionId}`);
    }
    Object.values(record).forEach(inspect);
  };
  inspect(value);
  return [...missing];
}

function ProtectedPreviewError({ error }: { error: PreviewError }) {
  const title = error.kind === "revoked"
    ? "This preview session has been revoked."
    : error.kind === "expired"
      ? "This preview session has expired."
      : error.kind === "forbidden"
        ? "You do not have access to this preview."
        : error.kind === "authentication"
          ? "Sign in with MFA to view this preview."
          : "This protected preview is unavailable.";
  return (
    <main className="min-h-screen bg-background px-6 py-24">
      <section className="mx-auto max-w-[720px] border border-amber-300 bg-amber-50 p-8 text-amber-950" role="alert">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-3 leading-7">{error.message}</p>
      </section>
    </main>
  );
}

function IndustryPreview({ preview, content }: { preview: Preview; content: IndustryContent }) {
  const previewMarket = previewMarkets.find((market) => market === preview.requestedMarket);
  if (!previewMarket) {
    return <ProtectedPreviewError error={{ kind: "invalid-response", message: "The saved preview does not identify a supported market." }} />;
  }
  if (content.bankingPov && content.bankingPov.market !== preview.requestedMarket) {
    return <ProtectedPreviewError error={{ kind: "invalid-response", message: "The saved banking revision does not match this preview market." }} />;
  }

  const media = resolvePreviewIndustryMedia(content, preview.media);
  const missingMedia = [...new Set([...preview.missingMediaIds, ...media.missingReferences])];
  if (missingMedia.length) {
    return (
      <>
        <PreviewWarningPanel warnings={preview.validationWarnings} missingMedia={missingMedia} />
        <ProtectedPreviewError error={{
          kind: "invalid-response",
          message: "This saved industry revision references draft media that is unavailable. It has not been completed with public media.",
        }} />
      </>
    );
  }

  return (
    <>
      <PreviewWarningPanel warnings={preview.validationWarnings} missingMedia={missingMedia} />
      {media.content.bankingPov
        ? <BankingEditorial view={{ ...media.content, slug: "financial-services", media: preview.media } as Parameters<typeof BankingEditorial>[0]["view"]} />
        : <IndustryEditorialView
            view={{ ...media.content, slug: preview.document.slug } as Parameters<typeof IndustryEditorialView>[0]["view"]}
            marketOverride={previewMarket}
          />}
    </>
  );
}

function DraftPreviewContent({ preview, warnings }: { preview: Preview; warnings: string[] }) {
  const validation = validateCmsSnapshot(preview.kind, preview.document, "draft");
  if (!validation.success) {
    return (
      <>
        <PreviewWarningPanel warnings={warnings} missingMedia={preview.missingMediaIds} />
        <ProtectedPreviewError error={{
          kind: "invalid-response",
          message: `This ${preview.kind} revision has validation errors and cannot be rendered by its public presentation.`,
        }} />
      </>
    );
  }

  const content = validation.data.content as Record<string, unknown>;
  const media = preview.media ?? [];
  const unresolvedMedia = unresolvedPinnedMedia(content, media);
  const missingAssetIds = new Set(preview.missingMediaIds);
  const missingMedia = [...new Set([
    ...preview.missingMediaIds,
    ...unresolvedMedia.filter((reference) => !missingAssetIds.has(reference.split("@")[0])),
  ])];

  if (missingMedia.length) {
    // A protected preview is an exact revision, not a best-effort public
    // rendition. Never let one missing draft asset silently become a published
    // or compiled image.
    return (
      <>
        <PreviewWarningPanel warnings={warnings} missingMedia={missingMedia} />
        <ProtectedPreviewError error={{
          kind: "invalid-response",
          message: "This saved revision has media that is not attached to its exact revision. The published page has not been changed. Reattach the missing assets and save a new draft before previewing it.",
        }} />
      </>
    );
  }

  if (preview.kind === "landing-page") {
    const landing = {
      ...(content as unknown as LandingPageContent),
      sections: Array.isArray(content.sections) ? content.sections : [],
      visualReferences: Array.isArray(content.visualReferences) ? content.visualReferences : [],
      seo: content.seo && typeof content.seo === "object" ? content.seo : {},
      legal: content.legal && typeof content.legal === "object" ? content.legal : {},
    } as LandingPageContent;
    const pagePath = landing.pagePath;
    const compiled = typeof pagePath === "string"
      ? landingCompiledRoutes[pagePath as keyof typeof landingCompiledRoutes]
      : undefined;
    if (!compiled || typeof pagePath !== "string") {
      return (
        <>
          <PreviewWarningPanel warnings={warnings} missingMedia={missingMedia} />
          <ProtectedPreviewError error={{ kind: "invalid-response", message: "This landing revision does not identify a supported public route." }} />
        </>
      );
    }
    const page = {
      ...landing,
      id: typeof preview.document.id === "string" ? preview.document.id : preview.revisionId,
      slug: typeof preview.document.slug === "string" ? preview.document.slug : pagePath.slice(1),
      title: typeof preview.document.title === "string" ? preview.document.title : pagePath,
      summary: typeof preview.document.summary === "string" ? preview.document.summary : null,
      media,
      seo: landing.seo,
      // A protected revision is not a published edition. Keeping this empty
      // also lets the governed landing media resolver honor draft migration
      // paths without treating them as published unresolved assets.
      publishedAt: "",
      updatedAt: typeof preview.document.updatedAt === "string" ? preview.document.updatedAt : new Date(0).toISOString(),
    } as unknown as CmsRecord<LandingPageContent>;
    return (
      <>
        <PreviewWarningPanel warnings={warnings} missingMedia={missingMedia} />
        <GovernedLandingRoute
          pagePath={pagePath as "/" | "/about" | "/about/core-values" | "/partners" | "/platforms" | "/insights" | "/methodologies"}
          compiled={compiled}
          pageOverride={page}
        />
      </>
    );
  }

  if (preview.kind === "person") {
    const person = {
      ...(content as unknown as PersonContent),
      focusAreas: Array.isArray(content.focusAreas) ? content.focusAreas : [],
      profileLinks: Array.isArray(content.profileLinks) ? content.profileLinks : [],
    } as PersonContent;
    const identityMedia = resolvePinnedCmsMedia(media, person.identityMedia);
    const personRecord = {
      ...person,
      id: typeof preview.document.id === "string" ? preview.document.id : preview.revisionId,
      slug: typeof preview.document.slug === "string" ? preview.document.slug : preview.revisionId,
      title: typeof preview.document.title === "string" ? preview.document.title : "Unnamed person",
      summary: typeof preview.document.summary === "string" ? preview.document.summary : null,
      content: person,
      media,
      publishedAt: "",
      updatedAt: "",
    } as unknown as CmsRecord<PersonContent> & { content: PersonContent };
    return (
      <>
        <PreviewWarningPanel warnings={warnings} missingMedia={missingMedia} />
        <section className="mx-auto max-w-[1440px] px-6 py-8 md:px-12" data-testid="saved-person-preview">
          <h1 className="text-3xl font-semibold">{personRecord.title}</h1>
          {personRecord.summary && <p className="mt-4 leading-7">{personRecord.summary}</p>}
          {!["founder", "leader", "advisor"].includes(person.role) && (
            <>
              <p className="mt-4 text-sm text-muted-foreground">This saved draft has no leadership or advisor placement yet. Its saved fields are shown below; it has not been published.</p>
              {person.title && <p className="mt-4 font-semibold">{person.title}</p>}
              {person.biography && <p className="mt-4 whitespace-pre-wrap leading-7">{person.biography}</p>}
              {person.contribution && <p className="mt-4 whitespace-pre-wrap leading-7">{person.contribution}</p>}
            </>
          )}
        </section>
        {["founder", "leader", "advisor"].includes(person.role) && (
          <CmsPreviewRequestBoundary>
            <AboutPeople previewPerson={personRecord} />
          </CmsPreviewRequestBoundary>
        )}
        <aside className="border-y border-amber-300 bg-amber-50 px-6 py-8 text-amber-950" data-testid="draft-person-editorial-fields">
          <div className="mx-auto max-w-[1440px]">
            <h2 className="text-sm font-semibold">Draft-only editorial fields</h2>
            <p className="mt-2 text-sm">Structured focus areas and profile links are shown here for editorial review; they are not added to the public About composition.</p>
            {identityMedia && (
              <img className="mt-6 h-24 w-24 object-cover" src={identityMedia.url} alt={identityMedia.altText || `${personRecord.title} portrait`} />
            )}
            {person.focusAreas.length > 0 && (
              <ul className="mt-6 grid gap-4 md:grid-cols-2">
                {person.focusAreas.map((focus) => (
                  <li key={focus.title} className="border-l-2 border-amber-700 pl-4">
                    <strong className="block">{focus.title}</strong>
                    <span className="mt-1 block text-sm leading-6">{focus.detail}</span>
                  </li>
                ))}
              </ul>
            )}
            {person.profileLinks.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-4 text-sm font-semibold">
                {person.profileLinks.map((link) => <li key={link.url}><a href={link.url}>{link.label}</a></li>)}
              </ul>
            )}
          </div>
        </aside>
      </>
    );
  }

  if (preview.kind === "partner") {
    const partner = {
      ...(content as unknown as PartnerContent),
      facts: Array.isArray(content.facts) ? content.facts : [],
      evidence: Array.isArray(content.evidence) ? content.evidence : [],
      coverage: Array.isArray(content.coverage) ? content.coverage : [],
    } as PartnerContent;
    return (
      <>
        <PreviewWarningPanel warnings={warnings} missingMedia={missingMedia} />
        <main className="mx-auto max-w-[1440px] px-6 py-16 md:px-12">
          <p className="mb-10 text-xs font-bold uppercase tracking-[.2em] text-[hsl(var(--brand-pink))]">Partners / alliance profile</p>
          <PartnerProfilePresentation
            name={typeof preview.document.title === "string" ? preview.document.title : "Unnamed partner"}
            content={partner}
            logoMedia={resolvePinnedCmsMedia(media, partner.logoMedia)}
            groupLabel={partner.allianceCategory}
            source={partner.sources?.map((source) => source.label).join("; ")}
            evidenceText={partner.evidence?.map((evidence) => evidence.statement).join(" ")}
            platformHref={["Lupitor", "Datatoolpack", "bunjee.ai"].includes(typeof preview.document.title === "string" ? preview.document.title : "")
              ? `/platforms/${preview.document.title === "Lupitor" ? "lupitor" : preview.document.title === "Datatoolpack" ? "datatoolpack" : "bunjee-ai"}`
              : undefined}
            preview
          />
        </main>
      </>
    );
  }

  if (preview.kind === "platform") {
    const platform = {
      ...(content as unknown as PlatformContent),
      sections: Array.isArray(content.sections) ? content.sections : [],
      capabilities: Array.isArray(content.capabilities) ? content.capabilities : [],
      differentiators: Array.isArray(content.differentiators) ? content.differentiators : [],
    } as PlatformContent;
    const slug = typeof preview.document.slug === "string" ? preview.document.slug : "";
    const presentation = platformPreviewPresentation(slug, platform);
    return (
      <>
        <PreviewWarningPanel warnings={warnings} missingMedia={missingMedia} />
        {presentation === "invalid-pulse"
          ? <ProtectedPreviewError error={{ kind: "invalid-response", message: "This Pulse platform preview is unavailable: its template, canonical slug, and complete page content must agree. The saved draft has not been replaced with generic platform content." }} />
          : presentation !== "standard"
          ? <PulsePlatformPresentation slug={slug} content={platform} preview />
          : <PlatformPresentation
          title={typeof preview.document.title === "string" ? preview.document.title : "Untitled platform"}
          content={platform}
           // Kept for public/card parity metadata; preview presentation uses
           // content.summary, the field exposed as platform detail hero copy.
          summary={typeof preview.document.summary === "string" ? preview.document.summary : null}
          heroMedia={resolvePinnedCmsMedia(media, platform.heroMedia)}
          preview
        />
        }
      </>
    );
  }

  if (preview.kind === "publication") {
    const publication = {
      ...(content as unknown as PublicationContent),
      body: Array.isArray(content.body) ? content.body : [],
      topics: Array.isArray(content.topics) ? content.topics : [],
      sectors: Array.isArray(content.sectors) ? content.sectors : [],
      social: content.social && typeof content.social === "object" ? content.social : {},
    } as PublicationContent;
    return (
      <>
        <PreviewWarningPanel warnings={warnings} missingMedia={missingMedia} />
        <PublicationPresentation
          title={typeof preview.document.title === "string" ? preview.document.title : "Untitled publication"}
          summary={typeof preview.document.summary === "string" ? preview.document.summary : null}
          content={publication}
          heroMedia={resolvePinnedCmsMedia(media, publication.heroMedia)}
          pdfMedia={resolvePinnedCmsMedia(media, publication.pdfMedia)}
          socialMedia={resolvePinnedCmsMedia(media, publication.social.imageMedia)}
          preview
        />
      </>
    );
  }

  if (preview.kind === "case-study") {
    const caseStudy = {
      ...(content as unknown as CaseStudyContent),
      controls: Array.isArray(content.controls) ? content.controls : [],
      constraints: Array.isArray(content.constraints) ? content.constraints : [],
      outcomes: Array.isArray(content.outcomes) ? content.outcomes : [],
      work: Array.isArray(content.work) ? content.work : [],
      evidence: Array.isArray(content.evidence) ? content.evidence : [],
      relatedIndustries: Array.isArray(content.relatedIndustries) ? content.relatedIndustries : [],
      media,
      title: typeof preview.document.title === "string" ? preview.document.title : "Untitled case study",
      slug: typeof preview.document.slug === "string" ? preview.document.slug : preview.revisionId,
      summary: typeof preview.document.summary === "string" ? preview.document.summary : null,
    } as unknown as Parameters<typeof CaseStudyLayout>[0]["item"];
    return (
      <>
        <PreviewWarningPanel warnings={warnings} missingMedia={missingMedia} />
        {caseStudy.variant === "full"
          ? <CaseStudyLayout item={caseStudy} />
          : <CaseStudyPreviewPresentation item={caseStudy as unknown as CaseStudyContent & { title: string; slug: string; summary?: string | null }} preview />}
      </>
    );
  }

  if (preview.kind === "site-configuration") {
    return (
      <>
        <PreviewWarningPanel warnings={warnings} missingMedia={missingMedia} />
        <SiteConfigurationPresentation content={content as unknown as SiteConfigurationContent} media={media} preview />
      </>
    );
  }

  return <ProtectedPreviewError error={{ kind: "invalid-response", message: "This saved revision has no public presentation." }} />;
}

export function CmsPreviewContent({
  preview,
  error,
}: {
  preview?: Preview;
  error?: PreviewError;
}) {
  if (error) return <ProtectedPreviewError error={error} />;
  if (!preview) return null;

  const validation = validateCmsSnapshot(preview.kind, preview.document, "draft");
  const warnings = [...new Set([
    ...preview.validationWarnings,
    ...(validation.success ? [] : validation.errors),
    ...(preview.kind === "framework" ? frameworkPreviewWarnings(preview.document.content) : []),
  ])];

  if (preview.kind === "industry") {
    if (!validation.success) {
      return (
        <PreviewShell preview={preview}>
          <PreviewBanner preview={preview} />
          <PreviewWarningPanel warnings={warnings} missingMedia={preview.missingMediaIds} />
          <ProtectedPreviewError error={{
            kind: "invalid-response",
            message: "This saved industry revision has validation errors and cannot be completed from public content.",
          }} />
        </PreviewShell>
      );
    }
    return (
      <PreviewShell preview={preview}>
        <PreviewBanner preview={preview} />
        <IndustryPreview preview={preview} content={validation.data.content as IndustryContent} />
      </PreviewShell>
    );
  }

  if (preview.kind === "framework") {
    const normalized = normalizeCmsPreviewFramework(preview);
    if (normalized.framework) {
      return <CmsPreviewFramework preview={preview} framework={normalized.framework} warnings={[
        ...new Set([...warnings, ...normalized.warnings]),
      ]} />;
    }
  }

  if (preview.kind === "office" && validation.success) {
    const office = validation.data.content as OfficeContent;
    return (
      <main className="min-h-screen bg-background">
        <PreviewBanner preview={preview} />
        <PreviewWarningPanel warnings={warnings} missingMedia={preview.missingMediaIds} />
        <section className="px-6 py-24">
          <div className="mx-auto max-w-[720px] border border-border bg-[hsl(var(--secondary))] p-12">
            <h3 className="mb-6 text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--brand-pink))]">Global Offices</h3>
            <OfficeContactCard city={office.city} address={office.address} phone={office.phone} />
          </div>
        </section>
      </main>
    );
  }

  return (
    <PreviewShell preview={preview}>
      <PreviewBanner preview={preview} />
      <DraftPreviewContent preview={preview} warnings={warnings} />
    </PreviewShell>
  );
}

export default function CmsPreview() {
  const [match, params] = useRoute("/preview/:token");
  const [preview, setPreview] = useState<Preview>();
  const [error, setError] = useState<PreviewError>();
  const [loading, setLoading] = useState(Boolean(match && params?.token));
  const lastPreviewStatus = useRef<IndustryPreviewStatus | undefined>(undefined);
  const previewStatus = industryPreviewStatus(preview, error, loading);

  useEffect(() => {
    applyMetadata({ title: "Protected preview | Cognirise", description: "Protected CMS saved-version preview.", canonicalUrl: null, noIndex: true });
    // Each capability gets an independent delivery lifecycle. In particular,
    // do not retain a prior ready state while its replacement is loading.
    lastPreviewStatus.current = undefined;
    setPreview(undefined);
    setError(undefined);
    setLoading(Boolean(params?.token));
    if (!params?.token) return;

    const controller = new AbortController();
    let active = true;
    let requestNumber = 0;
    const load = async () => {
      const currentRequest = ++requestNumber;
      try {
        const response = await fetch(`/api/preview/${encodeURIComponent(params.token)}`, {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        const body: unknown = await response.json().catch(() => null);
        if (!active || currentRequest !== requestNumber) return;
        if (!response.ok) {
          setPreview(undefined);
          setError(fetchError(response, body));
          setLoading(false);
          return;
        }
        if (!isPreview(body)) {
          setPreview(undefined);
          setError({ kind: "invalid-response", message: "The preview server returned an invalid saved revision." });
          setLoading(false);
          return;
        }
        setError(undefined);
        setPreview(body);
        setLoading(false);
      } catch (caught) {
        if (!active || (caught instanceof DOMException && caught.name === "AbortError")) return;
        setPreview(undefined);
        setError({ kind: "unavailable", message: "The protected preview request could not be completed." });
        setLoading(false);
      }
    };
    void load();
    const poll = window.setInterval(() => void load(), 30_000);
    return () => {
      active = false;
      window.clearInterval(poll);
      controller.abort();
    };
  }, [params?.token]);

  useEffect(() => {
    // The parent receives only an opaque delivery state. Capability tokens,
    // revision data, diagnostics, and preview content remain in this frame.
    if (!previewStatus || window.parent === window || lastPreviewStatus.current === previewStatus) return;
    window.parent.postMessage(
      { type: "industry-preview-status", status: previewStatus },
      window.location.origin,
    );
    lastPreviewStatus.current = previewStatus;
  }, [previewStatus]);

  useEffect(() => {
    const receiveFocusRequest = (event: MessageEvent<unknown>) => {
      // This route is intentionally the only message receiver. A preview may
      // be embedded by the same-origin CMS, never controlled by another frame.
      if (
        window.parent === window
        || event.origin !== window.location.origin
        || event.source !== window.parent
      ) return;
      if (!isIndustryPreviewFocusMessage(event.data)) return;
      const section = document.querySelector<HTMLElement>(
        `[data-industry-section="${event.data.section}"]`,
      );
      if (!section) return;
      const disclosure = section.querySelector<HTMLElement>("[aria-expanded]");
      if (event.data.state && disclosure && disclosure.getAttribute("aria-expanded") !== String(event.data.state === "expanded")) {
        disclosure.click();
      }
      if (!section.hasAttribute("tabindex")) section.tabIndex = -1;
      section.focus({ preventScroll: true });
      section.scrollIntoView({
        block: "start",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
    };
    window.addEventListener("message", receiveFocusRequest);
    return () => window.removeEventListener("message", receiveFocusRequest);
  }, []);

  if (!match) return <NotFound />;
  return <CmsPreviewContent preview={preview} error={error} />;
}
/*
 * Superseded inline preview branch. Its methodology media and SEO behavior is
 * retained by CmsPreviewContent and CmsPreviewFramework above.
export default function CmsPreview() {
  const [match, params] = useRoute("/preview/:token");
  const [preview, setPreview] = useState<Preview>();
  const [error, setError] = useState<PreviewError>();
  const [loading, setLoading] = useState(Boolean(match && params?.token));
  const lastPreviewStatus = useRef<IndustryPreviewStatus | undefined>(undefined);
  const previewStatus = industryPreviewStatus(preview, error, loading);

  useEffect(() => {
    applyMetadata({ title: "Protected preview | Cognirise", description: "Protected CMS saved-version preview.", canonicalUrl: null, noIndex: true });
    // Each capability gets an independent delivery lifecycle. In particular,
    // do not retain a prior ready state while its replacement is loading.
    lastPreviewStatus.current = undefined;
    setPreview(undefined);
    setError(undefined);
    setLoading(Boolean(params?.token));
    if (!params?.token) return;

    const controller = new AbortController();
    let active = true;
    let requestNumber = 0;
    const load = async () => {
      const currentRequest = ++requestNumber;
      try {
        const response = await fetch(`/api/preview/${encodeURIComponent(params.token)}`, {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        const body: unknown = await response.json().catch(() => null);
        if (!active || currentRequest !== requestNumber) return;
        if (!response.ok) {
          setPreview(undefined);
          setError(fetchError(response, body));
          setLoading(false);
          return;
        }
        if (!isPreview(body)) {
          setPreview(undefined);
          setError({ kind: "invalid-response", message: "The preview server returned an invalid saved revision." });
          setLoading(false);
          return;
        }
        setError(undefined);
        setPreview(body);
        setLoading(false);
      } catch (caught) {
        if (!active || (caught instanceof DOMException && caught.name === "AbortError")) return;
        setPreview(undefined);
        setError({ kind: "unavailable", message: "The protected preview request could not be completed." });
        setLoading(false);
      }
    };
    void load();
    const poll = window.setInterval(() => void load(), 30_000);
    return () => {
      active = false;
      window.clearInterval(poll);
      controller.abort();
    };
  }, [params?.token]);

  useEffect(() => {
    // The parent receives only an opaque delivery state. Capability tokens,
    // revision data, diagnostics, and preview content remain in this frame.
    if (!previewStatus || window.parent === window || lastPreviewStatus.current === previewStatus) return;
    window.parent.postMessage(
      { type: "industry-preview-status", status: previewStatus },
      window.location.origin,
    );
    lastPreviewStatus.current = previewStatus;
  }, [previewStatus]);

  useEffect(() => {
    const receiveFocusRequest = (event: MessageEvent<unknown>) => {
      // This route is intentionally the only message receiver. A preview may
      // be embedded by the same-origin CMS, never controlled by another frame.
      if (
        window.parent === window
        || event.origin !== window.location.origin
        || event.source !== window.parent
      ) return;
      if (!isIndustryPreviewFocusMessage(event.data)) return;
      const section = document.querySelector<HTMLElement>(
        `[data-industry-section="${event.data.section}"]`,
      );
      if (!section) return;
      const disclosure = section.querySelector<HTMLElement>("[aria-expanded]");
      if (event.data.state && disclosure && disclosure.getAttribute("aria-expanded") !== String(event.data.state === "expanded")) {
        disclosure.click();
      }
      if (!section.hasAttribute("tabindex")) section.tabIndex = -1;
      section.focus({ preventScroll: true });
      section.scrollIntoView({
        block: "start",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
    };
    window.addEventListener("message", receiveFocusRequest);
    return () => window.removeEventListener("message", receiveFocusRequest);
  }, []);

  if (!match) return <NotFound />;
  if (error) return <ProtectedPreviewError error={error} />;
  if (!preview) return null;

  const validation = validateCmsSnapshot(preview.kind, preview.document, "draft");
  const warnings = [...preview.validationWarnings, ...(validation.success ? [] : validation.errors)];

   if (preview.kind === "industry") {
    if (!validation.success) {
      return (
        <Shell navigationOverride={preview.navigation}>
          <PreviewBanner preview={preview} />
          <PreviewWarningPanel warnings={warnings} missingMedia={preview.missingMediaIds} />
          <ProtectedPreviewError error={{
            kind: "invalid-response",
            message: "This saved industry revision has validation errors and cannot be completed from public content.",
          }} />
        </Shell>
      );
    }
    return (
      <Shell navigationOverride={preview.navigation}>
        <PreviewBanner preview={preview} />
        <IndustryPreview preview={preview} content={validation.data.content as IndustryContent} />
      </Shell>
    );
  }

  const framework = preview.kind === "framework"
    ? composeFrameworkPreviewRecord(preview.document, preview)
    : null;

  if (preview.kind === "framework" && framework) {
    const missingFrameworkMedia = [
      ...new Set([
        ...preview.missingMediaIds,
        ...unresolvedPinnedMedia(preview.document.content, preview.media ?? []),
      ]),
    ];
    if (missingFrameworkMedia.length) {
      return (
        <Shell navigationOverride={preview.navigation}>
          <PreviewBanner preview={preview} />
          <PreviewWarningPanel warnings={warnings} missingMedia={missingFrameworkMedia} />
          <ProtectedPreviewError error={{
            kind: "invalid-response",
            message: "This saved framework revision references draft media that is unavailable. It has not been completed with public media.",
          }} />
        </Shell>
      );
    }
    return (
      <Shell navigationOverride={preview.navigation}>
        <main className="min-h-screen bg-background">
          <PreviewBanner preview={preview} />
          <PreviewWarningPanel warnings={warnings} missingMedia={preview.missingMediaIds} />
          {framework.template === "agent-authority"
            ? <AgentAuthorityLayout framework={framework} preview />
            : framework.template === "guardrails"
              ? <GuardrailsLayout framework={framework} preview />
              : (
                <MethodologyCmsPreviewBoundary framework={framework as CmsRecord<MethodologyFramework>}>
                  {framework.template === "idao"
                    ? <IDAOMethodology />
                    : framework.template === "ai-use-case-prioritization"
                      ? <AIUseCasePrioritization />
                      : framework.template === "ai-value-to-scale"
                        ? <AIValueToScale />
                        : framework.template === "agentic-operations-readiness"
                          ? <AgenticOperationsReadiness />
                          : <HumanAgentOperatingModel />}
                </MethodologyCmsPreviewBoundary>
              )}
        </main>
      </Shell>
    );
  }

  if (preview.kind === "office" && validation.success) {
    const office = validation.data.content as OfficeContent;
    return (
      <main className="min-h-screen bg-background">
        <PreviewBanner preview={preview} />
        <PreviewWarningPanel warnings={warnings} missingMedia={preview.missingMediaIds} />
        <section className="px-6 py-24">
          <div className="mx-auto max-w-[720px] border border-border bg-[hsl(var(--secondary))] p-12">
            <h3 className="mb-6 text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--brand-pink))]">Global Offices</h3>
            <OfficeContactCard city={office.city} address={office.address} phone={office.phone} />
          </div>
        </section>
      </main>
    );
  }

  return (
    <Shell navigationOverride={preview.navigation}>
      <PreviewBanner preview={preview} />
      <DraftPreviewContent preview={preview} warnings={warnings} />
    </Shell>
  );
}
*/
