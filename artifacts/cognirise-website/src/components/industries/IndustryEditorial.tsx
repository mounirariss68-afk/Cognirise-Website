import React from "react";
import { Link } from "wouter";
import { ArrowRight, ExternalLink, ChevronDown } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { assetUrl } from "@/lib/assets";
import { useMarketStore, type Market } from "@/store/market";
import { LAUNCH_POLICY, projectIndustrySnapshotForMarket, type IndustrySectionId, type PublicSectorPov } from "@workspace/api-zod";
import type { IndustryContent } from "@/content/industries";
import { contentRecord, useCmsEntry, useCmsPreviewRequestDisabled } from "@/lib/cms";
import { useReleaseContext } from "@/lib/releases";
import { applyTelecomLaunch } from "@/content/telecom-launch";
import { cleanHeroIdentifier } from "@/lib/hero-identifiers";
import { NavigationBackControl } from "@/components/navigation/NavigationBackControl";
import { TelecomEditorial } from "@/components/industries/TelecomEditorial";
import { PublicSectorNativeEditorial } from "@/components/industries/PublicSectorNativeEditorial";
import {
  SpatialDisclosure,
  SpatialDisclosureItem,
  SpatialDisclosurePanel,
  SpatialDisclosureTrigger,
} from "@/components/ui/spatial-disclosure";

type EducationPov = NonNullable<IndustryContent["educationPov"]>;
type Domain = EducationPov["valueDomains"][number];
type RoadmapStage = EducationPov["roadmap"][number];
type PublicSectorBlock = PublicSectorPov["opportunity"][number];

function IndustrySection({
  id,
  className,
  children,
  ...props
}: React.PropsWithChildren<{ id: IndustrySectionId; className: string } & React.HTMLAttributes<HTMLElement>>) {
  return <section {...props} className={className} data-industry-section={id}>{children}</section>;
}

export function IndustryEditorial({ industry }: { industry: IndustryContent }) {
  const cms = useCmsEntry("industry", industry.slug);
  const published = cms.data ? contentRecord(cms.data, "industry") : null;
  const resolvedView = published ? { ...industry, ...published, slug: industry.slug } : industry;
  const { market, locale } = useMarketStore();
  const protectedPreview = useCmsPreviewRequestDisabled();
  const releaseContext = useReleaseContext();
  const launchTelecom = LAUNCH_POLICY.enabled && industry.slug === "telecoms"
    && locale === "en" && !protectedPreview && !releaseContext?.preview;
  const view = launchTelecom ? applyTelecomLaunch(resolvedView) : resolvedView;
  const publicSectorPov = view.publicSectorNative ?? view.publicSectorPov;
  const publicSectorMarketMismatch = industry.slug === "public-sector"
    && (
      (publicSectorPov && publicSectorPov.market !== market)
      || (published && (
        published.requestedMarket !== market
        || published.market !== market
      ))
    );
  // Public Sector editions are independent market records. If an exact
  // non-canonical edition is absent, do not silently render the compiled UAE
  // record as a market fallback.
  const publicSectorMissingExactEdition = industry.slug === "public-sector"
    && !published;
  if (!launchTelecom && (cms.isAuthoritative || industry.slug === "public-sector") && cms.delivery === "loading") {
    return <main className="min-h-[70vh] bg-[#fdfbf7] px-6 py-24 text-[#102957]" aria-busy="true"><NavigationBackControl embedded className="mb-7" /><p>Loading industry perspective…</p></main>;
  }
  if (publicSectorMarketMismatch || publicSectorMissingExactEdition || (!launchTelecom && cms.isAuthoritative && (!published || (industry.slug === "education" && !published.educationPov)))) {
    return <main className="min-h-[70vh] bg-[#fdfbf7] px-6 py-24 text-[#102957]"><div className="mx-auto max-w-3xl"><NavigationBackControl embedded className="mb-7" /><h1 className="font-display text-5xl font-semibold">This industry perspective is under review.</h1><p className="mt-6 max-w-xl text-lg text-[#506583]">It will return when an approved edition is published for this market.</p><Link className="mt-8 inline-flex font-bold text-[#db509e]" href="/industries">Explore all industries <ArrowRight size={16} /></Link></div></main>;
  }
  return <IndustryEditorialView view={view} />;
}

export function IndustryEditorialView({ view: baseView, marketOverride }: { view: IndustryContent; marketOverride?: Market }) {
  const { market: selectedMarket } = useMarketStore();
  const market = marketOverride ?? selectedMarket;
  const publicSectorMarketMismatch = baseView.slug === "public-sector"
    && (baseView.publicSectorNative ?? baseView.publicSectorPov)
    && (baseView.publicSectorNative ?? baseView.publicSectorPov)!.market !== market;
  const view = React.useMemo(
    () => publicSectorMarketMismatch
      ? baseView
      : projectIndustrySnapshotForMarket({ content: baseView }, market).content as IndustryContent,
    [baseView, market, publicSectorMarketMismatch],
  );
  if (baseView.slug === "telecoms" && view.telecomPov) {
    return <TelecomEditorial view={view} marketOverride={marketOverride} />;
  }
  if (publicSectorMarketMismatch) {
    return <main className="min-h-[70vh] bg-[#fdfbf7] px-6 py-24 text-[#102957]"><div className="mx-auto max-w-3xl"><NavigationBackControl embedded className="mb-7" /><h1 className="font-display text-5xl font-semibold">This industry perspective is under review.</h1><p className="mt-6 max-w-xl text-lg text-[#506583]">It will return when an approved edition is published for this market.</p><Link className="mt-8 inline-flex font-bold text-[#db509e]" href="/industries">Explore all industries <ArrowRight size={16} /></Link></div></main>;
  }
  if (baseView.slug === "public-sector" && view.publicSectorNative) {
    return <PublicSectorNativeEditorial view={view} marketOverride={marketOverride} />;
  }
  const imageSource = view.image.startsWith("http://") || view.image.startsWith("https://")
    ? view.image
    : assetUrl(view.image);
  const thesisParts = view.thesis.split(" — ");
  const opportunityValue = view.opportunity as unknown as string | { title: string; body: string };
  const opportunity = typeof opportunityValue === "string" ? { title: "The opportunity", body: opportunityValue } : opportunityValue;
  const pov = view.educationPov as EducationPov | undefined;
  const publicSectorPov = view.publicSectorPov as PublicSectorPov | undefined;
  const marketLabel = publicSectorPov?.marketLabel || market.toUpperCase();
  const heroKicker = cleanHeroIdentifier(`${marketLabel} / ${view.name}`, {
    marketLocation: marketLabel,
  });

  return (
    <main className={`industry industry--${view.variant}`} data-education-editorial={pov ? "" : undefined}>
      <style>{industryStyles}</style>
      <IndustrySection id="hero" className="ind-hero public-hero-shell" style={{ alignItems: "stretch" }} aria-labelledby="industry-title">
        <div className="ind-copy flex flex-col">
          <div className="flex flex-col gap-7">
            <NavigationBackControl embedded />
            <div className="ind-kicker">{heroKicker}</div>
          </div>
          <div className="mt-14 lg:mt-auto">
            <h1 id="industry-title">{thesisParts.map((part, index) => <React.Fragment key={`${part}-${index}`}>{index > 0 && <> <span className="ind-thesis-dash">—</span> </>}{part}</React.Fragment>)}</h1>
            <p>{view.dek}</p>
          </div>
        </div>
        <figure className="ind-image"><img src={imageSource} alt={view.imageAlt} /><span>01 / industry perspective</span></figure>
      </IndustrySection>

      <IndustrySection id="opportunity" className="ind-opportunity" aria-labelledby="opportunity-title">
        <div><div className="ind-kicker">Industry opportunity</div><h2 id="opportunity-title">{publicSectorPov ? "The opportunity" : opportunity.title}</h2></div>
        <div>{publicSectorPov ? <PublicSectorRichBlocks blocks={publicSectorPov.opportunity} className="ind-opportunity-rich" /> : <><p>{opportunity.body}</p>{pov?.introduction && pov.strategicShift && <div className="ind-opportunity-detail"><h3>{pov.introduction}</h3><p>"{pov.strategicShift}"</p></div>}</>}</div>
      </IndustrySection>

      <IndustrySection id="pressures" className="ind-pressure" aria-labelledby="pressure-title">
        <div><div className="ind-kicker">Operating pressures</div><h2 id="pressure-title">{publicSectorPov?.pressuresHeading ?? "Where impressive AI demos meet the realities of running a business."}</h2></div>
        <div className="ind-pressure-list">{view.pressures.map((pressure, index) => <article key={pressure.title}><span>0{index + 1}</span><div><h3>{pressure.title}</h3><p>{pressure.body}</p></div></article>)}</div>
        {pov?.convictions && <div className="ind-nested-module ind-convictions" aria-label="Strategic convictions"><div className="ind-kicker">Strategic convictions</div><h3>Lead with educational purpose.</h3><div className="ind-pressure-list">{pov.convictions.map((conviction, index) => <article key={conviction.title}><span>0{index + 1}</span><div><h4>{conviction.title}</h4><p>{conviction.body}</p></div></article>)}</div></div>}
      </IndustrySection>

      <IndustrySection id="capabilities" className="ind-capabilities" aria-labelledby="capabilities-title">
        <div className="ind-capabilities-head"><div><div className="ind-kicker">Value domains and capabilities</div><h2 id="capabilities-title">From operating need to governed capability.</h2></div><p>{publicSectorPov ? <MultilineText text={publicSectorPov.capabilitiesIntroduction} /> : "Choose a capability to read its approved detail. Selection persists for keyboard and touch users; no critical information depends on hover."}</p></div>
        <CapabilityDisclosure capabilities={view.capabilities} />
        {pov?.targetState && <div className="ind-nested-module"><div className="ind-kicker">Institution-wide capability layers</div><h3>Build the shared operating system.</h3><CapabilityDisclosure capabilities={pov.targetState} idPrefix="target-state" /></div>}
        {pov?.valueDomains && <div className="ind-nested-module"><div className="ind-kicker">Education value domains</div><h3>Redesign complete institutional journeys.</h3><DomainDisclosure domains={pov.valueDomains} /></div>}
        {pov?.imagery && <EducationImagery imagery={pov.imagery} />}
      </IndustrySection>

      <IndustrySection id="applications" className="ind-evidence" aria-labelledby="applications-title">
        <div className="ind-evidence-head"><div><div className="ind-kicker">Representative applications</div><h2 id="applications-title">Where capability can meet real work.</h2></div><p>{publicSectorPov ? <MultilineText text={publicSectorPov.applicationsDisclaimer} /> : "These representative patterns are not Cognirise client case studies. Evidence strength and decision boundaries stay visible."}</p></div>
        <ApplicationTable uses={view.uses} sources={view.sources} />
        {pov?.applications?.length ? <div className="ind-nested-module"><div className="ind-kicker">Application domains</div><h3>Where the shift applies.</h3>{pov.applications.map((group) => <ApplicationGroup key={group.title} group={group} sources={view.sources} />)}</div> : null}
        {pov?.signals?.length ? <div className="ind-nested-module"><div className="ind-kicker">Institutional signals</div><h3>Market evidence and implications.</h3><SignalTable signals={pov.signals} sources={view.sources} /></div> : null}
      </IndustrySection>

      <IndustrySection id="perspective" className="ind-perspective" aria-labelledby="perspective-title">
        <div className="ind-support"><div><div className="ind-kicker">Documented reversal</div><h2 id="perspective-title">{view.reversal.title}</h2><p className={publicSectorPov ? "ind-preserve-lines" : undefined}>{publicSectorPov ? <MultilineText text={view.reversal.body} /> : view.reversal.body}</p>{pov?.patternQuote && pov.globalDirection && <div className="ind-support-detail"><div className="ind-kicker">Global direction</div><h3>"{pov.patternQuote}"</h3><p>{pov.globalDirection}</p></div>}</div><div><div className="ind-kicker">Myth / verdict</div><strong className={publicSectorPov ? "ind-preserve-lines" : undefined}>{publicSectorPov ? <MultilineText text={view.myth.claim} /> : view.myth.claim}</strong><p className={publicSectorPov ? "ind-preserve-lines" : undefined}>{publicSectorPov ? <MultilineText text={view.myth.verdict} /> : view.myth.verdict}</p></div></div>
        {pov?.roadmap?.length ? <div className="ind-roadmap"><div className="ind-kicker">A practical sequence</div><h3>Establish. Build. Scale.</h3><StageDisclosure stages={pov.roadmap} /></div> : null}
      </IndustrySection>

      <IndustrySection id="market" className="ind-gcc" aria-labelledby="market-title">
        <div><div className="ind-kicker">Market context / {marketLabel}</div><h2 id="market-title">{publicSectorPov?.marketHeading ?? "Ambition is not the same as realised evidence."}</h2></div>
        <div>{publicSectorPov ? <PublicSectorRichBlocks blocks={publicSectorPov.marketContext} className="ind-market-rich" /> : <p>{view.gcc}</p>}{pov?.leadershipTest && <div className="ind-leadership-test"><span>Leadership test</span>{pov.leadershipTest}</div>}</div>
      </IndustrySection>

      <IndustrySection id="sources" className="ind-sources" aria-labelledby="sources-title">
        <div className="ind-kicker">Supporting evidence / source trail</div><h2 id="sources-title">Read the evidence behind this view.</h2>
        {publicSectorPov?.sourcesIntroduction && <p className="ind-sources-introduction"><MultilineText text={publicSectorPov.sourcesIntroduction} /></p>}
        {publicSectorPov ? <SourceTable sources={view.sources} /> : <div className="ind-sources-list">{view.sources.map((source) => <a className="ind-source" href={source.url} target="_blank" rel="noreferrer" key={source.url}><strong>{source.label}</strong><span>{source.publisher}</span><span>{source.kind}</span><ExternalLink size={15} aria-hidden="true" /></a>)}</div>}
        <Link className="ind-case-link" href="/industries#selected-work">Explore consolidated industry case studies <ArrowRight size={15} /></Link>
      </IndustrySection>

      <IndustrySection id="cta" className="ind-cta" {...(publicSectorPov ? { "aria-label": "Relevant next action" } : { "aria-labelledby": "cta-title" })}><div><div className="ind-kicker">Relevant next action</div>{publicSectorPov ? <PublicSectorRichBlocks blocks={publicSectorPov.nextAction} className="ind-next-action-rich" /> : <><h2 id="cta-title">{view.service.firstMove}</h2>{pov && <p>{view.selectedWork.description}</p>}<p>Bring the process, its evidence and the people accountable for the decision. Leave with a clearer route to a governed build.</p></>}</div><aside><Link href={view.service.href}>Relevant service: {view.service.label} <ArrowRight size={14} /></Link><BrandButton href="/value-scan">Book a value scan</BrandButton></aside></IndustrySection>
    </main>
  );
}

function MultilineText({ text }: { text: string }) {
  return <>
    {text.split(/\r?\n/).map((line, index) => <React.Fragment key={`${index}-${line}`}>{index > 0 && <br />}{line}</React.Fragment>)}
  </>;
}

function PublicSectorRichBlocks({ blocks, className = "" }: { blocks: PublicSectorBlock[]; className?: string }) {
  return <div className={`ind-rich-blocks ${className}`.trim()}>
    {blocks.map((block, index) => {
      const key = `${block.type}-${index}`;
      if (block.type === "paragraph") return <p key={key}><MultilineText text={block.text} /></p>;
      if (block.type === "heading") {
        return block.level === 3
          ? <h3 key={key}><MultilineText text={block.text} /></h3>
          : <h2 key={key}><MultilineText text={block.text} /></h2>;
      }
      const ListTag = block.style === "numbered" ? "ol" : "ul";
      return <ListTag key={key}>{block.items.map((item, itemIndex) => <li key={`${key}-${itemIndex}`}><MultilineText text={item} /></li>)}</ListTag>;
    })}
  </div>;
}

function CapabilityDisclosure({ capabilities, idPrefix = "capability" }: { capabilities: { title: string; body: string }[]; idPrefix?: string }) {
  return <SpatialDisclosure mode="editorial" orientation="vertical" allowCollapse preview previewExpands className="ind-disclosure-grid">
    {capabilities.map((capability, index) => <SpatialDisclosureItem key={capability.title} id={`${idPrefix}-${index}`} className={({ isActive }) => `ind-disclosure-item ${isActive ? "active" : ""}`}><SpatialDisclosureTrigger id={`${idPrefix}-${index}`} className="ind-disclosure-trigger"><span>0{index + 1}</span><h3>{capability.title}</h3><ChevronDown size={18} aria-hidden="true" /></SpatialDisclosureTrigger><SpatialDisclosurePanel id={`${idPrefix}-${index}`} className="ind-disclosure-panel"><p>{capability.body}</p></SpatialDisclosurePanel></SpatialDisclosureItem>)}
  </SpatialDisclosure>;
}

function DomainDisclosure({ domains }: { domains: Domain[] }) {
  return <SpatialDisclosure mode="editorial" orientation="vertical" allowCollapse preview previewExpands className="ind-disclosure-grid">
    {domains.map((domain, index) => <SpatialDisclosureItem key={domain.title} id={`education-domain-${index}`} className={({ isActive }) => `ind-disclosure-item ${isActive ? "active" : ""}`}><SpatialDisclosureTrigger id={`education-domain-${index}`} className="ind-disclosure-trigger"><span>0{index + 1}</span><h3>{domain.title}</h3><ChevronDown size={18} aria-hidden="true" /></SpatialDisclosureTrigger><SpatialDisclosurePanel id={`education-domain-${index}`} className="ind-disclosure-panel"><p>{domain.body}</p>{domain.examples.length > 0 && <ul>{domain.examples.map((example) => <li key={example}>{example}</li>)}</ul>}</SpatialDisclosurePanel></SpatialDisclosureItem>)}
  </SpatialDisclosure>;
}

function StageDisclosure({ stages }: { stages: RoadmapStage[] }) {
  return <SpatialDisclosure mode="editorial" orientation="horizontal" allowCollapse preview previewExpands className="ind-stage-grid">
    {stages.map((stage, index) => <SpatialDisclosureItem key={stage.horizon} id={`roadmap-${index}`} className={({ isActive }) => `ind-stage ${isActive ? "active" : ""}`}><SpatialDisclosureTrigger id={`roadmap-${index}`} className="ind-stage-trigger"><span>{stage.horizon}</span><h4>{stage.title}</h4><ChevronDown size={16} aria-hidden="true" /></SpatialDisclosureTrigger><SpatialDisclosurePanel id={`roadmap-${index}`} className="ind-stage-panel"><p>{stage.body}</p></SpatialDisclosurePanel></SpatialDisclosureItem>)}
  </SpatialDisclosure>;
}

function EducationImagery({ imagery }: { imagery: NonNullable<EducationPov["imagery"]> }) {
  const scenes = [
    { id: "educator-practice", label: "Educator practice", ...imagery.educatorPractice },
    { id: "research-coordination", label: "Research coordination", ...imagery.researchCoordination },
  ];
  return <div className="ind-nested-module ind-education-imagery" aria-label="Education practice and research scenes"><div className="ind-kicker">Approved education scenes</div><div className="ind-education-imagery-grid">{scenes.map((scene) => { const sceneSource = scene.src.startsWith("http://") || scene.src.startsWith("https://") ? scene.src : assetUrl(scene.src); return <figure key={scene.id} data-education-media={scene.media?.mediaVersionId}><img src={sceneSource} alt={scene.altText} loading="lazy" /><figcaption>{scene.label}</figcaption></figure>; })}</div></div>;
}

function ApplicationTable({ uses, sources }: { uses: IndustryContent["uses"]; sources: IndustryContent["sources"] }) {
  return <table className="ind-table"><thead><tr><th scope="col">Application</th><th scope="col">Evidence status</th><th scope="col">Required human-control boundary</th></tr></thead><tbody>{uses.map((use) => <tr key={use.use}><th scope="row" data-label="Application"><span>{use.use}</span>{use.description && <p className="ind-use-description"><MultilineText text={use.description} /></p>}</th><td data-label="Evidence status"><MultilineText text={use.evidence} /><SourceLinks urls={use.sourceUrls ?? []} sources={sources} /></td><td data-label="Required human-control boundary"><MultilineText text={use.boundary} /></td></tr>)}</tbody></table>;
}

function ApplicationGroup({ group, sources }: { group: NonNullable<EducationPov["applications"]>[number]; sources: IndustryContent["sources"] }) {
  return <div className="ind-application-group"><h4>{group.title}</h4><table className="ind-table"><thead><tr><th scope="col">Application</th><th scope="col">Description and sources</th></tr></thead><tbody>{group.items.map((item) => <tr key={item.title}><th scope="row" data-label="Application">{item.title}</th><td data-label="Description and sources">{item.body}<SourceLinks urls={item.sourceUrls} sources={sources} /></td></tr>)}</tbody></table></div>;
}

function SignalTable({ signals, sources }: { signals: EducationPov["signals"]; sources: IndustryContent["sources"] }) {
  return <table className="ind-table"><thead><tr><th scope="col">Institution</th><th scope="col">Signal</th><th scope="col">Implication and sources</th></tr></thead><tbody>{signals.map((signal) => <tr key={signal.institution}><th scope="row" data-label="Institution">{signal.institution}</th><td data-label="Signal">{signal.signal}</td><td data-label="Implication and sources">{signal.implication}<SourceLinks urls={signal.sourceUrls} sources={sources} /></td></tr>)}</tbody></table>;
}

function SourceLinks({ urls, sources }: { urls: string[]; sources: IndustryContent["sources"] }) {
  return <div className="ind-inline-sources">{urls.map((url) => {
    if (!/^https?:\/\//i.test(url)) return null;
    const source = sources.find((item) => item.url === url);
    return source ? <a key={url} href={url} target="_blank" rel="noreferrer">{source.label} <ExternalLink size={12} aria-hidden="true" /></a> : null;
  })}</div>;
}

function SourceTable({ sources }: { sources: IndustryContent["sources"] }) {
  return <table className="ind-table ind-source-table">
    <thead><tr><th scope="col">Source</th><th scope="col">Publisher</th><th scope="col">Category</th><th scope="col">Supports</th><th scope="col">Limitation</th></tr></thead>
    <tbody>{sources.map((source) => <tr key={source.url}>
      <th scope="row" data-label="Source">{/^https?:\/\//i.test(source.url) ? <a href={source.url} target="_blank" rel="noreferrer">{source.label} <ExternalLink size={13} aria-hidden="true" /></a> : source.label}</th>
      <td data-label="Publisher">{source.publisher}</td>
      <td data-label="Category">{source.kind}</td>
      <td data-label="Supports"><MultilineText text={source.supports ?? "—"} /></td>
      <td data-label="Limitation"><MultilineText text={source.limitation ?? "—"} /></td>
    </tr>)}</tbody>
  </table>;
}

export const industryStyles = `
  .industry{--ink:#102957;--deep:#071936;--paper:#fdfbf7;--soft:#eef0f5;--line:#cbd3e1;--violet:#7659df;--pink:#db509e;--coral:#ff775d;background:var(--paper);color:var(--ink);font-family:Inter,sans-serif;overflow-x:hidden}.industry *{box-sizing:border-box}.industry h1,.industry h2,.industry h3,.industry h4{font-family:Comfortaa,sans-serif}.industry a{color:inherit}.industry :focus-visible{outline:3px solid var(--coral);outline-offset:4px}.ind-kicker{font-size:10px;letter-spacing:.13em;text-transform:uppercase;font-weight:700;display:flex;align-items:center;gap:10px}.ind-kicker:before{content:"";width:25px;height:2px;background:linear-gradient(90deg,var(--violet),var(--pink),var(--coral))}
  .ind-hero{padding:34px 4.8vw 50px;display:grid;grid-template-columns:.88fr 1.12fr;gap:5vw;align-items:end;min-height:690px}.ind-copy{padding-bottom:25px}.ind-copy h1{font-size:clamp(50px,6.2vw,96px);line-height:.94;letter-spacing:-.075em;margin:32px 0 28px}.ind-thesis-dash{display:inline-block;letter-spacing:0;margin-inline:.06em}.ind-copy p{max-width:570px;color:#405677;font-size:17px;line-height:1.65}.ind-image{height:610px;position:relative;overflow:hidden;clip-path:polygon(10% 0,100% 0,100% 91%,0 100%,0 12%);background:var(--deep)}.ind-image img{width:100%;height:100%;object-fit:cover;animation:ind-reveal 1s ease both}.ind-image:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(7,25,54,.46),transparent 50%),linear-gradient(0deg,rgba(7,25,54,.5),transparent 48%)}.ind-image span{position:absolute;z-index:1;left:32px;bottom:30px;color:white;text-transform:uppercase;font-size:10px;letter-spacing:.13em}
   .ind-opportunity{margin:0 4.8vw;padding:90px 6vw;background:var(--deep);color:white;display:grid;grid-template-columns:.72fr 1.28fr;gap:8vw;align-items:start;position:relative;overflow:hidden}.ind-opportunity:after{content:"OPPORTUNITY";position:absolute;right:-10px;bottom:-12px;font:600 9vw/.8 Comfortaa;color:#ffffff0b}.ind-opportunity>*{position:relative;z-index:1}.ind-opportunity h2,.ind-pressure>div>h2,.ind-capabilities h2,.ind-evidence h2,.ind-gcc h2,.ind-sources h2{font-size:clamp(42px,5vw,72px);line-height:.98;letter-spacing:-.07em;margin:22px 0}.ind-opportunity p{font-size:clamp(20px,2vw,28px);line-height:1.55;color:#d7dfed;margin:0}.ind-opportunity-detail{display:block;margin-top:40px;padding-top:35px;border-top:1px solid #ffffff30}.ind-opportunity-detail strong{display:block;font-size:22px;line-height:1.45;color:#fff}.ind-opportunity-detail em{font-size:19px}.ind-opportunity-rich p{font-size:clamp(20px,2vw,28px)}.ind-opportunity-rich h2,.ind-opportunity-rich h3{margin:0 0 18px;color:#fff}.ind-opportunity-rich ul,.ind-opportunity-rich ol{margin:24px 0 0;padding-left:24px;color:#d7dfed;font-size:18px;line-height:1.6}.ind-opportunity-rich li+li{margin-top:10px}
  .ind-pressure{padding:130px 4.8vw 110px;display:grid;grid-template-columns:.72fr 1.28fr;gap:8vw}.ind-pressure-list{border-top:1px solid var(--ink)}.ind-pressure article{display:grid;grid-template-columns:55px 1fr;padding:28px 0;border-bottom:1px solid var(--line)}.ind-pressure article>span{color:var(--pink);font-size:10px;letter-spacing:.12em}.ind-pressure h3,.ind-pressure h4{font-size:24px;letter-spacing:-.04em;margin:0 0 9px}.ind-pressure p{color:#506583;line-height:1.6;margin:0;max-width:560px}.ind-nested-module{grid-column:1/-1;margin-top:24px;padding-top:44px;border-top:1px solid var(--line)}.ind-nested-module>h3{font-size:clamp(28px,3vw,42px);letter-spacing:-.06em;margin:18px 0 28px}.ind-convictions{background:var(--soft);padding:44px}
  .ind-capabilities{padding:110px 4.8vw;background:var(--soft)}.ind-capabilities-head{display:grid;grid-template-columns:.72fr 1.28fr;gap:8vw}.ind-capabilities-head>p{max-width:500px;color:#536887;line-height:1.6;align-self:end}.ind-disclosure-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;margin-top:50px;border:1px solid var(--line);background:var(--line)}.ind-disclosure-item{min-width:0;background:var(--paper)}.ind-disclosure-trigger{display:grid;grid-template-columns:1fr auto;gap:14px;align-items:start;width:100%;min-height:190px;border:0;background:transparent;padding:30px;text-align:left;color:var(--ink);cursor:pointer}.ind-disclosure-trigger span{color:var(--pink);font-size:10px;letter-spacing:.12em}.ind-disclosure-trigger h3{grid-column:1/-1;font-size:25px;line-height:1.15;letter-spacing:-.04em;margin:5px 0 0}.ind-disclosure-trigger svg{grid-column:2;grid-row:1;transition:transform .2s ease}.ind-disclosure-item.active .ind-disclosure-trigger svg{transform:rotate(180deg)}.ind-disclosure-panel{display:none;padding:0 30px 30px;overflow:visible}.ind-disclosure-item.active .ind-disclosure-panel{display:block}.ind-disclosure-panel p{margin:0;color:#506583;line-height:1.6}.ind-disclosure-panel ul{margin:18px 0 0;padding-left:20px;color:#405677;line-height:1.55}.ind-capabilities .ind-nested-module .ind-disclosure-grid{margin-top:0}.ind-education-imagery-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}.ind-education-imagery figure{margin:0;background:var(--paper)}.ind-education-imagery img{display:block;width:100%;aspect-ratio:16/9;object-fit:cover}.ind-education-imagery figcaption{padding:13px 16px;color:#405677;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.1em}
   .ind-evidence{padding:120px 4.8vw}.ind-evidence-head{display:flex;justify-content:space-between;align-items:end;gap:40px}.ind-evidence-head p{max-width:400px;color:#536887;line-height:1.6}.ind-table{width:100%;border-collapse:collapse;margin-top:45px;text-align:left}.ind-table thead th{font-size:9px;text-transform:uppercase;letter-spacing:.13em;color:#6f7d94;border-block:1px solid var(--ink);padding:16px}.ind-table td,.ind-table tbody th{padding:22px 16px;border-bottom:1px solid var(--line);vertical-align:top;line-height:1.5}.ind-table tbody th{font:600 18px Comfortaa;text-align:left}.ind-table td:first-of-type{color:#db509e;font-weight:700}.ind-table tbody th a{display:inline-flex;align-items:center;gap:5px;color:inherit;text-decoration:underline;text-decoration-color:var(--pink);text-decoration-thickness:2px;text-underline-offset:4px}.ind-use-description{margin:12px 0 0;color:#506583;font:400 14px/1.55 Inter,sans-serif}.ind-application-group{margin-top:38px}.ind-application-group h4{font-size:21px;margin:0 0 -22px}.ind-inline-sources{display:flex;flex-wrap:wrap;gap:8px 14px;margin-top:12px}.ind-inline-sources a{display:inline-flex;align-items:center;gap:4px;color:var(--pink);font-size:12px;text-decoration:underline}.ind-source-table{font-size:14px}.ind-source-table td,.ind-source-table tbody th{font-size:13px}.ind-source-table td:first-of-type{color:#405677;font-weight:400}.ind-source-table td:nth-of-type(3),.ind-source-table td:nth-of-type(4){min-width:220px;color:#405677;font-weight:400}.ind-sources-introduction{max-width:760px;margin:28px 0 0;color:#506583;line-height:1.65}
  .ind-perspective{background:var(--deep);color:white}.ind-support{margin:0 4.8vw;display:grid;grid-template-columns:1fr 1fr;position:relative}.ind-support>div{padding:70px 7%;position:relative}.ind-support>div:first-child{border-right:1px solid #ffffff30}.ind-support h2{font-size:clamp(35px,4vw,58px);letter-spacing:-.065em;line-height:1;margin:20px 0}.ind-support h3{font-size:22px;line-height:1.4;color:#fff}.ind-support p{color:#d7dfed;line-height:1.65}.ind-support strong{display:block;font:600 clamp(25px,3vw,42px)/1.1 Comfortaa;margin:20px 0}.ind-support-detail{margin-top:40px;padding-top:30px;border-top:1px solid #ffffff30}.ind-roadmap{margin:0 4.8vw;padding:0 7% 90px}.ind-roadmap>h3{font-size:clamp(30px,3.5vw,50px);letter-spacing:-.055em;line-height:1.05;margin:20px 0 35px}.ind-stage-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;background:#ffffff30}.ind-stage{min-width:0;background:#0b2246}.ind-stage-trigger{width:100%;min-height:145px;border:0;padding:24px;background:transparent;color:#fff;text-align:left;cursor:pointer}.ind-stage-trigger span{display:block;color:var(--pink);font-size:11px;font-weight:700;letter-spacing:.1em}.ind-stage-trigger h4{margin:12px 0 0;font-size:20px}.ind-stage-trigger svg{float:right;margin-top:-22px}.ind-stage-panel{display:none;padding:0 24px 24px;overflow:visible}.ind-stage.active .ind-stage-panel{display:block}.ind-stage-panel p{margin:0;color:#d7dfed;line-height:1.6}
   .ind-gcc{background:var(--soft);padding:110px 4.8vw;display:grid;grid-template-columns:1fr 1fr;gap:8vw}.ind-gcc p{font-size:20px;line-height:1.55;color:#405677;align-self:end;border-top:1px solid var(--ink);padding-top:24px}.ind-rich-blocks{color:#405677;line-height:1.65}.ind-rich-blocks p{margin:0 0 24px}.ind-rich-blocks p:last-child{margin-bottom:0}.ind-rich-blocks h2,.ind-rich-blocks h3{margin:0 0 16px;color:var(--ink);letter-spacing:-.04em}.ind-rich-blocks h2{font-size:30px}.ind-rich-blocks h3{font-size:22px}.ind-rich-blocks ul,.ind-rich-blocks ol{margin:0 0 24px;padding-left:24px}.ind-rich-blocks li+li{margin-top:8px}.ind-market-rich{border-top:1px solid var(--ink);padding-top:24px;font-size:20px}.ind-market-rich h2,.ind-market-rich h3{font-size:24px}.ind-next-action-rich{color:#d7dfed;max-width:820px}.ind-next-action-rich h2,.ind-next-action-rich h3{color:#fff}.ind-next-action-rich h2{font-size:clamp(45px,6vw,88px);line-height:.94;letter-spacing:-.08em}.ind-next-action-rich p{line-height:1.6}.ind-next-action-rich ul,.ind-next-action-rich ol{padding-left:24px;line-height:1.6}.ind-preserve-lines{white-space:normal}.ind-leadership-test{margin-top:30px;padding-top:20px;border-top:2px solid var(--coral);font-weight:bold;color:var(--ink);line-height:1.55}.ind-leadership-test span{display:block;margin-bottom:8px;color:var(--pink);font-size:10px;text-transform:uppercase;letter-spacing:.12em}
  .ind-sources{padding:110px 4.8vw}.ind-sources-list{margin-top:38px;border-top:1px solid var(--ink)}.ind-source{display:grid;grid-template-columns:1.3fr .8fr .6fr 30px;gap:20px;padding:19px 8px;border-bottom:1px solid var(--line);text-decoration:none;align-items:center}.ind-source span{font-size:12px;color:#647491}.ind-source strong{font-family:Comfortaa}.ind-source:hover strong{color:var(--pink)}.ind-case-link{display:inline-flex;gap:8px;align-items:center;margin-top:34px;border-bottom:1px solid var(--pink);padding-bottom:5px;font-size:14px;font-weight:700;text-decoration:none}
  .ind-cta{background:var(--deep);color:white;padding:95px 4.8vw;display:grid;grid-template-columns:1.3fr .7fr;gap:40px;align-items:end;position:relative;overflow:hidden}.ind-cta:before{content:"SIGNAL";position:absolute;right:-10px;bottom:-20px;font:600 16vw/.7 Comfortaa;color:#ffffff0b}.ind-cta>*{position:relative}.ind-cta h2{font-size:clamp(45px,6vw,88px);line-height:.94;letter-spacing:-.08em;margin:20px 0}.ind-cta p{color:#d7dfed;line-height:1.6}.ind-cta aside{border-left:2px solid var(--coral);padding-left:25px}.ind-cta aside a{display:block;margin-bottom:24px;font-weight:700}
  .industry--network .ind-hero{grid-template-columns:1.05fr .95fr}.industry--network .ind-image{clip-path:polygon(0 7%,92% 0,100% 100%,8% 94%)}.industry--journey .ind-hero{grid-template-columns:.74fr 1.26fr}.industry--journey .ind-image{clip-path:polygon(5% 0,100% 7%,94% 100%,0 92%)}.industry--field .ind-hero{grid-template-columns:1fr 1fr}.industry--field .ind-image{height:680px;clip-path:polygon(14% 0,100% 0,94% 100%,0 92%)}.industry--factory .ind-hero{grid-template-columns:1.12fr .88fr}.industry--factory .ind-image{height:560px;clip-path:polygon(0 0,100% 10%,93% 100%,8% 92%)}
  @keyframes ind-reveal{from{clip-path:inset(0 100% 0 0);transform:scale(1.05)}to{clip-path:inset(0);transform:none}}@media(min-width:761px) and (max-width:1050px){.ind-disclosure-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:760px){.ind-hero,.industry--network .ind-hero,.industry--journey .ind-hero,.industry--field .ind-hero,.industry--factory .ind-hero{display:flex;flex-direction:column;align-items:stretch;min-height:0;padding:34px 21px 36px}.ind-copy h1{font-size:51px}.ind-image,.industry--field .ind-image,.industry--factory .ind-image{height:430px}.ind-opportunity{display:block;margin:0;padding:70px 21px}.ind-opportunity p{margin-top:35px}.ind-pressure{display:block;padding:85px 21px}.ind-pressure-list{margin-top:40px}.ind-pressure article{grid-template-columns:38px 1fr}.ind-convictions{padding:28px 22px}.ind-capabilities{padding:82px 21px}.ind-capabilities-head{display:block}.ind-capabilities-head>p{margin-top:26px}.ind-disclosure-grid,.ind-stage-grid,.ind-education-imagery-grid{grid-template-columns:1fr;margin-top:35px}.ind-disclosure-trigger{min-height:0;padding:26px 24px}.ind-disclosure-panel{padding:0 24px 28px}.ind-evidence{padding:85px 21px}.ind-evidence-head{display:block}.ind-table,.ind-table tbody,.ind-table tr,.ind-table td,.ind-table tbody th{display:block}.ind-table thead{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}.ind-table tr{border-bottom:1px solid var(--line);padding:18px 0}.ind-table td,.ind-table tbody th{border:0;padding:5px 0}.ind-table td:before,.ind-table tbody th:before{content:attr(data-label);display:block;font:700 9px Inter;text-transform:uppercase;letter-spacing:.12em;color:#70809a;margin-bottom:4px}.ind-application-group h4{margin-bottom:-12px}.ind-support{display:block;margin:0}.ind-support>div{padding:58px 21px}.ind-support>div:first-child{border-right:0;border-bottom:1px solid #ffffff30}.ind-roadmap{margin:0;padding:0 21px 65px}.ind-gcc{display:block;padding:82px 21px}.ind-gcc p{margin-top:38px}.ind-sources{padding:82px 21px}.ind-source{grid-template-columns:1fr 24px}.ind-source span{grid-column:1}.ind-source svg{grid-column:2;grid-row:1}.ind-cta{display:block;padding:78px 21px}.ind-cta aside{margin-top:45px}}@media(prefers-reduced-motion:reduce){.industry *,.industry *:before,.industry *:after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
`;