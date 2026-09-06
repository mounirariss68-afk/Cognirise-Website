import { useEffect, useRef } from "react";
import { useRoute } from "wouter";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import NotFound from "@/pages/not-found";
import { useMarketStore } from "@/store/market";
import { BrandButton } from "@/components/ui/brand-button";
import { getGetCmsPublishedPublicationQueryKey, useGetCmsPublishedPublication } from "@workspace/api-client-react";
import { trackEvent } from "@/lib/analytics";
import { cmsMediaHref } from "@/lib/cms-media";

function PortableBody({ value }: { value: unknown }) {
  if (!Array.isArray(value)) return null;
  return <>{value.map((block, index) => {
    if (!block || typeof block !== "object" || !("type" in block) || block.type !== "block" || !("children" in block) || !Array.isArray(block.children)) return null;
    const content = block.children.map((child: unknown) => child && typeof child === "object" && "type" in child && child.type === "span" && "text" in child && typeof child.text === "string" ? child.text : "").join("");
    if (!content) return null;
    return block.style === "h2" || block.style === "h3" ? <h3 key={index}>{content}</h3> : <p key={index}>{content}</p>;
  })}</>;
}
function useArticleSeo(publication: { title: string; dek?: string; seo?: Record<string, unknown> } | null | undefined) {
  useEffect(() => {
    if (!publication) return;
    const seo = publication.seo;
    const title = typeof seo?.metaTitle === "string" ? seo.metaTitle : publication.title;
    const description = typeof seo?.metaDescription === "string" ? seo.metaDescription : publication.dek;
    document.title = title;
    if (description) document.head.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute("content", description);
  }, [publication]);
}
function httpsUrl(value: unknown) {
  return cmsMediaHref(value);
}


export default function InsightArticle() {
  const [match, params] = useRoute("/insights/:slug");
  const { market } = useMarketStore();
  const requestedSlug = params?.slug ?? "";
  const cms = useGetCmsPublishedPublication(market, requestedSlug, { query: { enabled: Boolean(match && requestedSlug), queryKey: getGetCmsPublishedPublicationQueryKey(market, requestedSlug) } });
  useArticleSeo(cms.data?.publication);
  const viewedPublication = useRef<string | undefined>(undefined);
  const publication = cms.data?.publication;
  const format = publication?.format ?? "article";
  const publicationId = publication?.id;

  useEffect(() => {
    if (!match || !requestedSlug || cms.isLoading) return;
    if (!publication) return;

    const viewKey = `${market}:${requestedSlug}:${publicationId}`;
    if (viewedPublication.current === viewKey) return;
    viewedPublication.current = viewKey;
    trackEvent("publication_viewed", {
      market,
      pathname: window.location.pathname,
      content_slug: requestedSlug,
      ...(publicationId ? { content_id: publicationId } : {}),
      format,
      delivery_source: "cms_publication",
    });
  }, [cms.isLoading, format, market, match, publication, publicationId, requestedSlug]);

  if (!match || !params.slug) {
    return <NotFound />;
  }
  if (cms.isLoading) return <section className="px-6 py-16" role="status">Loading perspective…</section>;
  if (cms.isError) return <section className="px-6 py-16" role="alert" data-testid="status-publication-unavailable">This perspective is currently unavailable.</section>;
  if (!publication) return <NotFound />;
  const article = publication ? {
    topic: publication.topics?.[0] ?? "Perspective",
    title: publication.title,
    date: publication.publishedAt ? new Date(publication.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "",
    author: publication.authors?.[0] && typeof (publication.authors[0] as any).name === "string" ? (publication.authors[0] as any).name : "Cognirise",
    readingTime: publication.readingMinutes ? `${publication.readingMinutes} min read` : "",
    content: <PortableBody value={publication.body} />,
  } : null;

  if (!article) return <NotFound />;

  return (
    <div className="flex flex-col">
      <article className="px-6 md:px-12 py-12 md:py-20 max-w-[900px] mx-auto w-full">
        <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-8">
          <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
          Perspective · {article.topic}
        </div>
        
        <h1 className="text-4xl md:text-5xl lg:text-[64px] leading-[1.05] font-semibold mb-10 tracking-tight">
          {article.title}
        </h1>
        
        <div className="flex flex-wrap items-center gap-6 text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-12 py-6 border-y border-border">
          <div>By {article.author}</div>
          <div className="hidden md:block w-1 h-1 rounded-full bg-border" />
          <div>{article.date}</div>
          <div className="hidden md:block w-1 h-1 rounded-full bg-border" />
          <div>{article.readingTime}</div>
        </div>
        
        <div className="prose prose-lg md:prose-xl max-w-none prose-headings:font-display prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-[hsl(var(--brand-pink))] hover:prose-a:text-[hsl(var(--brand-coral))] prose-p:leading-relaxed prose-p:text-foreground/80">
          <style>{`
            .prose .lead { font-size: 1.25em; line-height: 1.6; color: hsl(var(--foreground)); font-weight: 500; margin-bottom: 2em; }
            .prose h3 { margin-top: 2em; margin-bottom: 1em; font-size: 1.75em; color: hsl(var(--brand-deep)); }
          `}</style>
          
          {article.content}
          {publication?.media && httpsUrl(publication.media.url) && (
            <img src={httpsUrl(publication.media.url)} alt={typeof publication.media.altText === "string" ? publication.media.altText : ""} className="mt-10 w-full" loading="lazy" />
          )}
          {publication?.download && httpsUrl(publication.download.url) && (
            <p><a href={httpsUrl(publication.download.url)} download onClick={() => trackEvent("governed_download_clicked", {
              market,
              source_page: window.location.pathname,
              content_slug: requestedSlug,
              ...(publication.id ? { content_id: publication.id } : {}),
              format: publication.format ?? "article",
              delivery_source: "publication_detail",
            })}>{publication.gated ? "Request access to download" : "Download publication"}</a></p>
          )}
        </div>
        
        <div className="mt-20 pt-10 border-t border-foreground">
          <div className="bg-[hsl(var(--secondary))] p-8 md:p-12 text-center flex flex-col items-center">
            <h3 className="font-display text-2xl md:text-3xl font-semibold mb-4">Ready to move the work?</h3>
            <p className="text-muted-foreground mb-8 max-w-[400px]">
              Start with one process under pressure. In a focused working session, we surface the opportunity and practical route to production.
            </p>
            <BrandButton href="/value-scan">Book a value scan</BrandButton>
          </div>
        </div>
      </article>
    </div>
  );
}
