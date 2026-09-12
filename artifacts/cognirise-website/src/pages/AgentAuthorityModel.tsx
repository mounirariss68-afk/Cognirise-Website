import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { FrameworkContent } from "@workspace/api-zod";
import { AgentAuthorityAssessment } from "@/components/AgentAuthorityAssessment";
import { BrandButton } from "@/components/ui/brand-button";
import { PulseImage } from "@/components/ui/pulse-image";
import { assetUrl } from "@/lib/assets";
import { cmsMediaObjectPosition, type CmsRecord, cmsEntryRenderPolicy, contentRecord, resolveCmsMedia, text, useCmsEntry } from "@/lib/cms";
import { metadataFromSeo, useDynamicMetadata } from "@/lib/metadata";
import {
  type HScore,
  type RScore,
  OVERSIGHT_LABELS,
  REACH_LABELS,
  REVERSIBILITY_LABELS,
  getCeiling,
  getEBand,
} from "@/lib/agent-authority";

const COMPILED = {
  title: "The Agent Authority Model",
  teaser: "A deterministic way to set how much authority each agent handover may exercise on its own.",
  handoverExplanation:
    "Govern the handover, not the agent. Knowledge, Decision, and Action describe individual moments when an agent passes something to a person, another agent, or a system. One agent can make several handovers, and each can carry a different exposure and authority ceiling.",
};

const HANDOVERS = [
  {
    type: "Knowledge",
    rule: "Someone simply knows more.",
    example: "A telecom care agent answers a tariff question.",
  },
  {
    type: "Decision",
    rule: "It fixes an outcome for a specific case or person that something downstream acts on.",
    example: "The same agent scores churn risk.",
  },
  {
    type: "Action",
    rule: "A record, system, or physical thing is different after it runs.",
    example: "The same agent applies a retention credit.",
  },
] as const;

const EXPOSURE = [
  ["E1", "R1–R2 and H1", "Out of the loop"],
  ["E2", "R3, or H2", "On the loop, with a stated intervention window"],
  ["E3", "R4, or H3", "In the loop"],
  ["E4", "H4", "In the loop + independent second control"],
  ["E5", "H5", "In the loop + external safety sign-off"],
] as const;

const SECTOR_EXAMPLES = [
  {
    sector: "Financial services",
    example: "Credit decline + adverse-action reason",
    type: "Decision",
    band: "E3",
    authority: "In the loop",
  },
  {
    sector: "Telecoms",
    example: "RAN sleep-mode change",
    type: "Action",
    band: "E2",
    authority: "On the loop",
  },
  {
    sector: "Travel",
    example: "Trip recommendation",
    type: "Knowledge",
    band: "E1",
    authority: "Out of the loop",
  },
  {
    sector: "Energy",
    example: "Wildfire ignition alert to dispatch",
    type: "Decision",
    band: "E4",
    authority: "Above-ceiling operation needs an approved dispatch protocol",
  },
] as const;

const COMPILED_SOURCES = [
  {
    label: "EU AI Act, Article 14 — Human oversight",
    url: "https://eur-lex.europa.eu/eli/reg/2024/1689/oj",
  },
  {
    label: "NIST AI Risk Management Framework",
    url: "https://www.nist.gov/itl/ai-risk-management-framework",
  },
  {
    label: "Parasuraman, Sheridan & Wickens — Levels of human interaction with automation",
    url: "https://doi.org/10.1109/3468.844354",
  },
] as const;

function Kicker({ children, inverse = false }: { children: React.ReactNode; inverse?: boolean }) {
  return (
    <div className={`flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.13em] ${inverse ? "text-white/75" : "text-[#102957]"}`}>
      <span className="h-[2px] w-[23px] bg-gradient-to-r from-[hsl(var(--brand-violet))] via-[hsl(var(--brand-pink))] to-[hsl(var(--brand-coral))]" />
      {children}
    </div>
  );
}

function GovernedNarrative({ blocks }: { blocks: FrameworkContent["methodology"] }) {
  return (
    <div className="mt-10 border-l-2 border-[hsl(var(--brand-pink))] pl-6">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return <h3 key={index} className="mt-7 first:mt-0 font-display text-2xl font-semibold tracking-[-0.04em]">{block.text}</h3>;
        }
        if (block.type === "list") {
          return <ul key={index} className="mt-4 list-disc space-y-2 pl-5 text-sm leading-[1.6] text-[#405777]">{(Array.isArray(block.items) ? block.items : []).map((item) => <li key={item}>{item}</li>)}</ul>;
        }
        if (block.type === "quote") {
          return <blockquote key={index} className="mt-4 text-lg font-semibold leading-[1.55] text-[#30486d]">{block.text}</blockquote>;
        }
        return <p key={index} className="mt-4 text-sm leading-[1.65] text-[#405777]">{block.text}</p>;
      })}
    </div>
  );
}

function MatrixExplorer() {
  const [selected, setSelected] = useState<{ r: RScore; h: HScore }>({ r: 3, h: 2 });
  const chartScrollRef = useRef<HTMLDivElement>(null);
  const band = getEBand(selected.r, selected.h);
  const ceiling = getCeiling(band);
  const exposureColumns = [
    { band: 1, rule: "R1–R2 and H1", meaning: "Internal, reversible" },
    { band: 2, rule: "R3, or H2", meaning: "One person is affected" },
    { band: 3, rule: "R4, or H3", meaning: "A regulator can see it" },
    { band: 4, rule: "H4", meaning: "Public reach" },
    { band: 5, rule: "H5", meaning: "Safety, health, or essential service" },
  ] as const;
  const authorityRows = [
    { title: "Human out of the loop", detail: "No one present" },
    { title: "Human on the loop", detail: "Monitored and can be stopped" },
    { title: "Human in the loop", detail: "Approved before it acts" },
  ] as const;
  const selectedCeilingRow = band === 1 ? 0 : band === 2 ? 1 : 2;

  const moveAxis = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    axis: "r" | "h",
    value: number,
  ) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const delta = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
    const maximum = axis === "r" ? 4 : 5;
    const next = Math.min(maximum, Math.max(1, value + delta));
    setSelected((current) => ({
      ...current,
      [axis]: next,
    }));
    document.querySelector<HTMLButtonElement>(`[data-authority-score="${axis}${next}"]`)?.focus();
  };

  useEffect(() => {
    const keepSelectedBandVisible = () => {
      const container = chartScrollRef.current;
      if (!container || container.scrollWidth <= container.clientWidth) return;
      const authorityAxisWidth = 174;
      const plotWidth = container.scrollWidth - authorityAxisWidth;
      const selectedCenter = authorityAxisWidth + ((band - 0.5) / 5) * plotWidth;
      const visiblePlotCenter = authorityAxisWidth + (container.clientWidth - authorityAxisWidth) / 2;
      container.scrollLeft = Math.max(0, selectedCenter - visiblePlotCenter);
    };
    keepSelectedBandVisible();
    window.addEventListener("resize", keepSelectedBandVisible);
    return () => window.removeEventListener("resize", keepSelectedBandVisible);
  }, [band]);

  return (
    <figure
      id="authority-diagram"
      className="border border-white/15 bg-[#0b2247] p-5 sm:p-7 lg:p-9"
      aria-labelledby="authority-diagram-title"
      aria-describedby="authority-diagram-description"
    >
      <figcaption className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
        <div>
          <p id="authority-diagram-title" className="font-display text-[clamp(25px,3vw,38px)] font-semibold tracking-[-0.05em] text-white">
            Exposure sets the ceiling.
          </p>
          <p id="authority-diagram-description" className="mt-2 max-w-[510px] text-sm leading-[1.6] text-[#b9c7db]">
            Set reversibility and reach. Their more severe result places the handover on the horizontal axis; the
            stepped line shows the most authority the agent may hold.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div role="group" aria-label="Reversibility score" className="border border-white/15 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/60">Reversibility</span>
              <span className="text-[10px] text-white">R{selected.r}</span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {([1, 2, 3, 4] as RScore[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  data-authority-score={`r${r}`}
                  aria-pressed={selected.r === r}
                  aria-label={`R${r}: ${REVERSIBILITY_LABELS[r]}`}
                  onClick={() => setSelected((current) => ({ ...current, r }))}
                  onKeyDown={(event) => moveAxis(event, "r", r)}
                  className={`min-h-10 border text-xs font-bold motion-safe:transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-coral))] ${
                    selected.r === r ? "border-white bg-white text-[#102957]" : "border-white/20 bg-white/5 text-white hover:bg-white/10"
                  }`}
                >
                  R{r}
                </button>
              ))}
            </div>
            <p className="mt-2 min-h-8 text-[10px] leading-[1.4] text-white/55">{REVERSIBILITY_LABELS[selected.r]}</p>
          </div>

          <div role="group" aria-label="Reach score" className="border border-white/15 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/60">Reach</span>
              <span className="text-[10px] text-white">H{selected.h}</span>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {([1, 2, 3, 4, 5] as HScore[]).map((h) => (
                <button
                  key={h}
                  type="button"
                  data-authority-score={`h${h}`}
                  aria-pressed={selected.h === h}
                  aria-label={`H${h}: ${REACH_LABELS[h]}`}
                  onClick={() => setSelected((current) => ({ ...current, h }))}
                  onKeyDown={(event) => moveAxis(event, "h", h)}
                  className={`min-h-10 border text-xs font-bold motion-safe:transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-coral))] ${
                    selected.h === h ? "border-white bg-white text-[#102957]" : "border-white/20 bg-white/5 text-white hover:bg-white/10"
                  }`}
                >
                  H{h}
                </button>
              ))}
            </div>
            <p className="mt-2 min-h-8 text-[10px] leading-[1.4] text-white/55">{REACH_LABELS[selected.h]}</p>
          </div>
        </div>
      </figcaption>

      <div ref={chartScrollRef} className="mt-8 overflow-x-auto pb-3" data-authority-chart-scroll>
        <div className="min-w-[790px]">
          <div className="mb-2 ml-[174px] flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.12em]">
            <span className="text-white/55">How alone it acts ↑</span>
            <span className="text-[#ffad9d]">Above the ceiling: authority sits in an approved artefact</span>
          </div>

          <div className="grid grid-cols-[158px_1fr] gap-4">
            <div className="sticky left-0 z-20 grid h-[300px] grid-rows-3 bg-[#0b2247]">
              {authorityRows.map((row) => (
                <div key={row.title} className="flex flex-col justify-center border-b border-white/15 pr-3 text-right last:border-b-0">
                  <strong className="text-[11px] text-white">{row.title}</strong>
                  <span className="mt-1 text-[9px] leading-[1.35] text-white/50">{row.detail}</span>
                </div>
              ))}
            </div>

            <div className="relative h-[300px] border border-white/35" aria-label="Authority ceiling by exposure band">
              <div className="absolute inset-0 grid grid-cols-5 grid-rows-3">
                {authorityRows.flatMap((_, rowIndex) =>
                  exposureColumns.map(({ band: columnBand }) => {
                    const ceilingRow = columnBand === 1 ? 0 : columnBand === 2 ? 1 : 2;
                    const permitted = rowIndex >= ceilingRow;
                    return (
                      <div
                        key={`${rowIndex}-${columnBand}`}
                        className={`border-b border-r border-white/20 last:border-r-0 ${
                          permitted ? "bg-white/[0.12]" : "bg-[#ff775d]/[0.07]"
                        } ${band === columnBand ? "ring-1 ring-inset ring-white/25" : ""}`}
                      />
                    );
                  }),
                )}
              </div>

              <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 500 300" preserveAspectRatio="none" aria-hidden="true">
                <path
                  d="M0 2 H100 V100 H200 V200 H500"
                  fill="none"
                  stroke="hsl(var(--brand-pink))"
                  strokeWidth="4"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>

              <div className="pointer-events-none absolute left-[42%] top-[54%] -translate-x-1/2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#ff9fcf]">
                The ceiling
              </div>
              <div className="pointer-events-none absolute bottom-4 left-3 text-[9px] font-bold uppercase tracking-[0.12em] text-white/50">
                Authority permitted
              </div>
              <div className="pointer-events-none absolute bottom-4 right-3 text-[9px] text-white/55">
                E4: second control · E5: external safety sign-off
              </div>

              <div
                data-selected-band={`e${band}`}
                className="pointer-events-none absolute z-10 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[5px] border-white bg-[hsl(var(--brand-coral))] shadow-[0_0_0_5px_rgba(255,119,93,0.22)] motion-safe:transition-all"
                style={{
                  left: `${(band - 0.5) * 20}%`,
                  top: `${selectedCeilingRow * (100 / 3)}%`,
                }}
                aria-hidden="true"
              />
            </div>

            <div aria-hidden="true" />
            <div className="grid grid-cols-5">
              {exposureColumns.map((column) => (
                <div key={column.band} className={`border-r border-white/15 px-2 pt-3 text-center last:border-r-0 ${band === column.band ? "bg-white/[0.06]" : ""}`}>
                  <strong className="block text-sm text-white">E{column.band}</strong>
                  <span className="mt-1 block text-[9px] font-semibold text-[#ff9fcf]">{column.rule}</span>
                  <span className="mt-1 block text-[9px] leading-[1.35] text-white/50">{column.meaning}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="ml-[174px] mt-4 text-center text-[9px] font-bold uppercase tracking-[0.13em] text-white/60">
            What it costs to be wrong →
          </p>
        </div>
      </div>

      <div aria-live="polite" className="mt-5 grid gap-5 border-t border-white/20 pt-5 md:grid-cols-[0.7fr_1.3fr] md:items-center">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/55">Selected operating condition</p>
          <p className="mt-1 font-display text-[clamp(32px,4vw,52px)] font-semibold tracking-[-0.07em] text-white">
            R{selected.r} + H{selected.h} → E{band}
          </p>
        </div>
        <div className="border-l-2 border-[hsl(var(--brand-pink))] pl-4">
          <p className="text-sm font-semibold leading-[1.55] text-white">
            Permitted authority: {OVERSIGHT_LABELS[ceiling]}.
          </p>
          <p className="mt-2 text-xs leading-[1.55] text-[#b9c7db]">
            The highlighted point sits on the ceiling. Any authority above it must be carried by an approved template,
            whitelist, rule set, or blocking gate—not by the agent.
          </p>
        </div>
      </div>
    </figure>
  );
}

type AgentAuthorityLayoutProps = {
  framework: CmsRecord<FrameworkContent> | null;
  renderPolicy?: "cms" | "compiled-fallback" | "loading" | "unavailable";
  preview?: boolean;
};

export function AgentAuthorityLayout({
  framework,
  renderPolicy = "cms",
  preview = false,
}: AgentAuthorityLayoutProps) {
  const reducedMotion = useReducedMotion();
  const heroMedia = framework
    ? resolveCmsMedia(framework.media, framework.heroMedia, framework.heroMediaId)
    : undefined;
  const title = text(framework?.title, COMPILED.title);
  const teaser = text(framework?.teaser, COMPILED.teaser);
  const explanation = text(framework?.handoverExplanation, COMPILED.handoverExplanation);
  const workedExample = framework?.workedExample;
  const workedR = (Number(workedExample?.reversibility?.slice(1)) || 3) as RScore;
  const workedH = (Number(workedExample?.reach?.slice(1)) || 2) as HScore;
  const workedBand = getEBand(workedR, workedH);
  const workedCeiling = getCeiling(workedBand);
  const sectorExamples = Array.isArray(framework?.sectorExamples)
    ? framework.sectorExamples.map((example) => {
      const rScore = (Number(typeof example.reversibility === "string" ? example.reversibility.slice(1) : 1) || 1) as RScore;
      const hScore = (Number(typeof example.reach === "string" ? example.reach.slice(1) : 1) || 1) as HScore;
      const exampleBand = getEBand(rScore, hScore);
      return {
        sector: text(example.sector, "Unspecified sector"),
        example: text(example.title, "Untitled handover"),
        type: typeof example.handover === "string"
          ? `${example.handover.charAt(0).toUpperCase()}${example.handover.slice(1)}`
          : "Unspecified",
        band: `E${exampleBand}`,
        authority: OVERSIGHT_LABELS[getCeiling(exampleBand)],
      };
    })
    : SECTOR_EXAMPLES;
  const sources = Array.isArray(framework?.sources) && framework.sources.length ? framework.sources : COMPILED_SOURCES;
  const cta = framework?.cta && typeof framework.cta.label === "string" && typeof framework.cta.href === "string"
    ? framework.cta
    : { label: "Bring us one process", href: "/value-scan" };
  const heroImage = heroMedia?.url ?? (preview ? undefined : assetUrl("/images/cognirise/cognirise-pulse-governance.jpg"));
  const imageUrl = heroImage
    ? (heroImage.startsWith("http") ? heroImage : `${window.location.origin}${heroImage}`)
    : undefined;
  useDynamicMetadata(preview ? {
    title: `Draft preview: ${title} | Cognirise`,
    description: "Protected CMS draft preview.",
    canonicalUrl: null,
    imageUrl,
    noIndex: true,
  } : metadataFromSeo(framework?.seo, {
    title: `${title} | Cognirise`,
    description: teaser,
    canonicalUrl: `${window.location.origin}/methodologies/agent-authority-model`,
    imageUrl,
  }));

  if (renderPolicy === "loading") {
    return (
      <main className="min-h-[70vh] bg-[#fdfcfb] px-6 py-24 md:px-[4.8vw]" aria-busy="true">
        <Kicker>Methodologies & frameworks</Kicker>
        <p className="mt-8 text-lg text-[#405777]">Loading the governed methodology…</p>
      </main>
    );
  }

  if (renderPolicy === "unavailable") {
    return (
      <main className="min-h-[70vh] bg-[#fdfcfb] px-6 py-24 md:px-[4.8vw]">
        <Kicker>Methodologies & frameworks</Kicker>
        <h1 className="mt-8 max-w-[780px] font-display text-[clamp(44px,6vw,84px)] font-semibold leading-[0.95] tracking-[-0.08em]">
          This methodology is not currently published.
        </h1>
        <p className="mt-6 max-w-[620px] text-[17px] leading-[1.65] text-[#405777]">
          The governed framework is unavailable or awaiting approval. No earlier compiled version has been substituted.
        </p>
      </main>
    );
  }

  return (
    <article className="overflow-hidden bg-[#fdfcfb] font-sans text-[#102957] selection:bg-[hsl(var(--brand-pink))] selection:text-white">
      <header className="px-6 pb-16 pt-9 md:px-[4.8vw] lg:pb-24">
        <Kicker>Methodologies & frameworks / 01</Kicker>
        <div className="mt-8 grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.65 }}
          >
            <h1 className="font-display text-[clamp(50px,6.5vw,98px)] font-semibold leading-[0.92] tracking-[-0.085em]">
              {title}
            </h1>
            <p className="mt-7 max-w-[590px] text-[18px] leading-[1.58] text-[#405777]">{teaser}</p>
            <a href="#assessment" className="mt-8 inline-flex items-center gap-3 border-b border-[#102957] pb-2 text-sm font-bold hover:text-[hsl(var(--brand-pink))]">
              Assess one handover <ArrowRight size={16} />
            </a>
          </motion.div>
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, clipPath: "inset(0 100% 0 0)" }}
            animate={{ opacity: 1, clipPath: "inset(0 0 0 0)" }}
            transition={{ duration: reducedMotion ? 0 : 1, ease: [0.16, 1, 0.3, 1] }}
          >
            <figure data-methodology-hero-frame className="clip-diagonal relative h-[430px] overflow-hidden bg-[#071936] lg:h-[650px]">
             {heroImage ? (
               <PulseImage
                 src={heroImage}
                 alt={framework?.heroMedia?.altText || heroMedia?.altText || "A luminous gateway marking the boundary between proposed and permitted agent authority."}
                 className="h-full w-full object-cover"
                 style={{ objectPosition: cmsMediaObjectPosition(heroMedia) }}
                 eager
               />
             ) : (
               <div className="grid h-full place-items-center p-8 text-center text-sm text-white/70">
                 Draft hero media is not available in this revision.
               </div>
             )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#071936]/80 via-transparent to-transparent" />
            <figcaption className="absolute bottom-[11%] left-8 right-8 max-w-[480px] text-white">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/65">The governing rule</span>
              <strong className="mt-2 block font-display text-[clamp(26px,3vw,43px)] leading-[1.04] tracking-[-0.06em]">
                Exposure sets the ceiling. Evidence earns the climb.
              </strong>
            </figcaption>
            </figure>
          </motion.div>
        </div>
      </header>

      <section className="border-y border-[#cbd3e1] px-6 py-20 md:px-[4.8vw] lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:gap-[8vw]">
          <div>
            <Kicker>The unit we govern</Kicker>
            <h2 className="mt-5 font-display text-[clamp(40px,5vw,72px)] font-semibold leading-[0.98] tracking-[-0.08em]">
              The handover, not the agent.
            </h2>
          </div>
          <div className="self-end border-t border-[#102957] pt-6">
            <p className="text-[19px] leading-[1.55] text-[#30486d]">{explanation}</p>
            <p className="mt-5 text-sm leading-[1.6] text-[#647491]">
              These are not permanent agent classes. A single agent may answer a question, fix a case outcome,
              and change a system record—three handovers that can require three different authorities.
            </p>
            <a href="/methodologies/human-agent-operating-model" className="mt-6 inline-flex items-center gap-2 border-b border-[#102957] pb-2 text-sm font-bold hover:text-[hsl(var(--brand-pink))]">
              Place handovers into the operating model <ArrowRight size={15} />
            </a>
          </div>
        </div>
        <ol className="mt-14 grid border-l border-t border-[#cbd3e1] lg:grid-cols-3">
          {HANDOVERS.map((item, index) => (
            <li key={item.type} className="border-b border-r border-[#cbd3e1] p-6 lg:flex lg:min-h-[285px] lg:flex-col lg:p-8">
              <span className="text-[10px] font-bold tracking-[0.12em] text-[hsl(var(--brand-pink))]">0{index + 1}</span>
              <h3 className="mt-10 font-display text-[30px] font-semibold tracking-[-0.06em]">{item.type}</h3>
              <p className="mt-3 text-sm leading-[1.55] text-[#405777]">{item.rule}</p>
              <p className="mt-7 border-t border-[#dce2eb] pt-4 text-xs font-semibold leading-[1.5] text-[#102957] lg:mt-auto">{item.example}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="authority-ceiling" className="scroll-mt-20 bg-[#071936] px-6 py-20 text-white md:px-[4.8vw] lg:py-28">
        <div className="mb-12 grid gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-end">
          <div>
            <Kicker inverse>Two axes · one ceiling</Kicker>
            <h2 className="mt-5 max-w-[760px] font-display text-[clamp(40px,5vw,72px)] font-semibold leading-[0.98] tracking-[-0.08em]">
              What it costs to be wrong.
            </h2>
          </div>
          <p className="max-w-[480px] text-[15px] leading-[1.6] text-[#dce4f0]">
            Reversibility (R1–R4) and reach (H1–H5) are scored independently. The more severe result assigns
            E1–E5. Use mouse, touch, Tab, or arrow keys to explore every cell.
          </p>
        </div>
        <MatrixExplorer />
      </section>

      <section className="px-6 py-20 md:px-[4.8vw] lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[0.86fr_1.14fr] lg:gap-[7vw]">
          <div>
            <Kicker>No judgement required</Kicker>
            <h2 className="mt-5 font-display text-[clamp(40px,5vw,70px)] font-semibold leading-[0.98] tracking-[-0.08em]">
              Six answers become a control specification.
            </h2>
            <p className="mt-6 max-w-[520px] text-[16px] leading-[1.65] text-[#405777]">
              The process owner answers the questions. The application calculates the ceiling. Narrative can be
              edited and reviewed in the CMS; the scoring rules remain deterministic application logic.
            </p>
          </div>
          <ol className="border-t border-[#102957]">
            {[
              "Classify the exact handover: Knowledge, Decision, or Action.",
              "Score how the operation can reverse a wrong result, R1–R4.",
              "Score who is affected or would find out, H1–H5.",
              "Compare requested authority with the calculated oversight ceiling.",
              "Name one accountable operating role—not a team.",
              "State promotion evidence and the condition that demotes authority automatically.",
            ].map((item, index) => (
              <li key={item} className="grid grid-cols-[44px_1fr] gap-3 border-b border-[#cbd3e1] py-5">
                <span className="text-[10px] font-bold tracking-[0.1em] text-[hsl(var(--brand-pink))]">0{index + 1}</span>
                <span className="text-sm font-semibold leading-[1.5]">{item}</span>
              </li>
            ))}
          </ol>
          {framework?.methodology?.length ? <GovernedNarrative blocks={framework.methodology} /> : null}
        </div>
      </section>

      <section className="bg-[#f0effa] px-6 py-20 md:px-[4.8vw] lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <Kicker>Worked example</Kicker>
            <h2 className="mt-5 font-display text-[clamp(40px,5vw,68px)] font-semibold leading-[0.98] tracking-[-0.08em]">
              {workedExample?.title ?? "Airline disruption re-accommodation"}.
            </h2>
            <p className="mt-6 text-[16px] leading-[1.65] text-[#405777]">
              {workedExample?.detail ??
                "An agent rebooks one disrupted passenger and issues a boarding pass. Reversal requires another party, and one named passenger is affected."}
            </p>
          </div>
          <div>
            <dl className="grid border-l border-t border-[#b9c4d5] sm:grid-cols-2">
              {[
                ["Handover", workedExample?.handover?.toUpperCase() ?? "ACTION"],
                ["Reversibility", `R${workedR}`],
                ["Reach", `H${workedH}`],
                ["Exposure", `E${workedBand}`],
                ["Ceiling", OVERSIGHT_LABELS[workedCeiling]],
                ["Requested authority", OVERSIGHT_LABELS[workedExample?.requestedAuthority ?? "on-loop"]],
                ["Owner", workedExample?.accountableRole ?? "Duty Manager, Operations Control Centre"],
                ["Promotion evidence", workedExample?.promotionEvidence ?? "500 consecutive rebookings with zero disputed reversals and no complaint uplift against the manual control"],
                ["Automatic demotion", workedExample?.automaticDemotion ?? "Any involuntary downgrade or caused missed connection"],
              ].map(([term, description]) => (
                <div key={term} className="border-b border-r border-[#b9c4d5] bg-white/55 p-5">
                  <dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#647491]">{term}</dt>
                  <dd className="mt-2 text-sm font-semibold leading-[1.5]">{description}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-5 border-l-4 border-[hsl(var(--brand-coral))] pl-4 text-sm leading-[1.6] text-[#405777]">
              Binding condition: {workedExample?.interventionWindow ?? "the intervention window must be shorter than released-seat availability."}{" "}
              {workedExample?.authorityArtefact
                ? `Authority above the ceiling is carried by: ${workedExample.authorityArtefact}.`
                : "No carrying artefact is required because the requested authority sits at the calculated ceiling."}
            </p>
          </div>
        </div>
      </section>

      <section className="px-6 py-20 md:px-[4.8vw] lg:py-28">
        <div className="mb-10 flex flex-col justify-between gap-6 border-t border-[#102957] pt-6 lg:flex-row lg:items-end">
          <div>
            <Kicker>Representative contrasts</Kicker>
            <h2 className="mt-5 font-display text-[clamp(38px,5vw,66px)] font-semibold leading-[0.98] tracking-[-0.08em]">
              Technology does not determine authority.
            </h2>
          </div>
          <p className="max-w-[390px] text-sm leading-[1.6] text-[#536887]">
            The same underlying capability can sit at different authorities because operational exposure differs.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] border-collapse text-left">
            <thead>
              <tr className="border-b-2 border-[#102957] text-[10px] uppercase tracking-[0.1em] text-[#647491]">
                <th className="p-4">Sector</th>
                <th className="p-4">Handover</th>
                <th className="p-4">Type</th>
                <th className="p-4">Exposure</th>
                <th className="p-4">Authority / control</th>
              </tr>
            </thead>
            <tbody>
              {sectorExamples.map((item) => (
                <tr key={item.example} className="border-b border-[#cbd3e1] text-sm">
                  <td className="p-4 font-bold">{item.sector}</td>
                  <td className="p-4 text-[#405777]">{item.example}</td>
                  <td className="p-4">{item.type}</td>
                  <td className="p-4 font-bold text-[hsl(var(--brand-pink))]">{item.band}</td>
                  <td className="p-4 text-[#405777]">{item.authority}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <AgentAuthorityAssessment />

      <section className="px-6 py-20 md:px-[4.8vw] lg:py-28">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <Kicker>Standards provenance</Kicker>
            <h2 className="mt-5 font-display text-[clamp(38px,4.5vw,62px)] font-semibold leading-[1] tracking-[-0.075em]">
              Published practice, not invented vocabulary.
            </h2>
          </div>
          <div>
            <p className="text-[16px] leading-[1.65] text-[#405777]">
              Human in, on, and out of the loop is established oversight language. The model combines that
              vocabulary with published practice on human oversight, reversibility, reach, and levels of automation.
            </p>
            <ul className="mt-8 border-t border-[#102957]">
              {sources.map((source) => (
                <li key={source.label} className="border-b border-[#cbd3e1] py-4">
                  {source.url ? (
                    <a href={source.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-5 text-sm font-bold hover:text-[hsl(var(--brand-pink))]">
                      {source.label} <ArrowRight size={15} aria-hidden="true" />
                    </a>
                  ) : (
                    <span className="text-sm font-bold">{source.label}</span>
                  )}
                </li>
              ))}
            </ul>
            {(framework?.verificationDate || framework?.reviewDate) && (
              <p className="mt-5 text-xs text-[#647491]">
                Verified {framework.verificationDate}. Next editorial review {framework.reviewDate}.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="bg-[#102957] px-6 py-20 text-white md:px-[4.8vw] lg:py-28">
        <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <Kicker inverse>From method to operating reality</Kicker>
            <h2 className="mt-5 max-w-[900px] font-display text-[clamp(42px,5.5vw,78px)] font-semibold leading-[0.96] tracking-[-0.08em]">
              Bring one handover under pressure.
            </h2>
            <p className="mt-5 max-w-[580px] text-[16px] leading-[1.6] text-[#dce4f0]">
              Use the assessment privately now. When you need to translate the brief into architecture, controls,
              and accountable delivery, bring us the process.
            </p>
          </div>
          <BrandButton href={cta.href} variant="inverse">{cta.label}</BrandButton>
        </div>
      </section>
    </article>
  );
}

export default function AgentAuthorityModel() {
  const query = useCmsEntry("framework", "agent-authority-model");
  const renderPolicy = cmsEntryRenderPolicy(query.isAuthoritative, query.delivery);
  const cmsRecord = query.data ? contentRecord(query.data, "framework") : null;
  const framework = cmsRecord?.template === "agent-authority" ? cmsRecord : null;

  return <AgentAuthorityLayout framework={framework} renderPolicy={renderPolicy} />;
}