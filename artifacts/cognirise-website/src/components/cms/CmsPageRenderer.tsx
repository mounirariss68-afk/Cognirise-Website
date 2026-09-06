import { useEffect, useRef } from "react";
import { Link } from "wouter";
import type { CmsPageEnvelope } from "@workspace/api-client-react";
import { BrandButton } from "@/components/ui/brand-button";
import { ContactForm } from "@/pages/Contact";
import { ValueScanForm } from "@/pages/ValueScan";
import { trackEvent } from "@/lib/analytics";
import { cmsMediaHref } from "@/lib/cms-media";
import { useMarketStore } from "@/store/market";

type CmsPage = NonNullable<CmsPageEnvelope["page"]>;
type UnknownRecord = Record<string, unknown>;

const approvedSections = new Set([
  "hero", "richText", "claims", "metrics", "quote",
  "referenceGrid", "media", "timeline", "comparison",
  "cta", "faq", "downloadGate",
  "formSlot",
]);

function record(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function safeHref(value: unknown): string | undefined {
  const href = text(value);
  if (!href) return undefined;
  if (/^\/(?!\/)[A-Za-z0-9/_#?&=.%+-]*$/.test(href)) return href;
  try {
    const url = new URL(href);
    return ["https:", "mailto:", "tel:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}

function linkHref(value: unknown): string | undefined {
  if (!record(value)) return undefined;
  const explicit = safeHref(value.href ?? value.externalUrl);
  if (explicit) return explicit;
  const internal = record(value.internal) ? value.internal : undefined;
  const slug = text(internal?.slug);
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return undefined;
  const kind = text(internal?.routeKind);
  if (internal?._type === "publication") return `/insights/${slug}`;
  if (kind === "home") return "/";
  if (kind === "service") return `/what-we-do/${slug}`;
  if (kind === "platform") return `/platforms/${slug}`;
  if (kind === "industry") return `/industries/${slug}`;
  return `/${slug}`;
}

function PortableText({ value }: { value: unknown }) {
  if (!Array.isArray(value)) return null;
  return (
    <div className="space-y-4 text-base leading-relaxed text-foreground/80">
      {value.map((block, index) => {
        if (!record(block) || block.type !== "block" || !Array.isArray(block.children)) return null;
        const content = block.children.map((child) => record(child) && child.type === "span" ? text(child.text) ?? "" : "").join("");
        if (!content) return null;
        if (block.style === "h2") return <h2 key={index} className="font-display text-3xl font-semibold text-[hsl(var(--brand-deep))]">{content}</h2>;
        if (block.style === "h3") return <h3 key={index} className="font-display text-xl font-semibold text-[hsl(var(--brand-deep))]">{content}</h3>;
        if (block.style === "blockquote") return <blockquote key={index} className="border-l-2 border-[hsl(var(--brand-pink))] pl-5 font-display text-xl italic">{content}</blockquote>;
        return <p key={index}>{content}</p>;
      })}
    </div>
  );
}

function Action({ value }: { value: unknown }) {
  if (!record(value)) return null;
  const href = linkHref(value);
  const label = text(value.label);
  if (!href || !label) return null;
  return <BrandButton href={href}>{label}</BrandButton>;
}

function Media({ value, market, contentSlug }: { value: unknown; market: string; contentSlug: string }) {
  const hasPlayed = useRef(false);
  if (!record(value)) return null;
  const url = cmsMediaHref(value.url);
  if (!url) return null;
  const kind = text(value.kind);
  const decorative = value.decorative === true;
  const alt = decorative ? "" : text(value.altText);
  if ((kind === "image" || !kind) && (decorative || alt)) {
    return <img src={url} alt={alt ?? ""} className="h-auto w-full object-cover" loading="lazy" />;
  }
  const trackFirstPlay = () => {
    if (hasPlayed.current) return;
    hasPlayed.current = true;
    trackEvent("governed_media_played", {
      market,
      source_page: window.location.pathname,
      content_slug: contentSlug,
      format: kind ?? "media",
      delivery_source: "cms_media",
    });
  };
  if (kind === "video") return <video src={url} controls preload="metadata" className="w-full" aria-label={alt ?? text(value.title)} onPlay={trackFirstPlay} />;
  if (kind === "audio") return <audio src={url} controls preload="metadata" className="w-full" aria-label={alt ?? text(value.title)} onPlay={trackFirstPlay} />;
  return null;
}

function Section({ section, index, market, contentSlug }: { section: UnknownRecord; index: number; market: string; contentSlug: string }) {
  const type = text(section.type);
  if (section.enabled === false) return null;
  if (!type || !approvedSections.has(type)) {
    if (import.meta.env.DEV) {
      throw new Error(`Unsupported CMS section type: ${type ?? "missing"}`);
    }
    return <section className="sr-only" role="status" aria-label="A page section is unavailable" data-cms-section="unavailable">A page section is unavailable.</section>;
  }
  const heading = text(section.heading);
  const eyebrow = text(section.eyebrow);
  const shell = (content: React.ReactNode) => (
    <section className={type === "hero" ? "bg-muted/30 py-20 md:py-28" : "py-14 md:py-20"} data-cms-section={type}>
      <div className="mx-auto w-full max-w-[1200px] px-6 md:px-12">
        {eyebrow && <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[hsl(var(--brand-pink))]">{eyebrow}</p>}
        {heading && (type === "hero"
          ? <h1 className="max-w-4xl font-display text-4xl font-semibold leading-tight text-[hsl(var(--brand-deep))] md:text-6xl">{heading}</h1>
          : <h2 className="mb-6 max-w-3xl font-display text-3xl font-semibold text-[hsl(var(--brand-deep))] md:text-4xl">{heading}</h2>)}
        {content}
      </div>
    </section>
  );

  if (type === "hero") return shell(<><div className="mt-6 max-w-3xl"><PortableText value={section.body} /></div><div className="mt-8"><Action value={section.primaryAction} /></div><div className="mt-10"><Media value={section.media} market={market} contentSlug={contentSlug} /></div></>);
  if (type === "richText" || type === "claims" || type === "metrics") {
    const items = Array.isArray(section.claims) ? section.claims : Array.isArray(section.proof) ? section.proof : Array.isArray(section.items) ? section.items : [];
    return shell(<><PortableText value={section.body} />{items.length > 0 && <div className="mt-8 grid gap-4 md:grid-cols-3">{items.filter(record).map((item, itemIndex) => <article key={itemIndex} className="border border-border p-6"><strong className="font-display text-2xl text-[hsl(var(--brand-deep))]">{text(item.value) ?? text(item.statement) ?? text(item.title)}</strong>{text(item.context) && <p className="mt-2 text-sm text-muted-foreground">{text(item.context)}</p>}</article>)}</div>}</>);
  }
  if (type === "quote") return shell(<blockquote className="max-w-4xl font-display text-2xl leading-relaxed text-[hsl(var(--brand-deep))]">“{text(section.quote)}”</blockquote>);
  if (type === "media") return shell(<><Media value={section.media} market={market} contentSlug={contentSlug} />{record(section.media) && text(section.media.caption) && <p className="mt-3 text-sm text-muted-foreground">{text(section.media.caption)}</p>}<PortableText value={record(section.media) ? section.media.transcript : undefined} /></>);
  if (type === "timeline") return shell(<ol className="grid gap-5 md:grid-cols-3">{(Array.isArray(section.steps) ? section.steps : []).filter(record).map((step, stepIndex) => <li key={stepIndex} className="border-t-2 border-[hsl(var(--brand-coral))] pt-4"><strong>{text(step.label)}</strong><p className="mt-2 text-sm text-muted-foreground">{text(step.detail)}</p></li>)}</ol>);
  if (type === "comparison") return shell(<div className="grid gap-6 md:grid-cols-2"><div className="bg-muted/40 p-6"><h3 className="font-semibold">Before</h3><p className="mt-3">{text(section.before)}</p></div><div className="bg-[hsl(var(--brand-deep))] p-6 text-white"><h3 className="font-semibold">After</h3><p className="mt-3 text-white/80">{text(section.after)}</p></div></div>);
  if (type === "cta") return shell(<><PortableText value={section.body} /><div className="mt-8"><Action value={section.action} /></div></>);
  if (type === "faq") return shell(<div className="divide-y divide-border">{(Array.isArray(section.items) ? section.items : []).filter(record).map((item, itemIndex) => <details key={itemIndex} className="py-5"><summary className="cursor-pointer font-semibold">{text(item.question)}</summary><div className="mt-3"><PortableText value={item.answer} /></div></details>)}</div>);
  if (type === "downloadGate") {
    const asset = record(section.asset) ? section.asset : undefined;
    const href = cmsMediaHref(asset?.url);
    return shell(<><p className="mb-5 text-muted-foreground">{text(section.consentCopy)}</p>{href && <a className="font-bold text-[hsl(var(--brand-pink))] underline" href={href} download onClick={() => trackEvent("governed_download_clicked", {
      market,
      source_page: window.location.pathname,
      content_slug: contentSlug,
      format: "download",
      delivery_source: "cms_download_gate",
    })}>Download {text(asset?.title) ?? "asset"}</a>}</>);
  }
  if (type === "formSlot") {
    if (section.form === "contact") return shell(<ContactForm />);
    if (section.form === "valueScan") return shell(<ValueScanForm />);
    return null;
  }
  if (type === "referenceGrid") return shell(
    <div className="grid gap-5 md:grid-cols-3">
      {(Array.isArray(section.items) ? section.items : []).filter(record).map((item, itemIndex) => {
        const href = linkHref({ internal: item });
        const title = text(item.title) ?? text(item.name);
        const summary = text(item.summary) ?? text(item.dek);
        const role = text(item.role);
        const portableSummary = Array.isArray(item.bio) ? item.bio : Array.isArray(item.description) ? item.description : undefined;
        const details = Array.isArray(item.expertise) ? item.expertise : Array.isArray(item.capabilities) ? item.capabilities : [];
        return (
          <article key={itemIndex} className="border border-border p-6">
            {href && title
              ? <Link href={href} className="font-display text-xl font-semibold text-[hsl(var(--brand-deep))] hover:text-[hsl(var(--brand-pink))]">{title}</Link>
              : <h3 className="font-display text-xl font-semibold">{title}</h3>}
            {role && <p className="mt-2 text-xs font-bold uppercase tracking-wide text-[hsl(var(--brand-pink))]">{role}</p>}
            {summary && <p className="mt-3 text-sm text-muted-foreground">{summary}</p>}
            {portableSummary && <div className="mt-3"><PortableText value={portableSummary} /></div>}
            {details.length > 0 && <ul className="mt-4 space-y-2 text-sm text-muted-foreground">{details.map((detail, detailIndex) => text(detail) ? <li key={detailIndex}>{text(detail)}</li> : null)}</ul>}
          </article>
        );
      })}
    </div>,
  );
  return null;
}

function seoText(seo: UnknownRecord | undefined, key: string): string | undefined {
  return seo ? text(seo[key]) : undefined;
}

export function CmsPageRenderer({ page, preview = false }: { page: CmsPage; preview?: boolean }) {
  const { market } = useMarketStore();
  const viewedPublication = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (preview) return;
    const seo = record(page.seo) ? page.seo : undefined;
    const title = seoText(seo, "metaTitle") ?? page.title;
    const description = seoText(seo, "metaDescription") ?? page.summary;
    if (title) document.title = title;
    const setMeta = (selector: string, property: string, value: string) => {
      let node = document.head.querySelector<HTMLMetaElement>(selector);
      if (!node) { node = document.createElement("meta"); const match = selector.match(/\[([^=]+)="([^"]+)"\]/); if (match) node.setAttribute(match[1], match[2]); document.head.appendChild(node); }
      node.setAttribute(property, value);
    };
    if (description) setMeta('meta[name="description"]', "content", description);
    if (title) { setMeta('meta[property="og:title"]', "content", title); setMeta('meta[name="twitter:title"]', "content", title); }
    if (description) { setMeta('meta[property="og:description"]', "content", description); setMeta('meta[name="twitter:description"]', "content", description); }
    const openGraphImage = record(seo?.openGraphImage) ? safeHref(seo.openGraphImage.url) : undefined;
    if (openGraphImage?.startsWith("https:")) {
      setMeta('meta[property="og:image"]', "content", openGraphImage);
      setMeta('meta[name="twitter:image"]', "content", openGraphImage);
    }
    if (seo?.noIndex === true) setMeta('meta[name="robots"]', "content", "noindex, nofollow");
    else document.head.querySelector('meta[name="robots"]')?.remove();
    const canonical = safeHref(seo?.canonicalUrl);
    document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute(
      "href",
      canonical?.startsWith("https:") ? canonical : window.location.origin + window.location.pathname,
    );
    const structuredType = seoText(seo, "structuredDataType");
    const allowedTypes = ["WebPage", "Article", "Person", "Organization", "Service"];
    document.getElementById("cms-structured-data")?.remove();
    if (structuredType && allowedTypes.includes(structuredType)) {
      const script = document.createElement("script");
      script.id = "cms-structured-data";
      script.type = "application/ld+json";
      script.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": structuredType,
        ...(title ? { name: title } : {}),
        ...(description ? { description } : {}),
        url: canonical ?? window.location.href,
      }).replace(/</g, "\\u003c");
      document.head.appendChild(script);
    }
    return () => document.getElementById("cms-structured-data")?.remove();
  }, [page, preview]);

  useEffect(() => {
    if (preview || !window.location.pathname.startsWith("/insights/")) return;
    const viewKey = `${market}:${page.slug}:${page.revision}`;
    if (viewedPublication.current === viewKey) return;
    viewedPublication.current = viewKey;
    trackEvent("publication_viewed", {
      market,
      pathname: window.location.pathname,
      content_slug: page.slug,
      format: "article",
      delivery_source: "cms_page",
    });
  }, [market, page.revision, page.slug, preview]);

  return <div data-testid="cms-page" data-cms-revision={page.revision}>{page.sections.filter(record).map((section, index) => <Section key={text(section.id) ?? `${text(section.type)}-${index}`} section={section} index={index} market={market} contentSlug={page.slug} />)}</div>;
}

export const approvedCmsSectionTypes = approvedSections;