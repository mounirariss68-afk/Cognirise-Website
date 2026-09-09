import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import type { CmsRecord } from "@/lib/cms";
import { trackEvent } from "@/lib/analytics";
import { useMarketStore, type Market } from "@/store/market";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { caseSectors, directlyRelatedCases, normalizeCaseFilterValue } from "./case-study-model";

type RichBlock = {
  type: string;
  level?: number;
  style?: "bullet" | "numbered";
  text?: string;
  attribution?: string;
  items?: string[];
};
type Fixture = { label?: string; value?: string; status?: string };
type CaseVisual = {
  template: string;
  fixtureLabels: string[];
  caption: string;
  altText: string;
  textEquivalent: string;
};
type LooseCase = CmsRecord & {
  sector?: string;
  sectors?: string[];
  industrySlugs?: string[];
  deliveryStage?: string;
  stage?: string;
  descriptor?: string;
  objective?: string;
  qualifiedImpact?: string;
  impact?: string;
  openAction?: { label?: string; href?: string } | string;
  visualTemplate?: string;
  visualFixtures?: Fixture[] | Record<string, string>;
  interfaceFixtures?: Fixture[] | Record<string, string>;
  relatedCaseSlugs?: string[];
  relatedIndustries?: string[];
  organizationDescriptor?: string;
  engagementType?: string;
  impactClassification?: string;
  impactStatement?: string;
  disclosureNote?: string;
  publicEvidenceStatus?: string;
  visual?: CaseVisual;
  approvedForIndustry?: boolean;
  variant?: string;
  disclosure?: string;
  mandate?: string;
  context?: string;
  constraints?: string[];
  work?: RichBlock[];
  controls?: string[];
  outcomes?: string[];
  evidence?: { statement: string; approved: boolean; source?: { label?: string; url?: string } }[];
  quote?: { text: string; attribution?: string };
  cta?: { label: string; href: string };
};

export type PublicCaseStudy = LooseCase;

const value = (item: LooseCase, key: "stage" | "impact") =>
  key === "stage" ? item.deliveryStage || item.stage || "Delivery record" : item.impactStatement || item.qualifiedImpact || item.impact || item.outcomes?.[0] || "";

function fixtures(item: LooseCase): Fixture[] {
  if (item.visual?.fixtureLabels.length) return item.visual.fixtureLabels.map((label) => ({ label }));
  const source = item.visualFixtures || item.interfaceFixtures;
  if (Array.isArray(source)) return source;
  if (source && typeof source === "object") return Object.entries(source).map(([label, value]) => ({ label, value }));
  return [];
}

function PulseInterface({ item, compact = false }: { item: LooseCase; compact?: boolean }) {
  const rows = fixtures(item);
  const template = item.visual?.template || item.visualTemplate || "operations-console";
  const rendition = item.media?.[0];
  if (rendition) {
    return (
      <figure className={`case-rendition ${compact ? "is-compact" : ""}`}>
        <img
          src={rendition.url}
          alt={rendition.altText || item.visual?.altText || "Illustrative interface reconstruction"}
          loading={compact ? "lazy" : "eager"}
        />
        <figcaption>{rendition.caption || item.visual?.caption || "Illustrative reconstruction using anonymized fixture data."}</figcaption>
        {item.visual?.textEquivalent && <span className="sr-only">{item.visual.textEquivalent}</span>}
      </figure>
    );
  }
  return (
    <div className={`case-interface case-interface--${template.replace(/[^a-z0-9-]/gi, "-")} ${compact ? "is-compact" : ""}`} aria-label={item.visual?.altText || `${template} interface reconstruction`}>
      <div className="case-interface__bar"><i /><i /><i /><span>{template.replace(/-/g, " ")}</span></div>
      <div className="case-interface__body">
        <aside><b>Pulse</b><span>Overview</span><span>Work queue</span><span>Controls</span></aside>
        <div className="case-interface__canvas">
          <div className="case-interface__signal"><span>{item.visual?.caption || "Illustrative interface reconstruction"}</span><strong>{item.objective || item.mandate}</strong><em className="sr-only">{item.visual?.textEquivalent}</em></div>
          <div className="case-interface__grid">
            {rows.slice(0, 6).map((row, index) => (
              <div key={`${row.label}-${index}`}><small>{String(index + 1).padStart(2, "0")}</small><b>{row.value || row.status || row.label}</b><i style={{ width: `${42 + ((index * 17) % 50)}%` }} /></div>
            ))}
            {!rows.length && (item.controls || []).slice(0, 4).map((control, index) => (
              <div key={control}><small>Control {String(index + 1).padStart(2, "0")}</small><b>{control}</b><i style={{ width: `${55 + index * 9}%` }} /></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkCard({ item, onOpen }: { item: LooseCase; onOpen: (trigger: HTMLButtonElement) => void }) {
  return (
    <article className="work-card" data-testid={`card-case-${item.slug}`}>
      <PulseInterface item={item} compact />
      <div className="work-card__meta"><span>{item.organizationDescriptor || item.descriptor || item.summary}</span><span>{value(item, "stage")}</span></div>
      <h3>{item.title}</h3>
      <p>{item.objective || item.mandate}</p>
      {value(item, "impact") && <div className="work-card__impact"><small>Qualified impact · {item.impactClassification || "published"}</small><strong>{value(item, "impact")}</strong></div>}
      <button type="button" onClick={(event) => onOpen(event.currentTarget)} data-testid={`button-open-case-${item.slug}`}>{typeof item.openAction === "object" ? item.openAction.label || "Open the record" : item.openAction || "Open the record"} <ArrowRight size={16} /></button>
    </article>
  );
}

function setCaseQuery(slug?: string, mode: "push" | "replace" = "push") {
  const url = new URL(window.location.href);
  if (slug) url.searchParams.set("case", slug);
  else url.searchParams.delete("case");
  window.history[mode === "push" ? "pushState" : "replaceState"](window.history.state, "", url);
}

function CaseSummaryDialog({
  active,
  market,
  onClose,
}: {
  active?: LooseCase;
  market: Market;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(active)} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      {active && <DialogContent className="case-drawer" onOpenAutoFocus={() => trackEvent("case_visual_enlarge", market, { slug: active.slug, sector: caseSectors(active)[0] || "unclassified", stage: value(active, "stage") })}>
        <DialogTitle className="case-drawer__title">{active.title}</DialogTitle>
        <DialogDescription className="case-drawer__desc">{active.organizationDescriptor || active.descriptor || active.summary}</DialogDescription>
        <PulseInterface item={active} />
        <div className="case-drawer__parts">
          <section><small>01 / Objective</small><h3>The mandate</h3><p>{active.objective || active.mandate}</p></section>
          <section><small>02 / Work</small><h3>What changed</h3><p>{active.work?.find((block) => block.text)?.text || active.context}</p></section>
          <section><small>03 / Controls</small><h3>How it stayed bounded</h3><ul>{active.controls?.map((item) => <li key={item}>{item}</li>)}</ul></section>
          <section><small>04 / Impact</small><h3>What can be said</h3><p>{value(active, "impact")}</p></section>
        </div>
        {active.variant === "full" ? <Link className="case-drawer__link" href={`/work/${active.slug}`} onClick={() => trackEvent("case_detail_visit", market, { slug: active.slug, sector: caseSectors(active)[0] || "unclassified", stage: value(active, "stage") })} data-testid={`link-case-detail-${active.slug}`}>Read the full record <ArrowRight size={16} /></Link> : active.cta ? <Link className="case-drawer__link" href={active.cta.href} onClick={() => trackEvent("case_cta", market, { slug: active.slug, sector: caseSectors(active)[0] || "unclassified", stage: value(active, "stage"), action: "value-scan" })} data-testid={`link-case-action-${active.slug}`}>{active.cta.label} <ArrowRight size={16} /></Link> : null}
      </DialogContent>}
    </Dialog>
  );
}

export function WorkLibrary({ cases }: { cases: LooseCase[] }) {
  const { market } = useMarketStore();
  const sectors = useMemo(() => Array.from(new Set(cases.flatMap(caseSectors))).sort(), [cases]);
  const stages = useMemo(() => Array.from(new Set(cases.map((item) => value(item, "stage")))).sort(), [cases]);
  const [sector, setSector] = useState("All");
  const [stage, setStage] = useState("All");
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const returnFocus = useRef<HTMLButtonElement | null>(null);
  const active = cases.find((item) => item.slug === activeSlug);

  useEffect(() => {
    const sync = () => setActiveSlug(new URL(window.location.href).searchParams.get("case"));
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const filtered = cases.filter((item) =>
    (sector === "All" || caseSectors(item).includes(sector)) &&
    (stage === "All" || value(item, "stage") === stage));
  const open = (item: LooseCase, trigger: HTMLButtonElement) => {
    returnFocus.current = trigger;
    setCaseQuery(item.slug);
    setActiveSlug(item.slug);
    trackEvent("case_card_open", market, { slug: item.slug, sector: caseSectors(item)[0] || "unclassified", stage: value(item, "stage") });
  };
  const close = () => {
    setCaseQuery(undefined, "replace");
    setActiveSlug(null);
    window.requestAnimationFrame(() => returnFocus.current?.focus());
  };
  if (!cases.length) return null;
  return (
    <section className="work-library" aria-labelledby="work-library-title">
      <div className="work-library__head"><div><span className="wp-kicker">Approved work library</span><h2 id="work-library-title">Explore the operating record.</h2></div><p>Filter by sector or delivery stage. Every record keeps the objective, control boundary and qualified impact together.</p></div>
      <div className="work-library__filters" aria-label="Filter case studies">
        <label>Sector<select value={sector} onChange={(event) => { setSector(event.target.value); trackEvent("case_sector_filter", market, { sector: normalizeCaseFilterValue(event.target.value), stage: normalizeCaseFilterValue(stage) }); }} data-testid="select-case-sector"><option>All</option>{sectors.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Delivery stage<select value={stage} onChange={(event) => { setStage(event.target.value); trackEvent("case_sector_filter", market, { sector: normalizeCaseFilterValue(sector), stage: normalizeCaseFilterValue(event.target.value) }); }} data-testid="select-case-stage"><option>All</option>{stages.map((item) => <option key={item}>{item}</option>)}</select></label>
        <span aria-live="polite" data-testid="status-case-count">{filtered.length} {filtered.length === 1 ? "record" : "records"}</span>
      </div>
      <div className="work-library__grid">{filtered.map((item) => <WorkCard key={item.slug} item={item} onOpen={(trigger) => open(item, trigger)} />)}</div>
      <CaseSummaryDialog active={active} market={market} onClose={close} />
    </section>
  );
}

export function IndustryEvidenceRail({ cases, industrySlug }: { cases: LooseCase[]; industrySlug: string }) {
  const { market } = useMarketStore();
  const related = directlyRelatedCases(cases, industrySlug);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const returnFocus = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    const sync = () => setActiveSlug(new URL(window.location.href).searchParams.get("case"));
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  if (!related.length) return null;
  const active = related.find((item) => item.slug === activeSlug);
  const open = (item: LooseCase, trigger: HTMLButtonElement) => {
    returnFocus.current = trigger;
    setCaseQuery(item.slug);
    setActiveSlug(item.slug);
    trackEvent("case_card_open", market, { slug: item.slug, sector: caseSectors(item)[0] || "unclassified", stage: value(item, "stage") });
  };
  const close = () => {
    setCaseQuery(undefined, "replace");
    setActiveSlug(null);
    window.requestAnimationFrame(() => returnFocus.current?.focus());
  };
  return (
    <section className="industry-case-rail" id="selected-work" tabIndex={-1} aria-labelledby="industry-cases-title">
      <div><span className="ind-kicker">Directly related work</span><h2 id="industry-cases-title">Evidence from the operating record.</h2></div>
      <Carousel opts={{ align: "start", loop: false }} aria-label="Related case studies">
        <CarouselContent>{related.map((item) => <CarouselItem className="basis-[86%] md:basis-[61%]" key={item.slug}><WorkCard item={item} onOpen={(trigger) => open(item, trigger)} /></CarouselItem>)}</CarouselContent>
        <div className="industry-case-rail__controls"><CarouselPrevious className="static translate-y-0" /><CarouselNext className="static translate-y-0" /></div>
      </Carousel>
      <CaseSummaryDialog active={active} market={market} onClose={close} />
    </section>
  );
}

export function CaseStudyLayout({ item }: { item: LooseCase }) {
  const { market } = useMarketStore();
  useEffect(() => {
    trackEvent("case_detail_visit", market, { slug: item.slug, sector: caseSectors(item)[0] || "unclassified", stage: value(item, "stage") });
  }, [item.slug, market]);
  return (
    <main className="case-detail">
      <section className="case-detail__hero"><div><span>{item.organizationDescriptor || item.descriptor || `${item.disclosure} case study`}</span><h1>{item.title}</h1><p>{item.objective || item.mandate}</p><dl><div><dt>Sector</dt><dd>{item.sector || "Cross-sector"}</dd></div><div><dt>Stage</dt><dd>{value(item, "stage")}</dd></div></dl></div><PulseInterface item={item} /></section>
      <section className="case-detail__story">
        {item.context && <article><span>01 / Context</span><h2>The operating context</h2><p>{item.context}</p></article>}
         <article><span>02 / Work</span><h2>The work in motion</h2>{item.work?.map((block, index) => {
           if (block.type === "heading") {
             return block.level === 2 ? <h2 key={index}>{block.text}</h2> : <h3 key={index}>{block.text}</h3>;
           }
           if (block.type === "quote") {
             return <blockquote key={index}><p>{block.text}</p>{block.attribution && <cite>{block.attribution}</cite>}</blockquote>;
           }
           if (block.type === "list") {
             const List = block.style === "numbered" ? "ol" : "ul";
             return <List key={index}>{block.items?.map((entry) => <li key={entry}>{entry}</li>)}</List>;
           }
           return <p key={index}>{block.text}</p>;
         })}</article>
        <div className="case-detail__split"><section><span>03 / Constraints & controls</span><h2>The bounded route</h2><ul>{[...(item.constraints || []), ...(item.controls || [])].map((entry) => <li key={entry}>{entry}</li>)}</ul></section><section><span>04 / Outcomes</span><h2>Qualified impact</h2><strong>{value(item, "impact")}</strong><ul>{item.outcomes?.slice(1).map((entry) => <li key={entry}>{entry}</li>)}</ul></section></div>
        {item.evidence?.length ? <section className="case-detail__evidence"><span>Evidence notes</span><h2>What supports the record</h2>{item.evidence.filter((entry) => entry.approved).map((entry) => <article key={entry.statement}><p>{entry.statement}</p>{entry.source?.url ? <a href={entry.source.url} target="_blank" rel="noreferrer">{entry.source.label || "Source"} <ExternalLink size={14} /></a> : <small>{entry.source?.label}</small>}</article>)}</section> : null}
        {item.disclosureNote && <aside className="case-detail__note"><span>Disclosure note</span><p>{item.disclosureNote}</p></aside>}
         {item.quote && <blockquote className="case-detail__quote"><p>{item.quote.text}</p>{item.quote.attribution && <cite>{item.quote.attribution}</cite>}</blockquote>}
        {item.media?.length ? <section><span>Media</span><div className="case-detail__media">{item.media.map((media) => <figure key={media.id}><img src={media.url} alt={media.altText || ""} /><figcaption>{media.caption}</figcaption></figure>)}</div></section> : null}
        {item.relatedIndustries?.length ? <section className="case-detail__related"><span>Related perspectives</span><h2>Continue through the operating context.</h2><div>{item.relatedIndustries.map((slug) => <Link key={slug} href={`/industries/${slug}`}>{slug.replace(/-/g, " ")} <ArrowRight size={15} /></Link>)}</div></section> : null}
        <section className="case-detail__cta"><div><span>Related next action</span><h2>{typeof item.openAction === "string" ? item.openAction : item.openAction?.label || item.cta?.label || "Bring one consequential process."}</h2></div><Link href={typeof item.openAction === "object" ? item.openAction.href || "/value-scan" : item.cta?.href || "/value-scan"} onClick={() => trackEvent("case_cta", market, { slug: item.slug, sector: caseSectors(item)[0] || "unclassified", stage: value(item, "stage") })} data-testid="link-case-cta">Start the conversation <ArrowRight size={16} /></Link></section>
      </section>
    </main>
  );
}