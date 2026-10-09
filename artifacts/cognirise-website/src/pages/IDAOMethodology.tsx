import { ArrowDown, ArrowRight, CornerDownLeft } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { BrandButton } from "@/components/ui/brand-button";
import { PulseImage } from "@/components/ui/pulse-image";
import { IDAO_CANON_LAYERS, IDAO_STAGES } from "@/content/idao";
import { useLaunchImageRegion, launchAudienceEnabled } from "@/lib/launch-region";
import { assetUrl } from "@/lib/assets";
import { idaoEditorial } from "@workspace/api-zod";
import { IDAO_EDITORIAL, IDAO_HERO } from "@/site/content/methods/idao";
import { methodSeo } from "@/site/content/methods/seo";
import { cleanHeroIdentifier } from "@/lib/hero-identifiers";
import { NavigationBackControl } from "@/components/navigation/NavigationBackControl";
import { useMarketStore } from "@/store/market";
import {
  MethodologyCmsDelivery,
  methodologyEditorial,
  methodologyEditorialMedia,
  methodologyHero,
  useMethodologyCmsSeo,
  useMethodologyCmsContent,
} from "@/components/MethodologyCmsLayout";

const DELIVERY_TEAM_PRESENTATION = {
  "senior-leaders": { side: "Human", accent: "#7659df" },
  "forward-deployed-engineers": { side: "Human", accent: "#9a63da" },
  "forward-deployed-agents": { side: "Agent", accent: "#db509e" },
  controls: { side: "Agent", accent: "#ff775d" },
} as const;

type DeliveryTeamId = keyof typeof DELIVERY_TEAM_PRESENTATION;

const REGIONAL_IDAO_MARKET_LABELS = {
  ksa: "Saudi Arabia",
  turkiye: "Türkiye",
  europe: "Europe",
} as const;

type RegionalIdaoMarket = keyof typeof REGIONAL_IDAO_MARKET_LABELS;

function regionalIdaoStageImage(market: string, stage: string) {
  if (!(market in REGIONAL_IDAO_MARKET_LABELS)) return null;
  return `/images/cognirise/idao/${market}/${stage.toLowerCase()}.jpg`;
}

function Kicker({ children, inverse = false }: { children: React.ReactNode; inverse?: boolean }) {
  return (
    <div className={`flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.13em] ${inverse ? "text-white/70" : "text-[#102957]"}`}>
      <span className="h-[2px] w-[23px] bg-gradient-to-r from-[hsl(var(--brand-violet))] via-[hsl(var(--brand-pink))] to-[hsl(var(--brand-coral))]" />
      {children}
    </div>
  );
}

function IDAOMethodologyContent() {
  const { market: editorialMarket } = useMarketStore();
  const imageRegion = useLaunchImageRegion();
  const market = launchAudienceEnabled() ? imageRegion ?? "europe" : editorialMarket;
  const cms = useMethodologyCmsContent("idao");
  useMethodologyCmsSeo(cms, methodSeo("/methodologies/idao"));
  const editorial = methodologyEditorial<"idao", typeof idaoEditorial>("idao", cms, IDAO_EDITORIAL);
  const hero = methodologyHero(cms, IDAO_HERO);
  const regionalHeroSrc = regionalIdaoStageImage(market, "demonstrate");
  const regionalMarketLabel = market in REGIONAL_IDAO_MARKET_LABELS
    ? REGIONAL_IDAO_MARKET_LABELS[market as RegionalIdaoMarket]
    : null;
  const teamImage = methodologyEditorialMedia(cms, editorial.delivery.teamImage);
  const reducedMotion = useReducedMotion();
  const [activeTeamMember, setActiveTeamMember] = useState<DeliveryTeamId>("senior-leaders");
  const [expandedCanonLayers, setExpandedCanonLayers] = useState<Set<string>>(() => new Set());
  const activeTeamDetail = editorial.deliveryTeam.find((item) => item.id === activeTeamMember) ?? editorial.deliveryTeam[0];

  if (launchAudienceEnabled() && !imageRegion) return <div aria-busy="true" className="min-h-[70vh] px-6 py-24" />;
  return (
    <article className="overflow-hidden bg-[#fdfcfb] font-sans text-[#102957] selection:bg-[hsl(var(--brand-pink))] selection:text-white">
      <header className="public-hero-shell px-6 pb-16 pt-9 md:px-[4.8vw] lg:pb-24">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <motion.div className="flex flex-col lg:min-h-[620px]" initial={reducedMotion ? false : { opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: reducedMotion ? 0 : 0.65 }}>
            <div className="flex flex-col gap-7">
              <NavigationBackControl embedded />
              <div data-hero-content-edge><Kicker>{cleanHeroIdentifier(hero.breadcrumb)}</Kicker></div>
            </div>
            <div className="mt-14 lg:mt-auto">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[hsl(var(--brand-pink))]">{hero.supportingText}</p>
              <h1 className="mt-5 font-display text-[clamp(58px,9vw,138px)] font-semibold leading-[0.82] tracking-[-0.095em]">{hero.title}</h1>
              <p className="mt-8 max-w-[620px] text-[19px] leading-[1.58] text-[#405777]">
                 {hero.description}
              </p>
              <a href={editorial.lifecycleCta.href} className="mt-9 inline-flex items-center gap-3 border-b border-[#102957] pb-2 text-sm font-bold hover:text-[hsl(var(--brand-pink))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">
                {editorial.lifecycleCta.label} <ArrowDown size={16} />
              </a>
            </div>
          </motion.div>
          <motion.figure
            initial={reducedMotion ? false : { opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: reducedMotion ? 0 : 1, ease: [0.2, 0.7, 0.2, 1] }}
            data-idao-hero-frame
            data-methodology-hero-frame
            className="clip-diagonal relative h-[430px] overflow-hidden bg-[#071936] md:h-[520px] lg:h-[620px]"
          >
            <PulseImage
              src={regionalHeroSrc
                ? assetUrl(regionalHeroSrc)
                : ("imageResolved" in hero && hero.imageResolved ? hero.imageSrc : assetUrl(hero.imageSrc))}
              alt={regionalMarketLabel ? `${hero.imageAlt} ${regionalMarketLabel} edition.` : hero.imageAlt}
              className="h-full w-full object-cover"
              style={{ objectPosition: hero.imagePosition }}
              eager
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#071936]/90 via-[#071936]/10 to-transparent" />
            <figcaption className="absolute bottom-[11%] left-6 right-7 text-white md:left-10 md:right-[12%] lg:left-12">
              <span className="text-[10px] font-bold uppercase tracking-[0.13em] text-white/70">{hero.imageCaptionSubtitle}</span>
              <strong className="mt-2 block max-w-[540px] font-display text-[clamp(28px,3vw,45px)] leading-[1.04] tracking-[-0.06em]">{hero.imageCaptionTitle}</strong>
            </figcaption>
          </motion.figure>
        </div>
      </header>

      <section className="border-y border-[#cbd3e1] px-6 py-20 md:px-[4.8vw] lg:py-28" aria-labelledby="one-team-heading">
        <div className="grid gap-8 border-t border-[#102957] pt-7 lg:grid-cols-[1.15fr_0.85fr] lg:gap-[7vw]">
          <div>
            <Kicker>{editorial.delivery.kicker}</Kicker>
            <h2 id="one-team-heading" className="mt-5 max-w-[850px] font-display text-[clamp(43px,5.7vw,84px)] font-semibold leading-[0.94] tracking-[-0.085em]">
              {editorial.delivery.headingBeforeEmphasis}<em className="not-italic text-[hsl(var(--brand-pink))]">{editorial.delivery.headingEmphasis}</em>
            </h2>
          </div>
          <p className="self-end border-t border-[#cbd3e1] pt-6 text-[17px] leading-[1.65] text-[#405777]">
            {editorial.delivery.description}
          </p>
        </div>

        <div className="relative mt-14 overflow-hidden bg-[#f3f5f8] lg:mt-20 border border-[#cbd3e1] rounded-sm">
          <div className="grid lg:grid-cols-[0.85fr_1.1fr_0.85fr]">
            <div className="z-10 flex flex-col border-[#cbd3e1] lg:border-r">
              <div className="border-b border-[#cbd3e1] p-5 lg:p-6 bg-white/50">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#7659df]">{editorial.delivery.humanKicker}</span>
                <h3 className="mt-2 font-display text-[24px] font-semibold tracking-[-0.05em]">{editorial.delivery.humanHeading}</h3>
              </div>
              {editorial.deliveryTeam.filter((item) => DELIVERY_TEAM_PRESENTATION[item.id as DeliveryTeamId].side === "Human").map((item) => {
                const isActive = item.id === activeTeamMember;
                const presentation = DELIVERY_TEAM_PRESENTATION[item.id as DeliveryTeamId];
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={isActive}
                    aria-expanded={isActive}
                    aria-controls="delivery-team-detail"
                    onPointerEnter={(event) => {
                      if (event.pointerType === "mouse") setActiveTeamMember(item.id as DeliveryTeamId);
                    }}
                    onFocus={() => setActiveTeamMember(item.id as DeliveryTeamId)}
                    onClick={() => setActiveTeamMember(item.id as DeliveryTeamId)}
                    className={`group relative flex-1 border-b border-[#cbd3e1] p-5 text-left transition-colors focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-[hsl(var(--brand-coral))] lg:p-6 ${isActive ? "bg-[#102957] text-white" : "hover:bg-white"}`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-[0.13em]" style={{ color: isActive ? "#d7cfff" : presentation.accent }}>{item.label}</span>
                    <strong className="mt-2 block font-display text-[20px] leading-[1.1] tracking-[-0.04em]">{item.title}</strong>
                    <span className={`mt-2 block text-[13px] leading-[1.55] ${isActive ? "text-white/75" : "text-[#536887]"}`}>{item.summary}</span>
                  </button>
                );
              })}
            </div>

            <div className="relative order-first flex min-h-[430px] flex-col items-center justify-end overflow-hidden bg-[#fdfcfb] pt-8 lg:order-none lg:min-h-[500px]">
              <div className="absolute inset-x-0 top-6 text-center z-20">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#647491]">{editorial.delivery.systemKicker}</span>
                <p className="mt-1 font-display text-[20px] font-semibold tracking-[-0.04em] text-[#102957]">{editorial.delivery.systemHeading}</p>
              </div>
              <motion.img
                key="human-agent-team"
                src={teamImage.src}
                alt={teamImage.altText}
                className="relative z-10 mt-12 max-h-[400px] w-full max-w-[460px] object-contain object-bottom drop-shadow-[0_20px_25px_rgba(16,41,87,0.1)] lg:mt-16 lg:max-h-[455px]"
                initial={reducedMotion ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: reducedMotion ? 0 : 0.7 }}
              />
            </div>

            <div className="z-10 flex flex-col border-[#cbd3e1] lg:border-l">
              <div className="border-b border-[#cbd3e1] p-5 lg:p-6 bg-white/50">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#db509e]">{editorial.delivery.agentKicker}</span>
                <h3 className="mt-2 font-display text-[24px] font-semibold tracking-[-0.05em]">{editorial.delivery.agentHeading}</h3>
              </div>
              {editorial.deliveryTeam.filter((item) => DELIVERY_TEAM_PRESENTATION[item.id as DeliveryTeamId].side === "Agent").map((item) => {
                const isActive = item.id === activeTeamMember;
                const presentation = DELIVERY_TEAM_PRESENTATION[item.id as DeliveryTeamId];
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={isActive}
                    aria-expanded={isActive}
                    aria-controls="delivery-team-detail"
                    onPointerEnter={(event) => {
                      if (event.pointerType === "mouse") setActiveTeamMember(item.id as DeliveryTeamId);
                    }}
                    onFocus={() => setActiveTeamMember(item.id as DeliveryTeamId)}
                    onClick={() => setActiveTeamMember(item.id as DeliveryTeamId)}
                    className={`group relative flex-1 border-b border-[#cbd3e1] p-5 text-left transition-colors focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-[hsl(var(--brand-coral))] lg:p-6 ${isActive ? "bg-[#102957] text-white" : "hover:bg-white"}`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-[0.13em]" style={{ color: isActive ? "#ffb1d4" : presentation.accent }}>{item.label}</span>
                    <strong className="mt-2 block font-display text-[20px] leading-[1.1] tracking-[-0.04em]">{item.title}</strong>
                    <span className={`mt-2 block text-[13px] leading-[1.55] ${isActive ? "text-white/75" : "text-[#536887]"}`}>{item.summary}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <motion.div
            id="delivery-team-detail"
            role="status"
            aria-live="polite"
            className="border-t border-[#cbd3e1] bg-[#102957] p-5 text-white lg:px-7 lg:py-6"
          >
            <motion.div key={activeTeamDetail.id} initial={reducedMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : 0.2 }}>
              <span className="text-[10px] font-bold uppercase tracking-[0.13em]" style={{ color: DELIVERY_TEAM_PRESENTATION[activeTeamDetail.id as DeliveryTeamId].accent }}>{activeTeamDetail.label}</span>
              <p className="mt-2 max-w-[1100px] text-[14px] leading-[1.6] text-[#d6deed]">{activeTeamDetail.detail}</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="border-y border-[#cbd3e1] px-6 py-16 md:px-[4.8vw] lg:py-20" aria-labelledby="starting-point">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-[8vw]">
          <div>
            <Kicker>{editorial.startingPoint.kicker}</Kicker>
            <h2 id="starting-point" className="mt-5 font-display text-[clamp(40px,5vw,70px)] font-semibold leading-[0.97] tracking-[-0.08em]">{editorial.startingPoint.heading}</h2>
          </div>
          <div className="self-end border-t border-[#102957] pt-6 text-[17px] leading-[1.65] text-[#405777]">
            <p>{editorial.startingPoint.firstParagraph}</p>
            <p className="mt-5">{editorial.startingPoint.secondParagraph}</p>
          </div>
        </div>
      </section>

      <section id="lifecycle" className="px-6 py-20 md:px-[4.8vw] lg:py-28" aria-labelledby="lifecycle-heading">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-[8vw]">
          <div>
            <Kicker>{editorial.lifecycle.kicker}</Kicker>
            <h2 id="lifecycle-heading" className="mt-5 font-display text-[clamp(42px,5vw,74px)] font-semibold leading-[0.96] tracking-[-0.08em]">{editorial.lifecycle.heading}</h2>
          </div>
          <div className="self-end border-t border-[#102957] pt-6">
            <p className="text-[19px] leading-[1.58] text-[#30486d]">{editorial.lifecycle.description}</p>
          </div>
        </div>

        <ol className="mt-16 space-y-16 lg:space-y-28">
          {IDAO_STAGES.map((stage, index) => {
            const governedStageImage = methodologyEditorialMedia(cms, editorial.stageMedia[index].image);
            const regionalStageSrc = regionalIdaoStageImage(market, stage.title);
            const stageImage = regionalStageSrc && regionalMarketLabel
              ? {
                  src: assetUrl(regionalStageSrc),
                  altText: `${governedStageImage.altText} Approved ${regionalMarketLabel} market edition.`,
                }
              : governedStageImage;
            return (
              <motion.li
              key={stage.title}
              id={stage.title.toLowerCase()}
              className="grid gap-0 border-t border-[#102957] lg:grid-cols-2"
              initial={reducedMotion ? false : { opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: reducedMotion ? 0 : 0.65 }}
            >
              <figure
                data-idao-stage-image={stage.title.toLowerCase()}
                className={`relative min-h-[380px] overflow-hidden bg-[#071936] lg:min-h-[720px] ${index % 2 ? "lg:order-2" : ""}`}
              >
                <PulseImage
                  src={stageImage.src}
                  alt={stageImage.altText}
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{ objectPosition: stage.imagePosition }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#071936]/85 via-transparent to-transparent" />
                <figcaption className="absolute bottom-6 left-6 right-6 text-white">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">{stage.num} / {stage.time}</span>
                  <strong className="mt-2 block font-display text-[clamp(29px,3vw,45px)] tracking-[-0.06em]">{stage.tagline}</strong>
                </figcaption>
              </figure>
              <div className={`bg-[#f3f5f8] p-7 md:p-10 lg:p-12 ${index % 2 ? "lg:order-1" : ""}`}>
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <span className="text-[10px] font-bold tracking-[0.14em]" style={{ color: stage.accent }}>{stage.num}</span>
                    <h3 className="mt-4 font-display text-[clamp(42px,5vw,68px)] font-semibold tracking-[-0.08em]">{stage.title}</h3>
                    <p className="mt-1 text-[12px] font-bold uppercase tracking-[0.12em] text-[#647491]">{stage.subtitle} · {stage.time}</p>
                  </div>
                  {index < IDAO_STAGES.length - 1 && <ArrowRight className="mt-2 shrink-0 text-[hsl(var(--brand-coral))]" aria-hidden="true" />}
                </div>
                <p className="mt-7 text-[18px] font-semibold leading-[1.55] text-[#30486d]">{stage.purpose}</p>
                <p className="mt-4 text-[15px] leading-[1.65] text-[#405777]">{stage.description}</p>

                <div className="mt-8 border-t border-[#cbd3e1] pt-6">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#647491]">Key work</h4>
                  <ul className="mt-4 space-y-3 text-sm leading-[1.55] text-[#405777]">
                    {stage.keyWork.map((item) => <li key={item} className="border-l-2 pl-3" style={{ borderColor: stage.accent }}>{item}</li>)}
                  </ul>
                </div>
                <div className="mt-8 grid gap-6 md:grid-cols-2">
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#647491]">Your participation</h4>
                    <p className="mt-3 text-sm leading-[1.6] text-[#405777]">{stage.clientRole}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#647491]">What you have in hand</h4>
                    <p className="mt-3 text-sm font-semibold leading-[1.6] text-[#30486d]">{stage.outcome}</p>
                  </div>
                </div>
                <div className="mt-8 border-t border-[#cbd3e1] pt-6 grid gap-6 md:grid-cols-2">
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#647491]">Decision gate</h4>
                    <p className="mt-3 text-sm leading-[1.6] text-[#405777]">{stage.decisionGate}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#647491]">Evidence to progress</h4>
                    <p className="mt-3 text-sm leading-[1.6] text-[#405777]">{stage.evidence}</p>
                  </div>
                </div>
              </div>
              </motion.li>
            );
          })}
        </ol>

        <div className="mt-16 flex items-start gap-4 border-t border-[#102957] pt-7 lg:ml-1/2 lg:mt-24">
          <CornerDownLeft className="mt-1 shrink-0 text-[hsl(var(--brand-violet))]" aria-hidden="true" />
          <p className="max-w-[680px] text-[16px] leading-[1.65] text-[#405777]"><strong className="text-[#102957]">{editorial.lifecycle.loopLead}</strong> {editorial.lifecycle.loopDescription}</p>
        </div>
      </section>

      <section className="bg-[#f3f5f8] px-6 py-20 text-[#102957] md:px-[4.8vw] lg:py-28" aria-labelledby="canon-heading">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-[8vw]">
          <div>
            <Kicker>{editorial.canonIntroduction.kicker}</Kicker>
            <h2 id="canon-heading" className="mt-6 font-display text-[clamp(44px,6vw,88px)] font-semibold leading-[0.92] tracking-[-0.09em]">{editorial.canonIntroduction.heading}</h2>
          </div>
          <div className="self-end border-t border-[#cbd3e1] pt-6">
            <p className="text-[18px] leading-[1.65] text-[#405777]">{editorial.canonIntroduction.summaryBeforeFirstEmphasis}<strong className="text-[#102957]">{editorial.canonIntroduction.firstEmphasis}</strong>{editorial.canonIntroduction.summaryBetweenEmphases}<strong className="text-[#102957]">{editorial.canonIntroduction.secondEmphasis}</strong>{editorial.canonIntroduction.summaryAfterSecondEmphasis}</p>
          </div>
        </div>
        <style>{`
          @media (min-width: 1024px) {
            .idao-canon-grid { grid-template-rows: repeat(7, auto); }
            .idao-canon-card {
              display: grid;
              grid-row: span 7;
              grid-template-rows: subgrid;
            }
          }
        `}</style>
        <div className="idao-canon-grid mt-14 grid items-start gap-x-8 gap-y-10 border-t border-[#cbd3e1] pt-10 md:grid-cols-2 lg:grid-cols-5 lg:gap-y-0">
          {IDAO_CANON_LAYERS.map((layer) => {
            // The five delivery-canon records are a shared, read-only
            // methodology authority. Regional CMS snapshots may localize the
            // hero and lifecycle stages, but must not retain retired canon art.
            const layerImage = {
              src: assetUrl(layer.image),
              altText: layer.imageAlt,
            };
            return (
              <div key={layer.num} className="idao-canon-card flex flex-col">
              <div
                role="img"
                aria-label={layerImage.altText}
                data-idao-canon-image={layer.num}
                className="aspect-[4/3] rounded-sm border border-[#cbd3e1] bg-white bg-cover bg-center"
                style={{ backgroundImage: `url("${layerImage.src}")` }}
              />
              <div className="mt-6 flex items-center justify-between text-[10px] font-bold tracking-[0.12em] text-[hsl(var(--brand-pink))]">
                <span>{layer.num}</span>
              </div>
              <h3 className="mt-4 font-display text-[23px] font-semibold leading-[1.05] tracking-[-0.05em]">{layer.title}</h3>
              <p className="mt-3 text-[13px] leading-[1.55] text-[#536887]">{layer.summary}</p>
              <div className="mt-4 border-t border-[#cbd3e1] pt-4 text-[13px] leading-[1.65] text-[#405777]">
                <p>{layer.detail}</p>
              </div>
              {(() => {
                const isExpanded = expandedCanonLayers.has(layer.num);
                const panelId = `canon-examples-${layer.num}`;
                return (
                  <>
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      aria-controls={panelId}
                      onClick={() => setExpandedCanonLayers((current) => {
                        const next = new Set(current);
                        if (next.has(layer.num)) next.delete(layer.num);
                        else next.add(layer.num);
                        return next;
                      })}
                      className="mt-2 flex w-fit items-center py-1 text-left text-[10px] font-normal text-[#71809a] transition-colors hover:text-[#102957] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--brand-coral))]"
                    >
                      <span>{isExpanded ? "Collapse ×" : "Expand +"}</span>
                    </button>
                    <div id={panelId} hidden={!isExpanded} className="mt-4 rounded-sm border border-[#cbd3e1] bg-white p-4">
                  <span className="mb-3 block text-[9px] font-bold uppercase tracking-[0.12em] text-[#647491]">Across IDAO</span>
                  <ul className="space-y-2">
                    {layer.examples.map((example) => (
                      <li key={example.stage} className="grid grid-cols-[78px_1fr] gap-3 text-[11.5px] leading-[1.45] text-[#405777]">
                        <strong className="text-[#7659df]">{example.stage}</strong>
                        <span>{example.text}</span>
                      </li>
                    ))}
                  </ul>
                    </div>
                  </>
                );
              })()}
              </div>
            );
          })}
        </div>
      </section>

      <section className="px-6 py-20 md:px-[4.8vw] lg:py-28" aria-labelledby="handover-heading">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-[8vw]">
          <div>
            <Kicker>{editorial.handover.kicker}</Kicker>
            <h2 id="handover-heading" className="mt-6 max-w-[780px] font-display text-[clamp(44px,6vw,84px)] font-semibold leading-[0.94] tracking-[-0.085em]">{editorial.handover.heading}</h2>
          </div>
          <div className="self-end border-t border-[#102957] pt-6 text-[16px] leading-[1.65] text-[#405777]">
            <p>{editorial.handover.firstParagraph}</p>
            <p className="mt-5">{editorial.handover.secondParagraph}</p>
            <a href={editorial.handover.cta.href} className="mt-7 inline-flex items-center gap-2 border-b border-[#102957] pb-2 text-sm font-bold hover:text-[hsl(var(--brand-pink))]">{editorial.handover.cta.label} <ArrowRight size={15} /></a>
          </div>
        </div>
      </section>
      <section className="bg-[#102957] px-6 py-20 text-white md:px-[4.8vw] lg:py-28">
        <Kicker inverse>{editorial.closingCta.kicker}</Kicker>
        <h2 className="mt-6 max-w-[950px] font-display text-[clamp(46px,7vw,102px)] font-semibold leading-[0.91] tracking-[-0.09em]">{editorial.closingCta.heading}</h2>
        <p className="mt-7 max-w-[640px] text-[17px] leading-[1.6] text-[#d6deed]">{editorial.closingCta.description}</p>
        <BrandButton href={editorial.closingCta.cta.href} variant="inverse" className="mt-9">{editorial.closingCta.cta.label}</BrandButton>
      </section>
    </article>
  );
}

export default function IDAOMethodology() {
  return <MethodologyCmsDelivery slug="idao"><IDAOMethodologyContent /></MethodologyCmsDelivery>;
}