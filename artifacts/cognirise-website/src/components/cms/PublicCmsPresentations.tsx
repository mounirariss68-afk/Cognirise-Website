import { ArrowRight } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { cmsMediaObjectPosition } from "@/lib/cms";
import type {
  CaseStudyContent,
  FocalPoint,
  PartnerContent,
  PlatformContent,
  PublicationContent,
  SiteConfigurationContent,
} from "@workspace/api-zod";

export type DeliveredCmsMedia = {
  id: string;
  versionId: string;
  url: string;
  mimeType?: string | null;
  altText?: string | null;
  caption?: string | null;
  credit?: string | null;
  width?: number | null;
  height?: number | null;
  focalPoint?: FocalPoint | null;
};

type RichBlock = {
  type: string;
  level?: number;
  style?: "bullet" | "numbered";
  text?: string;
  attribution?: string;
  items?: string[];
};

function mediaAlt(media: DeliveredCmsMedia | undefined, fallback: string) {
  return media?.altText?.trim() || fallback;
}

/** The shared rich-text presentation used by CMS entities and protected drafts. */
export function CmsRichText({
  blocks,
  className = "space-y-5",
  leadFirstParagraph = false,
}: {
  blocks: RichBlock[] | undefined;
  className?: string;
  leadFirstParagraph?: boolean;
}) {
  if (!blocks?.length) return null;
  return (
    <div className={className}>
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return block.level === 2
            ? <h2 key={index} className="text-2xl font-semibold">{block.text}</h2>
            : <h3 key={index} className="text-xl font-semibold">{block.text}</h3>;
        }
        if (block.type === "list") {
          const List = block.style === "numbered" ? "ol" : "ul";
          return (
            <List key={index} className={block.style === "numbered" ? "list-decimal space-y-2 pl-6" : "list-disc space-y-2 pl-6"}>
              {block.items?.map((item) => <li key={item}>{item}</li>)}
            </List>
          );
        }
        if (block.type === "quote") {
          return (
            <blockquote key={index} className="border-l-2 border-[hsl(var(--brand-pink))] pl-5 text-lg font-semibold leading-8">
              <p>{block.text}</p>
              {block.attribution && <cite className="mt-2 block text-sm font-normal text-muted-foreground">{block.attribution}</cite>}
            </blockquote>
          );
        }
        return <p className={leadFirstParagraph && index === 0 ? "lead" : undefined} key={index}>{block.text}</p>;
      })}
    </div>
  );
}

export type PartnerPresentationProps = {
  name: string;
  content: PartnerContent;
  logoMedia?: DeliveredCmsMedia;
  index?: number;
  groupLabel?: string;
  source?: string;
  evidenceText?: string;
  platformHref?: string;
  preview?: boolean;
};

export function PartnerProfilePresentation({
  name,
  content,
  logoMedia,
  index = 0,
  groupLabel = content.allianceCategory,
  source,
  evidenceText,
  platformHref,
  preview = false,
}: PartnerPresentationProps) {
  const evidence = content.evidence ?? [];
  return (
    <article className="mb-24 border-t border-border pt-7 last:mb-0" data-testid={`profile-partner-${name.toLowerCase().replaceAll(".", "-")}`} data-preview={preview ? "draft" : undefined}>
      <div className="grid gap-10 lg:grid-cols-[.42fr_1fr]">
        <header>
          {logoMedia && <img src={logoMedia.url} alt={mediaAlt(logoMedia, `${name} logo`)} className="mb-8 h-16 max-w-[220px] object-contain object-left" loading={preview ? "eager" : "lazy"} />}
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--brand-coral))]">0{index + 1} / {groupLabel}</p>
          <h3 className="mt-6 text-5xl font-semibold md:text-7xl" data-testid={`text-partner-name-${name.toLowerCase().replaceAll(".", "-")}`}>{name}</h3>
          <p className="mt-5 max-w-[430px] text-sm font-semibold leading-6 text-muted-foreground">{content.positioning}</p>
          {platformHref && <div className="mt-8"><BrandButton href={platformHref} variant="secondary">View Platform Integration</BrandButton></div>}
        </header>
        <div>
          <div className="grid bg-[hsl(var(--brand-deep))] text-white sm:grid-cols-3">
            {content.facts.map((fact) => <div key={`${fact.value}-${fact.label}`} className="border-b border-white/15 p-6 last:border-0 sm:border-b-0 sm:border-r sm:last:border-0"><strong className="block text-2xl text-[hsl(var(--brand-coral))]">{fact.value}</strong><span className="mt-2 block text-xs leading-5 text-white/65">{fact.label}</span></div>)}
          </div>
          <div className="mt-9 grid gap-9 md:grid-cols-[.7fr_1.3fr]">
            <div><h3 className="mb-4 text-[10px] font-bold uppercase tracking-[.2em]">Coverage</h3><div className="flex flex-wrap gap-2">{content.coverage.map((item) => <span key={item} className="border border-border bg-secondary px-3 py-2 text-xs font-semibold">{item}</span>)}</div></div>
            <div><h3 className="mb-4 text-[10px] font-bold uppercase tracking-[.2em]">Platform, footprint & representative work</h3><p className="text-sm leading-7 text-muted-foreground">{evidenceText || evidence.map((item) => item.statement).join(" ")}</p></div>
          </div>
          <aside className="mt-9 grid gap-5 bg-secondary p-7 md:grid-cols-[.42fr_1fr]"><h4 className="text-sm font-bold">What {name} brings to Cognirise clients</h4><div><p className="text-sm leading-7 text-muted-foreground">{content.contribution}</p>{source && <p className="mt-6 border-t border-border pt-4 text-[10px] leading-5 text-muted-foreground">{source}</p>}</div></aside>
        </div>
      </div>
    </article>
  );
}

export type PlatformPresentationProps = {
  title: string;
  content: PlatformContent;
  /** Card/collection summary selected by the public delivery boundary. */
  summary?: string | null;
  heroMedia?: DeliveredCmsMedia;
  preview?: boolean;
};

export function PlatformPresentation({ title, content, summary, heroMedia, preview = false }: PlatformPresentationProps) {
  // The platform editor labels content.summary as the detail-page hero copy.
  // Protected previews must therefore render that exact saved field. Public
  // collection/detail delivery retains its existing top-level summary fallback.
  const heroSummary = preview ? content.summary : summary ?? content.summary;
  return (
    <main className="overflow-hidden" data-preview={preview ? "draft" : undefined}>
      <section className="relative bg-[hsl(var(--brand-deep))] px-6 py-24 text-white md:px-12 md:py-32">
        {heroMedia && <img src={heroMedia.url} alt={content.heroMedia?.altText || heroMedia.altText || ""} className="absolute inset-0 h-full w-full object-cover opacity-25" style={{ objectPosition: cmsMediaObjectPosition(heroMedia) }} />}
        <div className="relative mx-auto max-w-[1200px]">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-white/60">{content.category}</p>
          <h1 className="mt-7 max-w-[900px] text-5xl font-semibold leading-[.94] md:text-7xl">{title}</h1>
          <p className="mt-8 max-w-[680px] text-lg leading-8 text-white/75">{heroSummary}</p>
        </div>
      </section>
      <section className="mx-auto max-w-[1200px] space-y-20 px-6 py-20 md:px-12 md:py-28">
        {content.sections.map((section) => (
          <article key={section.heading} className="grid gap-8 border-t border-foreground pt-8 md:grid-cols-[.75fr_1.25fr]">
            <h2 className="text-3xl font-semibold">{section.heading}</h2>
            <div className="prose max-w-none">
              <CmsRichText blocks={Array.isArray(section.body) ? section.body : undefined} />
            </div>
          </article>
        ))}
        {(content.capabilities.length > 0 || content.differentiators.length > 0) && (
          <div className="grid gap-10 bg-secondary p-8 md:grid-cols-2 md:p-12">
            {content.capabilities.length > 0 && <div><h2 className="text-2xl font-semibold">Capabilities</h2><ul className="mt-5 space-y-3">{content.capabilities.map((item) => <li key={item}>{item}</li>)}</ul></div>}
            {content.differentiators.length > 0 && <div><h2 className="text-2xl font-semibold">Differentiators</h2><ul className="mt-5 space-y-3">{content.differentiators.map((item) => <li key={item}>{item}</li>)}</ul></div>}
          </div>
        )}
        {content.cta && <BrandButton href={content.cta.href}>{content.cta.label}</BrandButton>}
      </section>
    </main>
  );
}

export type PublicationPresentationProps = {
  title: string;
  summary?: string | null;
  content: PublicationContent;
  heroMedia?: DeliveredCmsMedia;
  pdfMedia?: DeliveredCmsMedia;
  socialMedia?: DeliveredCmsMedia;
  preview?: boolean;
};

function PublicationBody({ content, pdfMedia }: { content: PublicationContent; pdfMedia?: DeliveredCmsMedia }) {
  if (content.variant === "pov") {
    return (
      <>
        <p className="lead">{content.teaser}</p>
        {pdfMedia && <p><a href={pdfMedia.url}>Download the approved POV document</a></p>}
      </>
    );
  }
  return (
    <>
      <CmsRichText
        blocks={Array.isArray(content.body) ? content.body : undefined}
        leadFirstParagraph
      />
    </>
  );
}

export function PublicationPresentation({ title, summary, content, heroMedia, pdfMedia, socialMedia, preview = false }: PublicationPresentationProps) {
  return (
    <div className="flex flex-col" data-preview={preview ? "draft" : undefined}>
      <article className="px-6 md:px-12 py-12 md:py-20 max-w-[900px] mx-auto w-full">
        <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-8">
          <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
          Perspective · {(content.topics?.[0] || "Perspective")}
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-[64px] leading-[1.05] font-semibold mb-10 tracking-tight">{title}</h1>
        <div className="flex flex-wrap items-center gap-6 text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-12 py-6 border-y border-border">
          <div>By {content.author}</div>
          <div className="hidden md:block w-1 h-1 rounded-full bg-border" />
          <div>{new Date(`${content.publicationDate}T00:00:00Z`).toLocaleDateString("en-GB", { dateStyle: "long", timeZone: "UTC" })}</div>
          <div className="hidden md:block w-1 h-1 rounded-full bg-border" />
          <div>{content.readingTimeMinutes ?? 1} min read</div>
        </div>
        {heroMedia && (
          <figure className="mb-12 overflow-hidden" data-testid="publication-hero">
            <img
              src={heroMedia.url}
              alt={content.heroMedia?.altText || heroMedia.altText || title}
              className="max-h-[560px] w-full object-cover"
              style={{ objectPosition: cmsMediaObjectPosition(heroMedia) }}
              loading={preview ? "eager" : "lazy"}
              fetchPriority="high"
            />
          </figure>
        )}
        <div className="prose prose-lg md:prose-xl max-w-none prose-headings:font-display prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-[hsl(var(--brand-pink))] hover:prose-a:text-[hsl(var(--brand-coral))] prose-p:leading-relaxed prose-p:text-foreground/80">
          <style>{`.prose .lead { font-size: 1.25em; line-height: 1.6; color: hsl(var(--foreground)); font-weight: 500; margin-bottom: 2em; } .prose h3 { margin-top: 2em; margin-bottom: 1em; font-size: 1.75em; color: hsl(var(--brand-deep)); }`}</style>
          <PublicationBody content={content} pdfMedia={pdfMedia} />
        </div>
        <div className="mt-20 pt-10 border-t border-foreground">
          <div className="bg-[hsl(var(--secondary))] p-8 md:p-12 text-center flex flex-col items-center">
            <h3 className="font-display text-2xl md:text-3xl font-semibold mb-4">Ready to move the work?</h3>
            <p className="text-muted-foreground mb-8 max-w-[400px]">Start with one process under pressure. In a focused working session, we surface the opportunity and practical route to production.</p>
            <BrandButton href="/value-scan">Book a value scan</BrandButton>
          </div>
        </div>
      </article>
    </div>
  );
}

export function CaseStudyPreviewPresentation({ item, preview = false }: { item: CaseStudyContent & { title: string; slug: string; summary?: string | null; media?: DeliveredCmsMedia[] }; preview?: boolean }) {
  // The full public case-study composition lives in CaseStudyLayout. This
  // compact fallback is only used for a summary draft, which has no public
  // detail route by contract.
  return (
    <article className="mx-auto max-w-[1200px] px-6 py-16 md:px-12" data-preview={preview ? "draft" : undefined}>
      <p className="text-xs font-bold uppercase tracking-[.2em] text-[hsl(var(--brand-pink))]">{item.sector} · {item.deliveryStage}</p>
      <h1 className="mt-5 max-w-[950px] text-5xl font-semibold leading-none md:text-7xl">{item.title}</h1>
      <p className="mt-7 max-w-[750px] text-xl leading-8 text-muted-foreground">{item.summary || item.mandate}</p>
      {item.media?.[0] && <figure className="mt-12 overflow-hidden"><img src={item.media[0].url} alt={mediaAlt(item.media[0], item.title)} className="max-h-[520px] w-full object-cover" style={{ objectPosition: cmsMediaObjectPosition(item.media[0]) }} loading={preview ? "eager" : "lazy"} /><figcaption className="mt-2 text-xs text-muted-foreground">{item.media[0].caption}</figcaption></figure>}
      <div className="mt-14 grid gap-10 border-t border-border pt-8 md:grid-cols-2">
        <section><h2 className="text-xs font-bold uppercase tracking-[.18em]">Mandate</h2><p className="mt-4 leading-8">{item.mandate}</p></section>
        <section><h2 className="text-xs font-bold uppercase tracking-[.18em]">Qualified impact</h2><p className="mt-4 leading-8">{item.impactStatement}</p></section>
        <section><h2 className="text-xs font-bold uppercase tracking-[.18em]">Controls</h2><ul className="mt-4 list-disc space-y-2 pl-5">{item.controls.map((control) => <li key={control}>{control}</li>)}</ul></section>
        <section><h2 className="text-xs font-bold uppercase tracking-[.18em]">Disclosure</h2><p className="mt-4 leading-8">{item.disclosureNote}</p></section>
      </div>
      {item.quote && <blockquote className="mt-14 border-l-2 border-[hsl(var(--brand-pink))] pl-6 text-xl font-semibold leading-8"><p>{item.quote.text}</p>{item.quote.attribution && <cite className="mt-3 block text-sm font-normal text-muted-foreground">{item.quote.attribution}</cite>}</blockquote>}
    </article>
  );
}

export function SiteConfigurationPresentation({ content, media, preview = false }: { content: SiteConfigurationContent; media: DeliveredCmsMedia[]; preview?: boolean }) {
  if ("configuration" in content) {
    return <main className="mx-auto max-w-[760px] px-6 py-24 md:px-12" data-preview={preview ? "draft" : undefined}><p className="text-xs font-bold uppercase tracking-[.18em] text-[hsl(var(--brand-pink))]">Site configuration</p><h1 className="mt-5 text-5xl font-semibold">Contact configuration</h1><p className="mt-6 text-xl leading-8">{content.contactEmail}</p><p className="mt-4 text-sm text-muted-foreground">This setting is shown only in the protected editorial preview.</p></main>;
  }
  const poster = media.find((candidate) => candidate.id === content.hero.posterMediaId && candidate.versionId === content.hero.posterMediaVersionId);
  const sources = content.hero.sources.map((source) => media.find((candidate) => candidate.id === source.mediaId && candidate.versionId === source.mediaVersionId)).filter((candidate): candidate is DeliveredCmsMedia => Boolean(candidate));
  return (
    <main className="mx-auto max-w-[1200px] px-6 py-16 md:px-12" data-preview={preview ? "draft" : undefined}>
      <p className="text-xs font-bold uppercase tracking-[.18em] text-[hsl(var(--brand-pink))]">Site configuration · {content.page}</p>
      <h1 className="mt-5 text-5xl font-semibold">Hero film</h1>
      {poster && <figure className="mt-10"><img src={poster.url} alt={mediaAlt(poster, `${content.page} hero poster`)} className="max-h-[600px] w-full object-cover" style={{ objectPosition: cmsMediaObjectPosition(poster) }} loading="eager" /><figcaption className="mt-2 text-xs text-muted-foreground">{poster.caption}</figcaption></figure>}
      {sources.length > 0 && <video className="mt-10 max-h-[600px] w-full bg-black" controls poster={poster?.url} preload="metadata"><span>Your browser cannot play this hero film.</span>{sources.map((source) => <source key={`${source.id}:${source.versionId}`} src={source.url} type={source.mimeType || undefined} />)}</video>}
      <dl className="mt-10 grid gap-4 border-t border-border pt-6 sm:grid-cols-2">
        {content.hero.sources.map((source, index) => <div key={`${source.mediaId}:${source.mediaVersionId}`}><dt className="text-xs font-bold uppercase tracking-[.15em]">{source.mimeType}</dt><dd className="mt-2 break-all text-sm text-muted-foreground">{sources[index]?.url || "Source media unavailable in this revision."}</dd></div>)}
      </dl>
    </main>
  );
}