import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { FrameworkContent } from "@workspace/api-zod";
import { AgentAuthorityAssessment } from "@/components/AgentAuthorityAssessment";
import { BrandButton } from "@/components/ui/brand-button";
import { PulseImage } from "@/components/ui/pulse-image";
import { assetUrl } from "@/lib/assets";
import { cmsEntryRenderPolicy, contentRecord, text, useCmsEntry } from "@/lib/cms";
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
          return <ul key={index} className="mt-4 list-disc space-y-2 pl-5 text-sm leading-[1.6] text-[#405777]">{block.items.map((item) => <li key={item}>{item}</li>)}</ul>;
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
  const band = getEBand(selected.r, selected.h);
  const ceiling = getCeiling(band);

  const move = (event: React.KeyboardEvent<HTMLButtonElement>, r: RScore, h: HScore) => {
    const offsets: Record<string, [number, number]> = {
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
    };
    const offset = offsets[event.key];
    if (!offset) return;
    event.preventDefault();
    const nextR = Math.min(4, Math.max(1, r + offset[0])) as RScore;
    const nextH = Math.min(5, Math.max(1, h + offset[1])) as HScore;
    setSelected({ r: nextR, h: nextH });
    document.querySelector<HTMLButtonElement>(`[data-matrix-cell="r${nextR}-h${nextH}"]`)?.focus();
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[1.12fr_0.88fr] lg:items-center">
      <div className="overflow-x-auto pb-2">
        <table className="w-full min-w-[610px] border-separate border-spacing-1" aria-label="Exposure band matrix">
          <caption className="sr-only">
            Select a reversibility and reach combination. Use arrow keys to move between cells.
          </caption>
          <thead>
            <tr>
              <th className="p-2 text-left text-[10px] uppercase tracking-[0.1em] text-white/55">Undo ↓ / Reach →</th>
              {([1, 2, 3, 4, 5] as HScore[]).map((h) => (
                <th key={h} scope="col" className="p-2 text-center text-[11px] text-white/70">H{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {([1, 2, 3, 4] as RScore[]).map((r) => (
              <tr key={r}>
                <th scope="row" className="p-2 text-left text-[11px] text-white/70">R{r}</th>
                {([1, 2, 3, 4, 5] as HScore[]).map((h) => {
                  const cellBand = getEBand(r, h);
                  const active = selected.r === r && selected.h === h;
                  return (
                    <td key={h}>
                      <button
                        type="button"
                        data-matrix-cell={`r${r}-h${h}`}
                        aria-label={`R${r}, H${h}, exposure E${cellBand}`}
                        aria-pressed={active}
                        onClick={() => setSelected({ r, h })}
                        onKeyDown={(event) => move(event, r, h)}
                        className={`min-h-14 w-full border p-2 text-sm font-bold transition ${
                          active
                            ? "scale-[1.04] border-white bg-white text-[#102957]"
                            : cellBand === 5
                              ? "border-[#ff927e]/50 bg-[#ff775d]/80 text-white hover:bg-[#ff775d]"
                              : cellBand === 4
                                ? "border-[#e774b3]/50 bg-[#db509e]/75 text-white hover:bg-[#db509e]"
                                : "border-white/20 bg-white/10 text-white hover:bg-white/20"
                        } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-coral))]`}
                      >
                        E{cellBand}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div aria-live="polite" className="border-l-2 border-[hsl(var(--brand-pink))] pl-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/55">Selected operating condition</p>
        <p className="mt-3 font-display text-[clamp(36px,5vw,64px)] font-semibold tracking-[-0.07em] text-white">
          R{selected.r} + H{selected.h} → E{band}
        </p>
        <p className="mt-4 text-[15px] leading-[1.6] text-[#dce4f0]">
          <strong className="text-white">Reversibility:</strong> {REVERSIBILITY_LABELS[selected.r]}
        </p>
        <p className="mt-3 text-[15px] leading-[1.6] text-[#dce4f0]">
          <strong className="text-white">Reach:</strong> {REACH_LABELS[selected.h]}
        </p>
        <p className="mt-5 bg-white/10 p-4 text-sm font-semibold leading-[1.5] text-white">
          Permitted oversight ceiling: {OVERSIGHT_LABELS[ceiling]}.
        </p>
      </div>
    </div>
  );
}

export default function AgentAuthorityModel() {
  const reducedMotion = useReducedMotion();
  const query = useCmsEntry("framework", "agent-authority-model");
  const renderPolicy = cmsEntryRenderPolicy(query.isAuthoritative, query.delivery);
  const cmsRecord = query.data ? contentRecord(query.data, "framework") : null;
  const framework = cmsRecord?.template === "agent-authority" ? cmsRecord : null;
  const heroMedia = framework?.heroMediaId
    ? framework.media?.find((media) => media.id === framework.heroMediaId)
    : undefined;
  const title = text(framework?.title, COMPILED.title);
  const teaser = text(framework?.teaser, COMPILED.teaser);
  const explanation = text(framework?.handoverExplanation, COMPILED.handoverExplanation);
  const workedExample = framework?.workedExample;
  const workedR = (Number(workedExample?.reversibility.slice(1)) || 3) as RScore;
  const workedH = (Number(workedExample?.reach.slice(1)) || 2) as HScore;
  const workedBand = getEBand(workedR, workedH);
  const workedCeiling = getCeiling(workedBand);
  const sectorExamples = framework
    ? framework.sectorExamples.map((example) => {
      const rScore = Number(example.reversibility.slice(1)) as RScore;
      const hScore = Number(example.reach.slice(1)) as HScore;
      const exampleBand = getEBand(rScore, hScore);
      return {
        sector: example.sector,
        example: example.title,
        type: `${example.handover.charAt(0).toUpperCase()}${example.handover.slice(1)}`,
        band: `E${exampleBand}`,
        authority: OVERSIGHT_LABELS[getCeiling(exampleBand)],
      };
    })
    : SECTOR_EXAMPLES;
  const sources = framework ? framework.sources : COMPILED_SOURCES;
  const cta = framework?.cta ?? { label: "Bring us one process", href: "/value-scan" };
  useDynamicMetadata(metadataFromSeo(framework?.seo, {
    title: `${title} | Cognirise`,
    description: teaser,
    canonicalUrl: `${window.location.origin}/methodologies/agent-authority-model`,
    imageUrl: heroMedia?.url ?? `${window.location.origin}${assetUrl("/images/cognirise/cognirise-pulse-governance.jpg")}`,
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
          <motion.figure
            initial={reducedMotion ? false : { opacity: 0, clipPath: "inset(0 100% 0 0)" }}
            animate={{ opacity: 1, clipPath: "inset(0 0 0 0)" }}
            transition={{ duration: reducedMotion ? 0 : 1, ease: [0.16, 1, 0.3, 1] }}
            className="relative h-[430px] overflow-hidden bg-[#071936] lg:h-[650px]"
            style={{ clipPath: "polygon(10% 0, 100% 0, 100% 91%, 0 100%, 0 12%)" }}
          >
            <PulseImage
              src={heroMedia?.url ?? assetUrl("/images/cognirise/cognirise-pulse-governance.jpg")}
              alt={heroMedia?.altText || "A luminous gateway marking the boundary between proposed and permitted agent authority."}
              className="h-full w-full object-cover"
              eager
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#071936]/80 via-transparent to-transparent" />
            <figcaption className="absolute bottom-8 left-8 right-8 max-w-[480px] text-white">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/65">The governing rule</span>
              <strong className="mt-2 block font-display text-[clamp(26px,3vw,43px)] leading-[1.04] tracking-[-0.06em]">
                Exposure sets the ceiling. Evidence earns the climb.
              </strong>
            </figcaption>
          </motion.figure>
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
          </div>
        </div>
        <ol className="mt-14 grid border-l border-t border-[#cbd3e1] lg:grid-cols-3">
          {HANDOVERS.map((item, index) => (
            <li key={item.type} className="border-b border-r border-[#cbd3e1] p-6 lg:min-h-[285px] lg:p-8">
              <span className="text-[10px] font-bold tracking-[0.12em] text-[hsl(var(--brand-pink))]">0{index + 1}</span>
              <h3 className="mt-10 font-display text-[30px] font-semibold tracking-[-0.06em]">{item.type}</h3>
              <p className="mt-3 text-sm leading-[1.55] text-[#405777]">{item.rule}</p>
              <p className="mt-7 border-t border-[#dce2eb] pt-4 text-xs font-semibold leading-[1.5] text-[#102957]">{item.example}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-[#071936] px-6 py-20 text-white md:px-[4.8vw] lg:py-28">
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