import React, { useState } from "react";
import { ArrowRight, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "wouter";
import { BrandButton } from "@/components/ui/brand-button";
import { assetUrl } from "@/lib/assets";
import { useMarketStore, type Market } from "@/store/market";
import type { IndustryContent } from "@/content/industries";
import { projectIndustrySnapshotForMarket } from "@workspace/api-zod";
import { motion, AnimatePresence } from "framer-motion";

const SAUDI_EDUCATION_SOURCES: IndustryContent["sources"] = [
  { label: "National Strategy for Data and AI", publisher: "Saudi Data & AI Authority", kind: "Official source", url: "https://sdaia.gov.sa/en/SDAIA/SdaiaStrategies/Pages/NationalStrategyForDataAndAI.aspx" },
  { label: "Saudi Academic AI Qualifications Framework", publisher: "Saudi Data & AI Authority", kind: "Official source", url: "https://sdaia.gov.sa/en/Research/Pages/EducationIntelligence.aspx" },
];

const MARKET_LABELS: Record<string, string> = {
  uae: "UAE",
  ksa: "Saudi Arabia",
  turkiye: "Türkiye",
  europe: "Europe",
};

function isUaeSource(source: IndustryContent["sources"][number]) {
  return /\bUAE\b|United Arab Emirates/i.test(`${source.label} ${source.publisher}`);
}

function isSaudiSource(source: IndustryContent["sources"][number]) {
  return /\bSaudi\b/i.test(`${source.label} ${source.publisher}`);
}

export function resolveEducationMarketContent(view: IndustryContent, market: Market) {
  const marketLabel = MARKET_LABELS[market] ?? market.toUpperCase();
  const globalSources = view.sources.filter((source) => !isUaeSource(source) && !isSaudiSource(source));
  if (market === "uae") {
    return {
      label: marketLabel,
      regionalBody: view.gcc,
      convictionBody: "In the UAE, institutions can convert national ambition into talent, applied research and measurable public value.",
      supportingExample: "The UAE Ministry of Education’s NOVA initiative connects AI with unified workflows, decision insight and service improvement.",
      sources: view.sources.filter((source) => !isSaudiSource(source)),
    };
  }
  if (market === "ksa") {
    return {
      label: marketLabel,
      regionalBody: "Saudi Arabia can translate national AI ambition into talent, applied research and public value. Universities should treat agentic AI as a contribution to national capability—not only an efficiency agenda.",
      convictionBody: "In Saudi Arabia, institutions can convert national ambition into talent, applied research and measurable public value.",
      supportingExample: "Saudi Arabia’s Academic AI Qualifications Framework connects education pathways with the AI capabilities institutions and the national economy need.",
      sources: [...globalSources, ...SAUDI_EDUCATION_SOURCES],
    };
  }
  return {
    label: marketLabel,
    regionalBody: "Universities can translate national AI ambition into talent, applied research and public value. Agentic AI should contribute to national capability—not only an efficiency agenda.",
    convictionBody: "Institutions can convert national ambition into talent, applied research and measurable public value.",
    supportingExample: "A student-success agent can connect a permitted signal with timely support, coordinated action and an accountable outcome.",
    sources: globalSources,
  };
}

const SECTIONS = [
  { id: "convictions", label: "Convictions" },
  { id: "domains", label: "Domains" },
  { id: "applications", label: "Applications" },
  { id: "capabilities", label: "Capabilities" },
  { id: "roadmap", label: "Roadmap" },
  { id: "evidence", label: "Evidence" },
];

/**
 * Content revisions do not always change review metadata.  Keep the renderer
 * keyed to the projected payload itself so a CMS revision cannot retain a
 * selection that belongs to the previous edition.
 */
export function stableEducationContentSignature(content: unknown): string {
  const sortValue = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(sortValue);
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, nestedValue]) => [key, sortValue(nestedValue)]),
      );
    }
    return value;
  };

  return JSON.stringify(sortValue(content));
}

function safeSelectionIndex(selection: number, itemCount: number): number {
  return Number.isInteger(selection) && selection >= 0 && selection < itemCount ? selection : 0;
}

/* -------------------------------------------------------------------------- */
/* Sub-components for focused rendering                                       */
/* -------------------------------------------------------------------------- */

function TextSafeHero({ view, regional, isV2 }: { view: IndustryContent; regional: any; isV2: boolean }) {
  return (
    <section className="relative flex flex-col lg:block bg-[#fdfbf7]" aria-labelledby="education-title">
      {/* Mobile Image (stacked, reflows naturally) */}
      <div className="w-full h-[45vh] sm:h-[55vh] lg:hidden">
        <img 
          src={assetUrl(view.image)} 
          alt={view.imageAlt} 
          className="w-full h-full object-cover object-right" 
        />
      </div>
      
      {/* Desktop Background Image (spans right side) */}
      <div className="hidden lg:block absolute inset-0 w-full h-full z-0">
        <img 
          src={assetUrl(view.image)} 
          alt={view.imageAlt} 
          className="w-full h-full object-cover object-right" 
        />
      </div>

      {/* Text Safe Region */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-16 lg:py-32 flex items-center min-h-[50vh] lg:min-h-[85vh]">
        <div className="min-w-0 bg-[#fdfbf7]/95 backdrop-blur-md p-8 md:p-12 lg:p-16 max-w-3xl shadow-xl border border-[#cbd3e1]/50 rounded-lg lg:rounded-xl">
          <div data-testid="education-audience-label" className="flex items-center gap-3 text-xs uppercase tracking-[0.15em] font-bold mb-8 text-[#ff775d]">
             <span className="w-10 h-[2px] shrink-0 bg-gradient-to-r from-[#7659df] via-[#a92d73] to-[#ff775d]" />
             <span className="min-w-0 break-words">{regional.label} / {isV2 ? "Schools, Universities & Authorities" : "Higher education"}</span>
          </div>
          <h1 id="education-title" className="break-words font-display text-[#102957] text-4xl md:text-5xl lg:text-[4.5rem] leading-[1.05] tracking-tight mb-8">
            {view.thesis}
          </h1>
          <p className="break-words text-[#405677] text-xl md:text-[22px] leading-[1.6] font-light max-w-2xl">
            {view.dek}
          </p>
          <p data-testid="education-hero-caption" className="mt-6 break-words border-t border-[#cbd3e1] pt-4 text-sm leading-relaxed text-[#506583]">
            Illustration: {view.imageAlt}
          </p>
        </div>
      </div>
    </section>
  );
}

function StrategicShift({ pov, view, isV2 }: { pov: any; view: IndustryContent; isV2: boolean }) {
  if (isV2) {
    return (
      <section className="py-24 md:py-32 px-6 bg-[#fdfbf7]">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
           <div>
             <div className="flex items-center gap-3 text-xs uppercase tracking-[0.15em] font-bold mb-8 text-[#a92d73]">
               <span className="w-8 h-[2px] bg-gradient-to-r from-[#7659df] to-[#a92d73]" />
               The strategic shift
             </div>
             <p className="text-xl md:text-[22px] text-[#405677] leading-[1.8] font-light">
               {pov.introduction}
             </p>
           </div>
           <div className="border-l-4 border-[#ff775d] pl-8 md:pl-12 py-4">
             <p className="font-display text-3xl md:text-4xl lg:text-[40px] text-[#102957] leading-[1.3] tracking-tight">
               “{pov.strategicShift}”
             </p>
           </div>
        </div>
      </section>
    );
  }
  return (
    <section className="py-24 px-6 bg-[#071936] text-white">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.15em] font-bold mb-6 text-[#ff775d]">
            <span className="w-8 h-[2px] bg-[#ff775d]" />
            The strategic shift
          </div>
          <h2 className="font-display text-4xl md:text-6xl leading-tight">From isolated copilots to coordinated institutional action.</h2>
        </div>
        <p className="text-xl text-[#d7dfed] leading-relaxed">{view.opportunity}</p>
      </div>
    </section>
  );
}

function CapabilityLayerMap({ capabilities, safeCapability, onSelect, leadershipTest, isV2 }: { capabilities: any[]; safeCapability: number; onSelect: (i: number) => void; leadershipTest?: string; isV2: boolean }) {
  // We represent the 7 capabilities as a shared-layer map instead of an accordion
  // 0: Mission, 1: Learning, 2: Educator, 3: Governance, 4: Agent platform, 5: People, 6: Evidence
  
  const MapNode = ({ index, label, active, onClick, className = "" }: { index: number; label: string; active: boolean; onClick: () => void; className?: string }) => (
      <button
        type="button"
        data-testid={`education-capability-${index + 1}`}
        data-content-title={label}
        aria-pressed={active}
      onClick={onClick}
      className={`w-full text-left px-5 py-4 border-2 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff775d] ${
        active 
        ? "bg-[#102957] border-[#102957] text-white shadow-lg scale-[1.02]" 
        : "bg-white border-[#cbd3e1] text-[#102957] hover:border-[#7659df] hover:shadow-md"
      } ${className}`}
    >
      <div className={`text-[10px] font-bold tracking-widest mb-1 ${active ? "text-[#ff775d]" : "text-[#7659df]"}`}>0{index + 1}</div>
      <div className="font-display text-lg leading-tight">{label}</div>
    </button>
  );

  return (
    <section id="capabilities" className="py-24 md:py-32 px-6 bg-[#fdfbf7] scroll-mt-[156px] md:scroll-mt-[166px]">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.15em] font-bold mb-6 text-[#7659df]">
          <span className="w-8 h-[2px] bg-[#7659df]" />
          The target state
        </div>
        <h2 className="font-display text-4xl md:text-6xl leading-[1.1] tracking-tight text-[#102957] mb-8 max-w-4xl">
          {isV2 ? "One shared layer. Seven capabilities." : "One shared layer. Six capabilities."}
        </h2>
        <p className="text-xl text-[#506583] leading-relaxed font-light mb-16 max-w-3xl">
          A federated institutional layer supports specialised teaching, research, student-service and administrative agents without locking strategy to one product or provider.
        </p>
        
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Layer Map (Interactive) */}
          <div className="lg:col-span-6 flex flex-col gap-6">
            
            {/* Top Layer: Specialised Applications & Agency */}
            <div className="bg-[#eef0f5] p-6 rounded-xl border border-[#cbd3e1]/50">
              <div className="text-xs uppercase font-bold tracking-widest text-[#506583] mb-4 text-center">Specialised Applications & Agency</div>
              <div className="grid sm:grid-cols-2 gap-4">
                {capabilities[1] && <MapNode index={1} label={capabilities[1].title} active={safeCapability === 1} onClick={() => onSelect(1)} />}
                {capabilities[2] && <MapNode index={2} label={capabilities[2].title} active={safeCapability === 2} onClick={() => onSelect(2)} />}
              </div>
            </div>

            {/* Middle Layer: Federated Platform & Governance */}
            <div className="bg-[#eef0f5] p-6 rounded-xl border border-[#cbd3e1]/50">
              <div className="text-xs uppercase font-bold tracking-widest text-[#506583] mb-4 text-center">Federated Platform Layer</div>
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                {capabilities[3] && <MapNode index={3} label={capabilities[3].title} active={safeCapability === 3} onClick={() => onSelect(3)} />}
                {capabilities[5] && <MapNode index={5} label={capabilities[5].title} active={safeCapability === 5} onClick={() => onSelect(5)} />}
              </div>
              {capabilities[4] && <MapNode index={4} label={capabilities[4].title} active={safeCapability === 4} onClick={() => onSelect(4)} />}
            </div>

            {/* Base Layer: Mission & Evidence */}
            <div className="bg-[#eef0f5] p-6 rounded-xl border border-[#cbd3e1]/50">
              <div className="text-xs uppercase font-bold tracking-widest text-[#506583] mb-4 text-center">Strategic Foundation</div>
              <div className="grid sm:grid-cols-2 gap-4">
                {capabilities[0] && <MapNode index={0} label={capabilities[0].title} active={safeCapability === 0} onClick={() => onSelect(0)} />}
                {capabilities[6] && <MapNode index={6} label={capabilities[6].title} active={safeCapability === 6} onClick={() => onSelect(6)} />}
              </div>
            </div>

          </div>
          
          {/* Reading Pane (Normal Flow / Sticky) */}
          <div className="lg:col-span-6 lg:sticky lg:top-32">
            <AnimatePresence mode="wait">
              <motion.div 
                key={safeCapability}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                data-testid="education-capabilities-detail"
                data-selected-title={capabilities[safeCapability]?.title}
                className="bg-white p-8 md:p-12 border border-[#cbd3e1] rounded-2xl shadow-xl border-t-4 border-t-[#a92d73]"
              >
                <div className="text-[12px] font-bold tracking-widest uppercase mb-4 text-[#a92d73]">
                  Capability 0{safeCapability + 1}
                </div>
                <h3 className="font-display text-3xl md:text-4xl text-[#102957] mb-6 leading-tight">
                  {capabilities[safeCapability]?.title}
                </h3>
                <p className="text-[17px] text-[#405677] leading-[1.7]">
                  {capabilities[safeCapability]?.body}
                </p>
              </motion.div>
            </AnimatePresence>

            {isV2 && leadershipTest && (
              <aside className="mt-8 bg-[#eef0f5] p-8 border-l-4 border-[#ff775d] rounded-r-xl">
                <div className="text-[10px] uppercase font-bold tracking-widest text-[#ff775d] mb-3">Leadership test</div>
                <p className="font-display text-xl text-[#102957] leading-snug">{leadershipTest}</p>
              </aside>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function RoadmapTimeline({ roadmap, safeHorizon, onSelect, leadershipTest, isV2 }: { roadmap: any[]; safeHorizon: number; onSelect: (i: number) => void; leadershipTest?: string; isV2: boolean }) {
  if (!roadmap || roadmap.length === 0) return null;

  return (
    <section id="roadmap" className="py-24 md:py-32 px-6 bg-[#eef0f5] scroll-mt-[156px] md:scroll-mt-[166px]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 md:mb-20">
          <div className="flex justify-center items-center gap-3 text-xs uppercase tracking-[0.15em] font-bold mb-6 text-[#ff775d]">
            <span className="w-8 h-[2px] bg-[#ff775d]" />
            A practical sequence
          </div>
          <h2 className="font-display text-4xl md:text-6xl leading-[1.1] tracking-tight text-[#102957]">
            Establish. Build. Scale.
          </h2>
        </div>

        {/* Timeline Interactive (Normal Flow details to avoid absolute positioning fragility) */}
        <div className="flex flex-col gap-8 md:gap-12">
          {/* The Timeline Bar */}
          <div className="relative">
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-[2px] bg-[#cbd3e1] -translate-y-1/2 z-0" />
            <div className="grid md:grid-cols-3 gap-6 relative z-10">
              {roadmap.map((step, index) => {
                const isSelected = safeHorizon === index;
                return (
                  <button
                    key={step.horizon}
                    type="button"
                    data-testid={`education-roadmap-${index + 1}`}
                    data-content-title={step.title}
                    aria-pressed={isSelected}
                    onClick={() => onSelect(index)}
                    className={`flex flex-col items-start md:items-center text-left md:text-center p-6 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff775d] bg-white rounded-xl border-2 ${
                      isSelected 
                      ? "border-[#a92d73] shadow-lg md:-translate-y-2" 
                      : "border-transparent shadow-sm hover:border-[#7659df] opacity-80 hover:opacity-100"
                    }`}
                  >
                    <div className={`font-display text-sm md:text-base font-bold tracking-widest uppercase mb-3 ${
                      isSelected ? "text-[#a92d73]" : "text-[#7659df]"
                    }`}>
                      {step.horizon}
                    </div>
                    <h3 className="font-display text-2xl text-[#102957] leading-tight mb-0">
                      {step.title}
                    </h3>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Details Pane (Normal Flow) */}
          <AnimatePresence mode="wait">
            <motion.div 
              key={safeHorizon}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              data-testid="education-timeline-panel"
              data-selected-title={roadmap[safeHorizon].title}
              className="bg-white p-8 md:p-12 border-t-4 border-[#a92d73] shadow-xl rounded-xl w-full"
            >
              <h4 className="font-display text-2xl md:text-3xl text-[#102957] mb-6">{roadmap[safeHorizon].title} detail</h4>
              <p className="text-[17px] md:text-lg text-[#506583] leading-[1.7] max-w-4xl">
                {roadmap[safeHorizon].body}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {!isV2 && leadershipTest && (
          <aside className="mt-16 bg-white p-8 border-l-4 border-[#ff775d] max-w-3xl mx-auto text-center md:text-left rounded-r-xl shadow-sm">
            <div className="text-[10px] uppercase font-bold tracking-widest text-[#ff775d] mb-3">Leadership test</div>
            <p className="font-display text-2xl text-[#102957] leading-snug">{leadershipTest}</p>
          </aside>
        )}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Main Education Page View                                                   */
/* -------------------------------------------------------------------------- */

export function EducationEditorialView({ view: rawView, marketOverride }: { view: IndustryContent; marketOverride?: Market }) {
  const { market: selectedMarket } = useMarketStore();
  const market = marketOverride ?? selectedMarket;
  const view = projectIndustrySnapshotForMarket({ content: rawView }, market).content as IndustryContent;
  const pov = view.educationPov as NonNullable<IndustryContent["educationPov"]> & { 
    version?: 2; 
    introduction?: string; 
    strategicShift?: string; 
    patternQuote?: string; 
    globalDirection?: string; 
    applications?: { title: string; items: { title: string; body: string; sourceUrls: string[]; market?: string; }[]; }[];
  };
  
  if (!pov) return null;

  return (
    <EducationEditorialContent
      key={`${market}:${stableEducationContentSignature(view)}`}
      view={view}
      market={market}
      pov={pov}
    />
  );
}

function EducationEditorialContent({
  view,
  market,
  pov,
}: {
  view: IndustryContent;
  market: Market;
  pov: NonNullable<IndustryContent["educationPov"]> & {
    version?: 2;
    introduction?: string;
    strategicShift?: string;
    patternQuote?: string;
    globalDirection?: string;
    applications?: { title: string; items: { title: string; body: string; sourceUrls: string[]; market?: string; }[]; }[];
  };
}) {

  const isV2 = pov.version === 2;
  const regional = resolveEducationMarketContent(view, market);

  // Apply legacy overrides for V1, otherwise use V2 content directly
  const convictions = isV2
    ? pov.convictions
    : pov.convictions.map((item, index) =>
        index === pov.convictions.length - 1
          ? { ...item, body: regional.convictionBody }
          : item
      );

  const valueDomains = isV2
    ? pov.valueDomains
    : pov.valueDomains.map((item, index) =>
        index === pov.valueDomains.length - 1
          ? { ...item, examples: item.examples.map((example, exampleIndex) => exampleIndex === item.examples.length - 1 ? regional.supportingExample : example) }
          : item
      );

  const signals = pov.signals;
  const applications = isV2 && pov.applications ? pov.applications : [];
  const sources = isV2 ? view.sources : regional.sources;

  // The keyed parent remounts this state synchronously for every projected
  // content revision and market edition.
  const [selectedDomain, setSelectedDomain] = useState(0);
  const [selectedAppGroup, setSelectedAppGroup] = useState(0);
  const [selectedCapability, setSelectedCapability] = useState(0);
  const [selectedHorizon, setSelectedHorizon] = useState(0);
  const [expandedEvidence, setExpandedEvidence] = useState<Record<number, boolean>>({});

  // Guard every reading pane in the same render as its selection. This avoids
  // stale/out-of-range reads while a projected CMS payload is being replaced.
  const safeDomain = safeSelectionIndex(selectedDomain, valueDomains.length);
  const safeAppGroup = safeSelectionIndex(selectedAppGroup, applications.length);
  const safeCapability = safeSelectionIndex(selectedCapability, pov.targetState.length);
  const safeHorizon = safeSelectionIndex(selectedHorizon, pov.roadmap?.length ?? 0);
  const sections = isV2 && applications.length > 0
    ? SECTIONS
    : SECTIONS.filter((section) => section.id !== "applications");

  const toggleEvidence = (index: number) => {
    setExpandedEvidence(prev => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <main className="bg-[#fdfbf7] text-[#102957] font-sans selection:bg-[#7659df]/20 edu">
      
      {/* Shell is 72px on small screens and 82px from md upward. */}
      <nav aria-label="Education sections" className="sticky top-[72px] md:top-[82px] z-40 bg-[#fdfbf7]/95 backdrop-blur-md border-b border-[#cbd3e1] px-6 py-4 flex gap-6 overflow-x-auto shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center gap-6 w-full min-w-max">
          <span className="font-display font-bold text-[#102957] mr-4 whitespace-nowrap shrink-0">Cognirise Education</span>
          {sections.map(s => (
            <a key={s.id} href={`#${s.id}`} className="text-sm font-semibold text-[#506583] hover:text-[#ff775d] transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff775d] rounded">
              {s.label}
            </a>
          ))}
        </div>
      </nav>

      <TextSafeHero view={view} regional={regional} isV2={isV2} />
      
      <StrategicShift pov={pov} view={view} isV2={isV2} />

      {/* Convictions */}
      <section id="convictions" className="py-24 md:py-32 px-6 bg-[#eef0f5] scroll-mt-[156px] md:scroll-mt-[166px]">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-20">
            <div className="lg:col-span-5">
              <div className="sticky top-32">
                <div className="flex items-center gap-3 text-xs uppercase tracking-[0.15em] font-bold mb-6 text-[#7659df]">
                  <span className="w-8 h-[2px] bg-[#7659df]" />
                  Five convictions
                </div>
                <h2 className="font-display text-4xl md:text-6xl leading-[1.1] tracking-tight text-[#102957] mb-8">
                  {isV2 ? "Lead with educational purpose." : "Lead as a university."}
                </h2>
                <p className="text-xl text-[#506583] leading-relaxed font-light">
                  Academic mission and human purpose set the direction. Technology, operating design and assurance make that direction executable.
                </p>
              </div>
            </div>
            <div className="lg:col-span-7 flex flex-col gap-12 md:gap-16">
              {convictions.map((item, index) => (
                <article key={item.title} className="flex gap-6 md:gap-8 group">
                  <div className="text-3xl md:text-4xl font-display text-[#cbd3e1] group-hover:text-[#a92d73] transition-colors shrink-0">
                    0{index + 1}
                  </div>
                  <div>
                    <h3 className="font-display text-2xl md:text-[28px] leading-tight text-[#102957] mb-4">
                      {item.title}
                    </h3>
                    <p className="text-[17px] text-[#506583] leading-[1.7]">
                      {item.body}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Domain Explorer */}
      <section id="domains" className="py-24 md:py-32 px-6 bg-[#fdfbf7] scroll-mt-[156px] md:scroll-mt-[166px]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24">
            <div className="flex justify-center items-center gap-3 text-xs uppercase tracking-[0.15em] font-bold mb-6 text-[#a92d73]">
              <span className="w-8 h-[2px] bg-[#a92d73]" />
              Where value becomes tangible
            </div>
            <h2 className="font-display text-4xl md:text-6xl leading-[1.1] tracking-tight text-[#102957] mb-6">
              Redesign complete institutional journeys.
            </h2>
            <p className="text-xl text-[#506583] font-light">
              The strongest opportunities connect specialist assistance with trusted context, core systems and accountable people.
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-8 lg:gap-16 items-start">
            <div className="lg:col-span-4 flex flex-col gap-2">
              {valueDomains.map((domain, index) => (
                <button
                  key={domain.title}
                  type="button"
                  data-testid={`education-domain-${index + 1}`}
                  data-content-title={domain.title}
                  aria-pressed={safeDomain === index}
                  onClick={() => setSelectedDomain(index)}
                  className={`text-left px-6 py-5 border-l-4 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff775d] ${
                    safeDomain === index 
                    ? "border-[#ff775d] bg-[#071936] text-white shadow-lg scale-[1.02]" 
                    : "border-transparent hover:bg-[#eef0f5] text-[#102957]"
                  }`}
                >
                  <span className={`text-[10px] font-bold tracking-widest block mb-1 ${safeDomain === index ? 'text-[#ff775d]' : 'text-[#7659df]'}`}>
                    0{index + 1}
                  </span>
                  <h3 className="font-display text-xl md:text-2xl">{domain.title}</h3>
                </button>
              ))}
            </div>
            
            <div className="lg:col-span-8 bg-[#eef0f5] p-8 md:p-12 min-h-[500px] flex flex-col rounded-xl border border-[#cbd3e1]/50">
              <AnimatePresence mode="wait">
                <motion.div
                  key={safeDomain}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  data-testid="education-journey-panel"
                  data-selected-title={valueDomains[safeDomain].title}
                  className="flex flex-col h-full"
                >
                  <div className="grid lg:grid-cols-[minmax(0,1.2fr)_minmax(15rem,.8fr)] gap-8 mb-8">
                    <div>
                      <h3 className="font-display text-3xl md:text-4xl text-[#102957] mb-6">
                        {valueDomains[safeDomain].title}
                      </h3>
                      <p className="text-xl text-[#405677] leading-[1.7] font-light max-w-2xl">
                        {valueDomains[safeDomain].body}
                      </p>
                    </div>
                    <figure className="self-start">
                      <img
                        src={assetUrl(pov.imagery?.educatorPractice?.src || view.image)}
                        alt={pov.imagery?.educatorPractice?.altText || view.imageAlt}
                        className="aspect-[4/3] w-full rounded-lg object-cover shadow-md"
                      />
                      <figcaption className="mt-3 text-xs leading-relaxed text-[#506583]">
                        {pov.imagery?.educatorPractice?.altText || view.imageAlt}
                      </figcaption>
                    </figure>
                  </div>
                  
                  <div className="mt-auto">
                    <h4 className="text-xs uppercase font-bold tracking-[0.15em] text-[#a92d73] mb-4">Examples in practice</h4>
                    <ul className="grid md:grid-cols-2 gap-4">
                      {valueDomains[safeDomain].examples.map((ex, i) => (
                        <li key={i} className="flex gap-3 text-[#102957] text-[15px] leading-relaxed">
                          <ArrowRight size={16} className="shrink-0 mt-1 text-[#ff775d]" />
                          <span>{ex}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* Applications */}
      {isV2 && applications.length > 0 && (
        <section id="applications" className="py-24 md:py-32 px-6 bg-[#071936] text-white scroll-mt-[156px] md:scroll-mt-[166px]">
          <div className="max-w-7xl mx-auto">
            <div className="mb-16">
              <div className="flex items-center gap-3 text-xs uppercase tracking-[0.15em] font-bold mb-6 text-[#ff775d]">
                <span className="w-8 h-[2px] bg-gradient-to-r from-[#a92d73] to-[#ff775d]" />
                Tangible Applications
              </div>
              <h2 className="font-display text-4xl md:text-6xl leading-[1.1] tracking-tight mb-8">
                Specialist assistance in practice.
              </h2>
              
              <div className="flex flex-wrap gap-4 mt-12">
                {applications.map((group, index) => (
                  <button
                    key={group.title}
                    type="button"
                    data-testid={`education-application-group-${index + 1}`}
                    data-content-title={group.title}
                    aria-pressed={safeAppGroup === index}
                    onClick={() => setSelectedAppGroup(index)}
                    className={`px-6 py-3 font-display text-lg md:text-xl rounded-full border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff775d] ${
                      safeAppGroup === index
                      ? "bg-[#ff775d] border-[#ff775d] text-white shadow-[0_0_20px_rgba(255,119,93,0.3)]"
                      : "border-[#ffffff30] text-[#d7dfed] hover:border-[#ffffff60] hover:bg-[#ffffff10]"
                    }`}
                  >
                    {group.title}
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={safeAppGroup}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                data-testid="education-applications-detail"
                data-selected-title={applications[safeAppGroup].title}
                className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {applications[safeAppGroup].items.map((item) => (
                  <article key={item.title} className="bg-[#102957] p-8 border border-[#ffffff15] flex flex-col hover:border-[#a92d73]/50 transition-colors rounded-xl">
                    <h4 className="font-display text-2xl text-white mb-4 leading-snug">{item.title}</h4>
                    <p className="text-[#d7dfed] text-base leading-[1.6] mb-8 font-light">{item.body}</p>
                    <div className="mt-auto flex gap-3 pt-6 border-t border-[#ffffff15]">
                      {item.sourceUrls.map((url, i) => (
                        <a 
                          href={url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="flex items-center justify-center w-10 h-10 rounded-full bg-[#071936] text-[#ff775d] hover:bg-[#ff775d] hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff775d] focus-visible:ring-offset-2 focus-visible:ring-offset-[#102957]"
                          aria-label={`${item.title} source ${i + 1}`} 
                          key={url}
                        >
                          <ExternalLink size={16} aria-hidden="true" />
                        </a>
                      ))}
                    </div>
                  </article>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </section>
      )}

      {/* Pattern Quote */}
      {isV2 && pov.patternQuote && (
        <section className="py-24 px-6 bg-[#7659df] text-white relative">
          <div className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none">
             <img src={assetUrl(pov.imagery?.researchCoordination?.src || view.image)} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="max-w-5xl mx-auto text-center relative z-10">
            <h2 className="font-display text-3xl md:text-5xl leading-[1.3] tracking-tight">“{pov.patternQuote}”</h2>
          </div>
        </section>
      )}

      <CapabilityLayerMap 
        capabilities={pov.targetState} 
        safeCapability={safeCapability} 
        onSelect={setSelectedCapability} 
        leadershipTest={pov.leadershipTest}
        isV2={isV2}
      />

      {/* Global Direction */}
      {isV2 && pov.globalDirection && (
        <section className="py-20 px-6 bg-[#102957] text-white text-center">
          <div className="max-w-4xl mx-auto">
            <div className="text-[10px] uppercase font-bold tracking-widest text-[#cbd3e1] mb-6">Global Direction</div>
            <p className="font-display text-2xl md:text-4xl leading-tight font-light">{pov.globalDirection}</p>
          </div>
        </section>
      )}

      {/* Regional (for V1 only) */}
      {!isV2 && (
        <section className="py-24 px-6 bg-gradient-to-br from-[#7659df] to-[#db509e] text-white">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="flex items-center gap-3 text-xs uppercase tracking-[0.15em] font-bold mb-6 text-[#fdfbf7]">
                <span className="w-8 h-[2px] bg-white" />
                {regional.label}
              </div>
              <h2 className="font-display text-4xl md:text-6xl leading-tight">Turn national ambition into institutional capability.</h2>
            </div>
            <p className="text-xl md:text-2xl leading-relaxed">{regional.regionalBody}</p>
          </div>
        </section>
      )}

      <RoadmapTimeline 
        roadmap={pov.roadmap} 
        safeHorizon={safeHorizon} 
        onSelect={setSelectedHorizon} 
        leadershipTest={pov.leadershipTest}
        isV2={isV2} 
      />

      {/* Evidence */}
      <section id="evidence" className="py-24 md:py-32 px-6 bg-[#fdfbf7] scroll-mt-[156px] md:scroll-mt-[166px] border-t border-[#cbd3e1]">
        <div className="max-w-5xl mx-auto">
          <div className="mb-16">
            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.15em] font-bold mb-6 text-[#7659df]">
              <span className="w-8 h-[2px] bg-[#7659df]" />
              Institutional signals
            </div>
            <h2 className="font-display text-4xl md:text-5xl leading-[1.1] tracking-tight text-[#102957] mb-6">
              What leading institutions make visible.
            </h2>
            <p className="text-lg text-[#506583] font-light italic max-w-3xl">
              These external examples are not Cognirise client work. Preliminary and institution-reported evidence is identified in the description.
            </p>
          </div>

          <div className="border-t-2 border-[#102957]">
            {signals.map((item, index) => {
              const isExpanded = expandedEvidence[index];
              return (
                <div key={item.institution} className="border-b border-[#cbd3e1]">
                  <button 
                    type="button"
                    data-testid={`education-evidence-${index + 1}`}
                    aria-expanded={isExpanded}
                    onClick={() => toggleEvidence(index)}
                    className="w-full py-6 md:py-8 flex flex-col md:flex-row md:items-start gap-4 md:gap-8 text-left hover:bg-[#eef0f5]/50 transition-colors px-4 -mx-4 md:mx-0 md:px-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff775d]"
                  >
                    <div className="md:w-1/3 shrink-0">
                      <h3 className="font-display text-xl md:text-2xl text-[#102957] font-bold">{item.institution}</h3>
                    </div>
                    <div className="md:w-2/3 flex items-start justify-between gap-6 w-full">
                      <p className="text-lg text-[#405677] leading-relaxed m-0 flex-1">{item.signal}</p>
                      <div className="shrink-0 mt-1">
                        {isExpanded ? <ChevronUp size={24} className="text-[#a92d73]" /> : <ChevronDown size={24} className="text-[#7659df]" />}
                      </div>
                    </div>
                  </button>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pb-8 pt-2 md:pl-[calc(33.333%+2rem)] px-4 -mx-4 md:mx-0 md:px-0">
                          <div className="bg-[#eef0f5] p-6 rounded-lg border-l-4 border-[#ff775d]">
                            <h4 className="text-xs uppercase font-bold tracking-[0.1em] text-[#102957] mb-2">Implication</h4>
                            <p className="text-[#506583] text-[15px] leading-relaxed mb-6">{item.implication}</p>
                            
                            <h4 className="text-xs uppercase font-bold tracking-[0.1em] text-[#102957] mb-3">Sources</h4>
                            <div className="flex flex-wrap gap-3">
                              {item.sourceUrls.map((url, i) => (
                                <a 
                                  href={url} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="inline-flex items-center gap-2 text-sm bg-white text-[#7659df] px-4 py-2 rounded-full border border-[#cbd3e1] hover:border-[#7659df] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff775d]"
                                  key={url}
                                >
                                  <span>View Source {item.sourceUrls.length > 1 ? i + 1 : ''}</span>
                                  <ExternalLink size={14} aria-hidden="true" />
                                </a>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          <div className="mt-20">
            <h3 className="font-display text-2xl text-[#102957] mb-8">Read the sources behind this view.</h3>
            <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
              {sources.map((source) => (
                <a 
                  className="group flex items-start gap-4 p-4 border border-[#cbd3e1] rounded-lg hover:border-[#7659df] hover:bg-white transition-all bg-[#eef0f5]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff775d]" 
                  href={source.url} 
                  target="_blank" 
                  rel="noreferrer" 
                  key={source.url}
                >
                  <div className="shrink-0 mt-1 text-[#a92d73] group-hover:text-[#ff775d] transition-colors">
                    <ExternalLink size={18} aria-hidden="true" />
                  </div>
                  <div>
                    <strong className="block text-[#102957] font-semibold text-[15px] mb-1 group-hover:text-[#7659df] transition-colors">{source.label}</strong>
                    <span className="block text-[#506583] text-[13px]">{source.publisher} &middot; {source.kind}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 md:py-32 px-6 bg-[#071936] text-white">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-16 items-end">
          <div className="lg:col-span-8">
            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.15em] font-bold mb-6 text-[#ff775d]">
              <span className="w-8 h-[2px] bg-[#ff775d]" />
              A practical first move
            </div>
            <h2 className="font-display text-5xl md:text-7xl leading-[1.05] tracking-tight mb-8">
              {view.service.firstMove}
            </h2>
            <p className="text-xl text-[#d7dfed] leading-[1.7] max-w-2xl font-light">
              For schools, universities, school networks and education authorities: bring educational, research, service, technology and transformation owners around one journey. Start with a measurable redesign and a route from evidence-backed practice to institution-wide capability.
            </p>
          </div>
          <div className="lg:col-span-4 flex flex-col items-start lg:items-end gap-8">
            <div className="w-full max-w-sm p-8 bg-[#102957] border-l-4 border-[#ff775d] rounded-r-lg">
              <Link href={view.service.href} className="flex items-center gap-3 text-[#ff775d] hover:text-white transition-colors font-bold text-lg mb-8 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded">
                Connect capabilities <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <BrandButton href="/value-scan" className="w-full justify-center py-4 text-lg">
                Start a Value Scan
              </BrandButton>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
