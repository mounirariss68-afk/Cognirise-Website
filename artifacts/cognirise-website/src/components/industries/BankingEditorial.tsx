import React from "react";
import { Link, useSearch } from "wouter";
import { ArrowRight, ChevronDown, ExternalLink } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import type { IndustryContent } from "@/content/industries";
import { cmsMediaObjectPosition, resolveCmsMedia, type CmsRecord } from "@/lib/cms";
import { assetUrl } from "@/lib/assets";
import type { BankingPov, CmsMediaReferenceContract, IndustryContent as CmsIndustryContent } from "@workspace/api-zod";
import { cleanHeroIdentifier } from "@/lib/hero-identifiers";
import {
  SpatialDisclosure,
  SpatialDisclosureItem,
  SpatialDisclosurePanel,
  SpatialDisclosureTrigger,
} from "@/components/ui/spatial-disclosure";

type BankingView = IndustryContent & Partial<Pick<CmsRecord<CmsIndustryContent>, "media" | "heroMedia" | "heroMediaId">>;
type StartingPoint = BankingPov["startingPoints"][number];

export function BankingEditorial({ view }: { view: BankingView }) {
  const search = useSearch();
  const consolidatedCaseStudiesHref = `/industries${search ? `?${search}` : ""}#selected-work`;
  const pov = view.bankingPov;
  if (!pov) return null;

  const marketLabel = { uae: "UAE", ksa: "Saudi Arabia", turkiye: "Türkiye", europe: "Europe" }[pov.market];
  const heroKicker = cleanHeroIdentifier(`${marketLabel} / ${pov.hero.eyebrow}`, {
    marketLocation: marketLabel,
  });
  const media = view.media;
  const hero = resolveCmsMedia(media, view.heroMedia, view.heroMediaId);
  const heroUrl = hero?.url ?? assetUrl(view.image);
  const mediaUrl = (reference: CmsMediaReferenceContract) => resolveCmsMedia(media, reference)?.url;
  const mediaAlt = (reference: CmsMediaReferenceContract) =>
    reference.altText || resolveCmsMedia(media, reference)?.altText || "";

  return (
    <main className="banking-editorial">
      <style>{`
        .banking-editorial { --b-ink:#102957; --b-deep:#071936; --b-paper:#fdfbf7; --b-soft:#eef0f5; --b-line:#cbd3e1; --b-violet:#7659df; --b-pink:#db509e; --b-coral:#ff775d; overflow:hidden; background:var(--b-paper); color:var(--b-ink); font-family:Inter,sans-serif; }
        .banking-editorial * { box-sizing:border-box; }
        .banking-editorial h1,.banking-editorial h2,.banking-editorial h3,.banking-editorial h4 { margin-top:0; font-family:Comfortaa,sans-serif; }
        .banking-editorial a { color:inherit; }
        .banking-editorial :focus-visible { outline:3px solid var(--b-coral); outline-offset:4px; }
        .b-kicker { display:flex; align-items:center; gap:10px; font-size:10px; font-weight:700; letter-spacing:.13em; text-transform:uppercase; }
        .b-kicker::before { width:25px; height:2px; content:""; background:linear-gradient(90deg,var(--b-violet),var(--b-pink),var(--b-coral)); }
        .b-hero { display:grid; grid-template-columns:.88fr 1.12fr; gap:5vw; align-items:end; min-height:690px; padding:34px 4.8vw 50px; }
        .b-copy { padding-bottom:25px; } .b-copy h1 { max-width:740px; margin:32px 0 28px; font-size:clamp(40px,5.5vw,84px); line-height:1; letter-spacing:-.06em; }
        .b-copy p { max-width:570px; color:#405677; font-size:18px; line-height:1.65; } .b-hero-descriptor { display:block; max-width:570px; margin-top:-14px; color:#506583; font-size:13px; font-weight:700; line-height:1.45; } .b-hero-anchors { display:flex; flex-wrap:wrap; gap:20px; margin-top:40px; }
        .b-hero-anchors a { display:inline-flex; align-items:center; gap:8px; border-bottom:1px solid var(--b-pink); padding-bottom:4px; color:var(--b-ink); font-size:14px; font-weight:600; text-decoration:none; }
        .b-hero-image { position:relative; height:610px; overflow:hidden; clip-path:polygon(10% 0,100% 0,100% 91%,0 100%,0 12%); background:var(--b-deep); }
        .b-hero-image img { display:block; width:100%; height:100%; object-fit:cover; } .b-hero-image::after { position:absolute; inset:0; content:""; background:linear-gradient(90deg,rgba(7,25,54,.46),transparent 50%),linear-gradient(0deg,rgba(7,25,54,.5),transparent 48%); pointer-events:none; }
        .b-outcomes { display:grid; grid-template-columns:.72fr 1.28fr; gap:8vw; align-items:start; margin:0 4.8vw; padding:90px 6vw; background:var(--b-deep); color:#fff; }
        .b-outcomes h2,.b-section-title { margin:22px 0; font-size:clamp(36px,4.5vw,64px); line-height:1; letter-spacing:-.06em; }
        .b-outcomes-grid { display:grid; gap:34px; } .b-outcome { padding-bottom:28px; border-bottom:1px solid rgba(255,255,255,.14); } .b-outcome:last-child { border:0; padding:0; }
        .b-outcome h3 { margin-bottom:12px; color:var(--b-pink); font-size:24px; } .b-outcome p { margin:0 0 16px; color:#d7dfed; line-height:1.6; }
        .b-chips { display:flex; flex-wrap:wrap; gap:8px; padding:0; margin:0; list-style:none; } .b-chips li { padding:4px 10px; border-radius:4px; background:rgba(255,255,255,.1); font-size:11px; letter-spacing:.04em; text-transform:uppercase; }
        .b-adoption,.b-domains,.b-voice,.b-readiness,.b-evidence { padding:110px 4.8vw; } .b-adoption,.b-voice,.b-evidence { background:var(--b-soft); }
        .b-adoption-ladder { border:1px solid var(--b-line); background:var(--b-line); } .b-level { display:grid; grid-template-columns:80px minmax(220px,.8fr) minmax(340px,1.2fr); gap:38px; align-items:start; padding:38px; border-bottom:2px solid var(--b-line); background:var(--b-paper); } .b-level:last-child { border:0; }
        .b-level-num { color:var(--b-line); font-family:Comfortaa,sans-serif; font-size:48px; font-weight:700; line-height:1; } .b-level h3,.b-domain h3 { margin-bottom:12px; font-size:27px; letter-spacing:-.04em; } .b-level-main p,.b-domain p { margin:0; color:#506583; line-height:1.6; }
        .b-level-details { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:18px 24px; color:#405677; font-size:13px; line-height:1.55; } .b-level-details strong,.b-starter-details strong,.b-readiness-practices strong { display:block; margin-bottom:5px; color:var(--b-ink); font-size:10px; letter-spacing:.1em; text-transform:uppercase; }
        .b-domains { border-top:1px solid var(--b-line); } .b-domain-grid { border-top:1px solid var(--b-line); } .b-domain { display:grid; grid-template-columns:minmax(260px,.85fr) 1.15fr; gap:42px; padding:36px 0; border-bottom:1px solid var(--b-line); }
        .b-domain-lists { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:28px; } .b-domain-lists strong { display:block; margin-bottom:11px; color:var(--b-pink); font-size:11px; letter-spacing:.1em; text-transform:uppercase; } .b-domain-lists ul { padding:0; margin:0; list-style:none; color:#405677; font-size:14px; line-height:1.5; } .b-domain-lists li { position:relative; padding-left:14px; margin-bottom:8px; } .b-domain-lists li::before { position:absolute; left:0; content:"•"; color:var(--b-pink); }
        .b-starter { padding:110px 4.8vw; background:var(--b-deep); color:#fff; } .b-starter .b-section-title { margin-bottom:48px; }
        .b-starter-tiles { display:flex; gap:12px; min-width:0; } .b-starter-tile { position:relative; display:flex; flex:1 1 0; flex-direction:column; min-width:0; min-height:510px; overflow:visible; border:1px solid rgba(255,255,255,.16); background:#0b2246; }
        .b-starter-tile::before { position:absolute; z-index:4; top:0; bottom:0; left:0; width:4px; content:""; background:linear-gradient(180deg,var(--b-violet),var(--b-pink),var(--b-coral)); transform:scaleY(0); transform-origin:top; transition:transform .2s ease; pointer-events:none; } .b-starter-tile.is-open::before { transform:scaleY(1); }
        .b-starter-trigger { position:relative; z-index:3; width:100%; border:0; padding:28px; background:linear-gradient(180deg,rgba(7,25,54,.94),rgba(7,25,54,.75)); color:#fff; text-align:left; cursor:pointer; font:inherit; } .b-starter-number { display:block; margin-bottom:12px; color:var(--b-pink); font-size:11px; font-weight:700; letter-spacing:.1em; } .b-starter-trigger h3 { margin:0 0 13px; font-size:clamp(20px,1.9vw,28px); line-height:1.1; letter-spacing:-.04em; } .b-starter-proposition { margin:0; color:#d7dfed; font-size:14px; font-weight:600; line-height:1.45; }
        .b-starter-visual { position:absolute; inset:0; background:#071936; } .b-starter-visual img { display:block; width:100%; height:100%; object-fit:cover; opacity:.5; } .b-starter-visual::after { position:absolute; inset:0; content:""; background:linear-gradient(0deg,#071936 0%,transparent 70%); pointer-events:none; }
        .b-starter-panel { position:relative; z-index:3; display:none; margin-top:auto; padding:28px; background:linear-gradient(0deg,#071936 72%,rgba(7,25,54,.88)); } .b-starter-tile.is-open .b-starter-panel { display:block; } .b-starter-details { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px 22px; color:#d7dfed; font-size:13px; line-height:1.5; } .b-starter-details strong { color:#fff; } .b-starter-action { display:inline-flex; align-items:center; gap:8px; margin-top:24px; color:var(--b-pink); font-size:14px; font-weight:700; text-decoration:none; }
        .b-voice-grid { display:grid; grid-template-columns:.7fr 1.3fr; gap:6vw; align-items:start; } .b-voice-intro p { color:#405677; font-size:18px; line-height:1.6; } .b-partner-note { padding:20px; border-left:2px solid var(--b-violet); background:rgba(255,255,255,.55); } .b-partner-note strong { display:block; margin-bottom:7px; } .b-partner-note p,.b-partner-note small { display:block; margin:0 0 10px; color:#506583; font-size:14px; line-height:1.55; } .b-partner-note a { color:var(--b-pink); font-size:13px; font-weight:700; }
        .b-voice-list { display:grid; gap:12px; } .b-voice-item { display:grid; grid-template-columns:1fr 1fr; gap:24px; padding:22px; border:1px solid var(--b-line); background:var(--b-paper); } .b-voice-item h4 { margin-bottom:8px; font-size:18px; } .b-voice-item p { margin:0; color:#506583; font-size:14px; line-height:1.5; } .b-voice-meta { color:#405677; font-size:13px; line-height:1.55; } .b-voice-meta strong { color:var(--b-pink); }
        .b-readiness { display:grid; grid-template-columns:1.1fr .9fr; gap:7vw; align-items:center; } .b-readiness-copy > p { color:#405677; font-size:18px; line-height:1.6; } .b-readiness-practices { display:grid; gap:12px; padding:0; margin:30px 0 0; list-style:none; } .b-readiness-practices li { position:relative; padding-left:20px; color:#405677; line-height:1.55; } .b-readiness-practices li::before { position:absolute; left:0; color:var(--b-pink); content:"+"; font-weight:700; }
        .b-readiness-art { position:relative; width:100%; aspect-ratio:1; margin:0; overflow:hidden; background:var(--b-soft); } .b-readiness-art img { display:block; width:100%; height:100%; object-fit:cover; } .b-readiness-art figcaption { position:absolute; right:20px; bottom:20px; left:20px; padding:14px; background:rgba(7,25,54,.86); color:#fff; font-size:12px; line-height:1.5; }
        .b-delivery { margin-top:46px; padding-top:34px; border-top:1px solid var(--b-line); } .b-delivery h3 { font-size:24px; } .b-delivery-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:14px; } .b-delivery-stage { padding:18px; background:var(--b-soft); } .b-delivery-stage strong { display:block; margin-bottom:10px; color:var(--b-pink); font-size:13px; } .b-delivery-stage p { margin:0; color:#405677; font-size:13px; line-height:1.5; } .b-delivery-stage p + p { margin-top:10px; }
        .b-evidence-list { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:22px; } .b-evidence-item { padding:27px; border-top:3px solid var(--b-pink); background:var(--b-paper); } .b-evidence-item q { display:block; margin-bottom:18px; font-family:Comfortaa,sans-serif; font-size:17px; line-height:1.55; } .b-evidence-item cite { display:block; color:#506583; font-size:12px; font-style:normal; line-height:1.5; } .b-evidence-item a { display:inline-flex; align-items:center; gap:5px; margin-top:10px; color:var(--b-pink); font-weight:700; }
        .b-partners { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:20px; margin-top:42px; } .b-partner-card { padding:24px; border:1px solid var(--b-line); background:var(--b-paper); } .b-partner-card h3 { margin-bottom:10px; font-size:20px; } .b-partner-card p { color:#405677; line-height:1.55; } .b-partner-card small { display:block; color:#506583; line-height:1.5; } .b-partner-card a { display:inline-flex; align-items:center; gap:5px; margin-top:14px; color:var(--b-pink); font-size:13px; font-weight:700; }
        .b-base-pressures { display:grid; gap:12px; margin:0 0 42px; } .b-base-pressure { display:grid; grid-template-columns:36px 1fr; gap:16px; padding:20px; background:var(--b-paper); border-left:3px solid var(--b-pink); } .b-base-pressure span { color:var(--b-pink); font-size:11px; font-weight:700; letter-spacing:.1em; } .b-base-pressure h3 { margin-bottom:8px; font-size:20px; } .b-base-pressure p { margin:0; color:#506583; line-height:1.55; }
        .b-disclosure { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:1px; background:var(--b-line); border:1px solid var(--b-line); } .b-domain { display:block; padding:0; background:var(--b-paper); } .b-domain-trigger { display:grid; grid-template-columns:1fr auto; gap:14px; align-items:start; width:100%; min-height:170px; border:0; padding:28px; background:transparent; color:var(--b-ink); text-align:left; cursor:pointer; font:inherit; } .b-domain-trigger h3 { grid-column:1/-1; margin:0; font-size:26px; letter-spacing:-.04em; } .b-domain-trigger svg { transition:transform .2s ease; } .b-domain.is-open .b-domain-trigger svg { transform:rotate(180deg); } .b-domain-panel { display:none; padding:0 28px 30px; overflow:visible; } .b-domain.is-open .b-domain-panel { display:block; } .b-domain-panel p { margin:0; color:#506583; line-height:1.6; }
        .b-stage-disclosure { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:14px; } .b-delivery-stage { padding:0; background:var(--b-soft); } .b-stage-trigger { width:100%; min-height:130px; border:0; padding:18px; background:transparent; color:var(--b-ink); text-align:left; cursor:pointer; font:inherit; } .b-stage-trigger strong { display:block; margin-bottom:10px; color:var(--b-pink); font-size:13px; } .b-stage-panel { display:none; padding:0 18px 18px; overflow:visible; } .b-delivery-stage.is-open .b-stage-panel { display:block; } .b-stage-panel p { margin:0; color:#405677; font-size:13px; line-height:1.5; } .b-stage-panel p + p { margin-top:10px; }
        .b-application-table,.b-source-list { width:100%; margin:38px 0; border-top:1px solid var(--b-line); border-collapse:collapse; text-align:left; } .b-application-table th,.b-application-table td { padding:16px; border-bottom:1px solid var(--b-line); vertical-align:top; line-height:1.5; } .b-application-table th { font-family:Comfortaa,sans-serif; } .b-source { display:grid; grid-template-columns:1.2fr .85fr .6fr 24px; gap:16px; align-items:center; padding:18px 8px; border-bottom:1px solid var(--b-line); text-decoration:none; } .b-source span { color:#506583; font-size:12px; } .b-source:hover strong { color:var(--b-pink); } .b-case-link { display:inline-flex; align-items:center; gap:8px; border-bottom:1px solid var(--b-pink); padding-bottom:5px; color:var(--b-ink); font-size:14px; font-weight:700; text-decoration:none; }
        .b-market { display:grid; grid-template-columns:.72fr 1.28fr; gap:8vw; padding:110px 4.8vw; background:var(--b-soft); } .b-market p { margin:0; border-top:1px solid var(--b-ink); padding-top:24px; color:#405677; font-size:20px; line-height:1.55; } .b-perspective-summary { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:44px; padding-top:34px; border-top:1px solid var(--b-line); } .b-perspective-summary article { padding:22px; background:var(--b-soft); } .b-perspective-summary h3 { font-size:20px; } .b-perspective-summary p { color:#506583; line-height:1.55; }
        .b-cta { padding:105px 4.8vw; background:var(--b-deep); color:#fff; text-align:center; } .b-cta h2 { max-width:900px; margin:0 auto 20px; font-size:clamp(42px,6vw,72px); letter-spacing:-.06em; } .b-cta p { max-width:720px; margin:0 auto 38px; color:#d7dfed; font-size:19px; line-height:1.6; }
        @media (min-width:1280px) and (hover:hover) and (pointer:fine) { .b-starter-tiles { min-height:650px; } .b-starter-tile { min-height:0; transition:flex-grow .55s cubic-bezier(.19,1,.22,1),background .55s ease; } .b-starter-tile.is-open { flex-grow:4.15; } .b-starter-trigger { min-height:190px; padding:30px; } .b-starter-tile.is-open .b-starter-trigger { width:57%; background:#0b2246; } .b-starter-visual { transition:left .55s cubic-bezier(.19,1,.22,1); } .b-starter-tile.is-open .b-starter-visual { left:57%; } .b-starter-tile.is-open .b-starter-visual img { opacity:1; transition:opacity .55s ease,transform .7s ease; transform:scale(1.04); } .b-starter-panel { width:57%; overflow:visible; background:#0b2246; } }
        @media (max-width:1279px), (hover:none), (pointer:coarse) { .b-hero,.b-outcomes,.b-voice-grid,.b-readiness { grid-template-columns:1fr; gap:40px; } .b-hero { min-height:0; padding-top:60px; } .b-hero-image { height:400px; clip-path:none; } .b-level { grid-template-columns:1fr; gap:20px; } .b-level-num { display:none; } .b-domain { grid-template-columns:1fr; gap:20px; } .b-disclosure,.b-stage-disclosure { grid-template-columns:repeat(2,minmax(0,1fr)); } .b-starter-tiles { flex-direction:column; } .b-starter-tile { min-height:0; } .b-starter-visual { position:relative; order:2; height:220px; } .b-starter-trigger { order:1; } .b-starter-panel { order:3; margin:0; } .b-delivery-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
        @media (max-width:1279px), (hover:none), (pointer:coarse) { .b-starter-tile { flex:0 0 auto; min-height:auto; } .b-starter-trigger,.b-starter-visual,.b-starter-panel { flex-shrink:0; } }
        @media (max-width:680px) { .b-hero,.b-adoption,.b-domains,.b-starter,.b-voice,.b-readiness,.b-evidence,.b-cta,.b-market { padding-right:6vw; padding-left:6vw; } .b-outcomes { margin:0; padding:70px 6vw; } .b-level-details,.b-starter-details,.b-domain-lists,.b-voice-item,.b-evidence-list,.b-partners,.b-perspective-summary { grid-template-columns:1fr; } .b-delivery-grid,.b-disclosure,.b-stage-disclosure { grid-template-columns:1fr; } .b-hero-anchors { flex-direction:column; gap:14px; } .b-application-table,.b-application-table tbody,.b-application-table tr,.b-application-table th,.b-application-table td { display:block; } .b-application-table thead { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; } .b-application-table tr { padding:16px 0; border-bottom:1px solid var(--b-line); } .b-application-table th,.b-application-table td { border:0; padding:5px 0; } .b-application-table th::before,.b-application-table td::before { display:block; margin-bottom:4px; content:attr(data-label); color:#506583; font-size:9px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; } .b-source { grid-template-columns:1fr 24px; } .b-source span { grid-column:1; } .b-source svg { grid-column:2; grid-row:1; } .b-market { display:block; } .b-market p { margin-top:36px; } }
        @media (prefers-reduced-motion:reduce) { .banking-editorial *,.banking-editorial *::before,.banking-editorial *::after { scroll-behavior:auto!important; transition:none!important; animation:none!important; } }
      `}</style>

      <section className="b-hero" data-industry-section="hero" aria-labelledby="banking-hero-title">
        <div className="b-copy">
          <div className="b-kicker">{heroKicker}</div>
          <h1 id="banking-hero-title">{pov.hero.heading}</h1>
          <span className="b-hero-descriptor">{pov.descriptor}</span>
          <p>{pov.hero.body}</p>
          <nav className="b-hero-anchors" aria-label="Banking page sections">
            <a href="#starting-points">{pov.hero.startingPointsAnchorLabel} <ChevronDown size={14} /></a>
            <Link href={consolidatedCaseStudiesHref}>{pov.hero.selectedWorkAnchorLabel} <ChevronDown size={14} /></Link>
          </nav>
        </div>
        <figure className="b-hero-image">
          <img src={heroUrl} alt={view.heroMedia?.altText || hero?.altText || view.imageAlt} width={1440} height={1080} style={{ objectPosition: cmsMediaObjectPosition(hero) }} fetchPriority="high" />
        </figure>
      </section>

      <section className="b-outcomes" data-industry-section="opportunity" aria-labelledby="banking-outcomes-title">
        <div><div className="b-kicker">Operating value</div><h2 id="banking-outcomes-title">Outcomes to measure together.</h2></div>
        <div className="b-outcomes-grid">{pov.valueOutcomes.map((outcome) => <article className="b-outcome" key={outcome.title}><h3>{outcome.title}</h3><p>{outcome.body}</p><ul className="b-chips">{outcome.measures.map((measure) => <li key={measure}>{measure}</li>)}</ul></article>)}</div>
      </section>

      <section className="b-adoption" data-industry-section="pressures" aria-labelledby="banking-adoption-title">
        <div className="b-kicker">Operating pressures</div>
        <div className="b-base-pressures">{view.pressures.map((pressure, index) => <article className="b-base-pressure" key={pressure.title}><span>0{index + 1}</span><div><h3>{pressure.title}</h3><p>{pressure.body}</p></div></article>)}</div>
        <div className="b-kicker">Accountable progression</div><h2 id="banking-adoption-title" className="b-section-title">Three levels of AI value.</h2>
        <div className="b-adoption-ladder">{pov.adoptionLevels.map((level) => <article className="b-level" key={level.level}><div className="b-level-num">0{level.level}</div><div className="b-level-main"><h3>{level.title}</h3><p>{level.value}</p></div><div className="b-level-details"><div><strong>Illustrative work</strong>{level.illustrativeWork.join(", ")}</div><div><strong>Owner</strong>{level.owner}</div><div><strong>Readiness</strong>{level.readiness.join(", ")}</div><div><strong>Measures</strong>{level.measures.join(", ")}</div><div><strong>Decision boundary</strong>{level.decisionBoundary}</div></div></article>)}</div>
      </section>

      <section className="b-domains" data-industry-section="capabilities" aria-labelledby="banking-domains-title">
        <div className="b-kicker">Capability map</div><h2 id="banking-domains-title" className="b-section-title">Six banking value domains.</h2>
        <BankingDomains domains={pov.valueDomains} />
        <div id="starting-points" className="b-starter" aria-labelledby="banking-starter-title">
        <div className="b-kicker">Where to begin</div><h2 id="banking-starter-title" className="b-section-title">Four practical starting points.</h2>
        <BankingStartingPoints points={pov.startingPoints} mediaUrl={mediaUrl} mediaAlt={mediaAlt} />
        </div>
      </section>

      <section className="b-voice" data-industry-section="applications" aria-labelledby="banking-voice-title">
        <div className="b-kicker">Representative applications</div>
        <table className="b-application-table"><thead><tr><th scope="col">Application</th><th scope="col">Evidence status</th><th scope="col">Required human-control boundary</th></tr></thead><tbody>{view.uses.map((use) => <tr key={use.use}><th scope="row" data-label="Application">{use.use}</th><td data-label="Evidence status">{use.evidence}</td><td data-label="Required human-control boundary">{use.boundary}</td></tr>)}</tbody></table>
        <div className="b-voice-grid"><div className="b-voice-intro"><div className="b-kicker">Deep dive</div><h2 id="banking-voice-title" className="b-section-title">Seven voice journeys.</h2><p>{pov.voiceBanking.cogniriseContribution}</p><aside className="b-partner-note"><strong>{pov.voiceBanking.platform.name}</strong><p>{pov.voiceBanking.platform.contribution}</p><small>{pov.voiceBanking.platform.qualification}</small><a href={pov.voiceBanking.platform.href} target="_blank" rel="noreferrer">Visit platform <ExternalLink size={12} /></a></aside></div><div className="b-voice-list">{pov.voiceBanking.journeys.map((journey) => <article className="b-voice-item" key={journey.id}><div><h4>{journey.title}</h4><p>{journey.scope}</p></div><div className="b-voice-meta"><p><strong>Acting boundary:</strong> {journey.controlBoundary}</p><p><strong>Measures:</strong> {journey.measures.join(", ")}</p></div></article>)}</div></div>
      </section>

      <section className="b-readiness" data-industry-section="perspective" aria-labelledby="banking-readiness-title">
        <div className="b-readiness-copy"><div className="b-kicker">{pov.productionReadiness.eyebrow}</div><h2 id="banking-readiness-title" className="b-section-title">{pov.productionReadiness.heading}</h2><p>{pov.productionReadiness.body}</p><ul className="b-readiness-practices">{pov.productionReadiness.practices.map((practice) => <li key={practice}>{practice}</li>)}</ul><div className="b-delivery"><h3>Delivery path with proof.</h3><BankingStages stages={pov.deliveryPath.stages} /><ul className="b-readiness-practices">{pov.deliveryPath.practices.map((practice) => <li key={practice}>{practice}</li>)}</ul></div><div className="b-perspective-summary"><article><div className="b-kicker">Documented reversal</div><h3>{view.reversal.title}</h3><p>{view.reversal.body}</p></article><article><div className="b-kicker">Myth / verdict</div><h3>{view.myth.claim}</h3><p>{view.myth.verdict}</p></article></div></div>
        <figure className="b-readiness-art">{mediaUrl(pov.productionReadiness.image) && <img src={mediaUrl(pov.productionReadiness.image)} alt={mediaAlt(pov.productionReadiness.image)} width={1200} height={1200} style={{ objectPosition: `${pov.productionReadiness.focalPoint.x}% ${pov.productionReadiness.focalPoint.y}%` }} loading="lazy" />}<figcaption>{pov.productionReadiness.annotation}</figcaption></figure>
      </section>

      <section className="b-market" data-industry-section="market" aria-labelledby="banking-market-title"><div><div className="b-kicker">Market context / {marketLabel}</div><h2 id="banking-market-title" className="b-section-title">Ambition is not the same as realised evidence.</h2></div><p>{view.gcc}</p></section>

      <section className="b-evidence" data-industry-section="sources" aria-labelledby="banking-evidence-title">
        <div className="b-kicker">Research signals</div><h2 id="banking-evidence-title" className="b-section-title">Why broad operational adoption matters.</h2>
        <div className="b-evidence-list">{pov.evidenceSignals.map((signal) => <article className="b-evidence-item" key={signal.url}><q>{signal.statement}</q><cite><b>{signal.label}</b> · {signal.publisher} · {signal.kind}<br />{signal.publicationPeriod} · {signal.jurisdiction} · Accessed {signal.accessedAt}<br />{signal.qualification}<br /><a href={signal.url} target="_blank" rel="noreferrer">Read source <ExternalLink size={12} /></a></cite></article>)}</div>
        <div className="b-partners">{pov.partners.map((partner) => <article className="b-partner-card" key={partner.name}><h3>{partner.name}</h3><p>{partner.contribution}</p><small>{partner.qualification}</small>{partner.href && <a href={partner.href} target="_blank" rel="noreferrer">Visit source <ExternalLink size={12} /></a>}</article>)}</div>
        <div className="b-kicker" style={{ marginTop: "48px" }}>Further evidence</div><div className="b-source-list">{view.sources.map((source) => <a className="b-source" href={source.url} target="_blank" rel="noreferrer" key={source.url}><strong>{source.label}</strong><span>{source.publisher}</span><span>{source.kind}</span><ExternalLink size={14} aria-hidden="true" /></a>)}</div><Link className="b-case-link" href={consolidatedCaseStudiesHref}>Explore consolidated industry case studies <ArrowRight size={15} /></Link>
      </section>

      <section className="b-cta" data-industry-section="cta" aria-labelledby="banking-cta-title"><h2 id="banking-cta-title">{pov.cta.heading}</h2><p>{pov.cta.body}</p><BrandButton href={pov.cta.href}>{pov.cta.label}</BrandButton></section>
    </main>
  );
}

function BankingStartingPoints({
  points,
  mediaUrl,
  mediaAlt,
}: {
  points: BankingPov["startingPoints"];
  mediaUrl: (reference: CmsMediaReferenceContract) => string | undefined;
  mediaAlt: (reference: CmsMediaReferenceContract) => string;
}) {
  return (
    <SpatialDisclosure mode="editorial" orientation="horizontal" allowCollapse preview previewExpands className="b-starter-tiles">
      {points.map((point, index) => {
        const imageUrl = mediaUrl(point.image);
        return <SpatialDisclosureItem key={point.id} id={point.id} className={({ isActive }) => `b-starter-tile ${isActive ? "is-open" : ""}`}>
          <SpatialDisclosureTrigger id={point.id} className="b-starter-trigger">
            <span className="b-starter-number">0{index + 1}</span><h3>{point.title}</h3><p className="b-starter-proposition">{point.valueProposition}</p>
          </SpatialDisclosureTrigger>
          <div className="b-starter-visual">{imageUrl && <img src={imageUrl} alt={mediaAlt(point.image)} width={1200} height={1200} style={{ objectPosition: `${point.focalPoint.x}% ${point.focalPoint.y}%` }} loading="lazy" />}</div>
          <SpatialDisclosurePanel id={point.id} className="b-starter-panel">
            <StartingPointDetails point={point} />
          </SpatialDisclosurePanel>
        </SpatialDisclosureItem>;
      })}
    </SpatialDisclosure>
  );
}

function BankingDomains({ domains }: { domains: BankingPov["valueDomains"] }) {
  return <SpatialDisclosure mode="editorial" orientation="vertical" allowCollapse preview previewExpands className="b-disclosure">
    {domains.map((domain) => <SpatialDisclosureItem key={domain.id} id={domain.id} className={({ isActive }) => `b-domain ${isActive ? "is-open" : ""}`}>
      <SpatialDisclosureTrigger id={domain.id} className="b-domain-trigger"><h3>{domain.title}</h3><ChevronDown size={18} aria-hidden="true" /></SpatialDisclosureTrigger>
      <SpatialDisclosurePanel id={domain.id} className="b-domain-panel"><p>{domain.purpose}</p><div className="b-domain-lists"><div><strong>Examples</strong><ul>{domain.examples.map((item) => <li key={item}>{item}</li>)}</ul></div><div><strong>Measures</strong><ul>{domain.measures.map((item) => <li key={item}>{item}</li>)}</ul></div></div></SpatialDisclosurePanel>
    </SpatialDisclosureItem>)}
  </SpatialDisclosure>;
}

function BankingStages({ stages }: { stages: BankingPov["deliveryPath"]["stages"] }) {
  return <SpatialDisclosure mode="editorial" orientation="horizontal" allowCollapse preview previewExpands className="b-stage-disclosure">
    {stages.map((stage) => <SpatialDisclosureItem key={stage.stage} id={stage.stage} className={({ isActive }) => `b-delivery-stage ${isActive ? "is-open" : ""}`}>
      <SpatialDisclosureTrigger id={stage.stage} className="b-stage-trigger"><strong>{stage.stage}</strong><ChevronDown size={16} aria-hidden="true" /></SpatialDisclosureTrigger>
      <SpatialDisclosurePanel id={stage.stage} className="b-stage-panel"><p><b>Owner:</b> {stage.owner}</p><p>{stage.outcome}</p></SpatialDisclosurePanel>
    </SpatialDisclosureItem>)}
  </SpatialDisclosure>;
}

function StartingPointDetails({ point }: { point: StartingPoint }) {
  return (
    <>
      <div className="b-starter-details">
        <div><strong>The problem</strong>{point.problem}</div><div><strong>Cognirise role</strong>{point.cogniriseRole}</div><div><strong>Required inputs</strong>{point.requiredInputs.join(", ")}</div><div><strong>First deliverable</strong>{point.firstDeliverable}</div><div><strong>Measures</strong>{point.measures.join(", ")}</div><div><strong>Decision boundary</strong>{point.decisionBoundary}</div>
      </div>
      <Link href={point.action.href} className="b-starter-action">{point.action.label} <ArrowRight size={16} /></Link>
    </>
  );
}