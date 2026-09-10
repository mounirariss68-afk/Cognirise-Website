import { useMemo, useState } from "react";
import { ArrowRight, Check, RotateCcw } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { useDynamicMetadata } from "@/lib/metadata";

type Answer = "ready" | "prepare" | "stop";

const CONDITIONS = [
  {
    id: "stability",
    title: "Workflow stability",
    question: "Is the current workflow sufficiently understood and stable to specify?",
    ready: "The trigger, sequence, owner, expected outcome and material variants are evidenced.",
    prepare: "The main path is known, but variants or baseline performance remain incomplete.",
    stop: "The workflow changes materially by person, shift or case, with no accountable standard.",
    resolve: "Map the current workflow, name its owner, quantify baseline performance and agree which variants are in scope.",
  },
  {
    id: "access",
    title: "Data & tool access",
    question: "Can the work reach the right data and tools under enforceable permissions?",
    ready: "Required sources and actions are available, current, permissioned and testable.",
    prepare: "Access is possible, but one or more sources, credentials, tool actions or data-quality controls are unresolved.",
    stop: "Delivery would require prohibited access, untraceable data or an action the organisation cannot lawfully authorise.",
    resolve: "Confirm source authority, identity, least-privilege permissions, tool contracts, data quality and retention.",
  },
  {
    id: "observability",
    title: "Observability",
    question: "Can operators see what happened, why it happened and whether it worked?",
    ready: "Inputs, actions, outcomes, quality signals and material failures can be traced to a case.",
    prepare: "Basic logs exist, but outcome measurement, case traceability or alert ownership is incomplete.",
    stop: "A consequential failure could occur without detection or reconstruction.",
    resolve: "Define case-level traceability, outcome measures, alerts, review cadence and a named monitoring owner.",
  },
  {
    id: "fallback",
    title: "Fallback & recovery",
    question: "Can service continue safely when the agent or a dependency is unavailable?",
    ready: "A tested fallback preserves service and recovery restores a known safe state.",
    prepare: "A fallback exists on paper but capacity, timing, recovery state or rehearsal is unproven.",
    stop: "Failure would strand work, corrupt state or create an unsafe service gap.",
    resolve: "Specify the fallback trigger, route, capacity, recovery point, reconciliation method and rehearsal evidence.",
  },
  {
    id: "exceptions",
    title: "Exceptions & boundaries",
    question: "Are unusual, ambiguous and prohibited cases identifiable before harm occurs?",
    ready: "Known exceptions have detection rules, a safe route and a named decision owner.",
    prepare: "Common exceptions are covered, but the long tail, escalation service level or prohibited cases remain incomplete.",
    stop: "The agent cannot distinguish normal work from cases that must not proceed.",
    resolve: "Build the exception inventory, prohibited-case rules, escalation route, service level and accountable resolver.",
  },
  {
    id: "economics",
    title: "Operating economics",
    question: "Does the workflow remain worthwhile after control, exception and run costs?",
    ready: "Volume, unit cost, control cost, exception load and expected benefit support a credible operating case.",
    prepare: "Value is plausible, but volumes, adoption, exception effort or run costs are assumptions.",
    stop: "The evidenced operating case is negative, or the value depends on removing necessary controls.",
    resolve: "Evidence demand, cost-to-serve, exception effort, control overhead, adoption and the threshold for stopping.",
  },
] as const;

const SOURCES = [
  {
    label: "NIST AI Risk Management Framework 1.0 (January 2023)",
    href: "https://www.nist.gov/itl/ai-risk-management-framework",
    use: "Govern, Map, Measure and Manage functions informed the evidence and monitoring questions.",
  },
  {
    label: "NIST AI 600-1, Generative AI Profile (July 2024)",
    href: "https://doi.org/10.6028/NIST.AI.600-1",
    use: "Risk identification, measurement, incident handling and third-party dependency considerations informed the operating-condition prompts.",
  },
  {
    label: "EU AI Act, Regulation (EU) 2024/1689 (13 June 2024)",
    href: "https://eur-lex.europa.eu/eli/reg/2024/1689/oj",
    use: "Human oversight, logging, accuracy, robustness and cybersecurity obligations informed the control questions where applicable.",
  },
] as const;

function Kicker({ children, inverse = false }: { children: React.ReactNode; inverse?: boolean }) {
  return (
    <div className={`flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.13em] ${inverse ? "text-white/70" : "text-[#102957]"}`}>
      <span className="h-[2px] w-[23px] bg-gradient-to-r from-[hsl(var(--brand-violet))] via-[hsl(var(--brand-pink))] to-[hsl(var(--brand-coral))]" />
      {children}
    </div>
  );
}

export default function AgenticOperationsReadiness() {
  const [answers, setAnswers] = useState<Partial<Record<(typeof CONDITIONS)[number]["id"], Answer>>>({});

  useDynamicMetadata({
    title: "Agentic Operations Readiness Framework | Cognirise",
    description: "Decide whether one workflow should proceed to agent delivery, needs preparation, or must stop—and identify the operating conditions to resolve.",
    canonicalUrl: `${window.location.origin}/methodologies/agentic-operations-readiness`,
  });

  const result = useMemo(() => {
    const values = Object.values(answers);
    if (values.includes("stop")) return "stop";
    if (values.length === CONDITIONS.length && values.every((value) => value === "ready")) return "proceed";
    return "prepare";
  }, [answers]);

  const unresolved = CONDITIONS.filter((condition) => answers[condition.id] !== "ready");
  const completed = Object.keys(answers).length;
  const resultCopy = result === "proceed"
    ? {
        label: "Proceed",
        line: "The workflow has evidence across all six operating conditions.",
        detail: "Take the bounded workflow into IDAO. Before live handover, use Agent Authority to set authority for each Knowledge, Decision and Action handover.",
        color: "#38b78f",
      }
    : result === "stop"
      ? {
          label: "Stop",
          line: "At least one condition makes agent delivery unacceptable in the current scope.",
          detail: "Do not design around the blocker. Change the workflow, scope or operating constraint, then reassess from evidence.",
          color: "#ff775d",
        }
      : {
          label: "Prepare",
          line: completed === CONDITIONS.length
            ? "The workflow may be viable, but operating conditions remain unresolved."
            : "Complete the six conditions before making the decision.",
          detail: "Resolve the named conditions below. Reassess before committing the workflow to agent delivery.",
          color: "#db509e",
        };

  return (
    <article className="overflow-hidden bg-[#fdfcfb] font-sans text-[#102957] selection:bg-[hsl(var(--brand-pink))] selection:text-white">
      <header className="px-6 pb-16 pt-9 md:px-[4.8vw] lg:pb-24">
        <Kicker>Methodologies & frameworks / 02</Kicker>
        <div className="mt-8 grid gap-12 lg:grid-cols-[1.05fr_.95fr] lg:items-end">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[hsl(var(--brand-pink))]">Workflow decision method</p>
            <h1 className="mt-5 max-w-[940px] font-display text-[clamp(52px,7.4vw,112px)] font-semibold leading-[.88] tracking-[-.09em]">
              Ready for agents?
            </h1>
          </div>
          <div className="border-t border-[#102957] pt-6">
            <p className="text-[19px] leading-[1.58] text-[#405777]">
              Test one workflow—not an organisation, platform or agent—against the conditions it needs to operate. Leave with a clear Proceed, Prepare or Stop decision and the specific work still unresolved.
            </p>
            <a href="#assessment" className="mt-8 inline-flex items-center gap-3 border-b border-[#102957] pb-2 text-sm font-bold hover:text-[hsl(var(--brand-pink))]">
              Assess one workflow <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </header>

      <section className="border-y border-[#cbd3e1] bg-[#f1f3f7] px-6 py-20 md:px-[4.8vw] lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:gap-[8vw]">
          <div>
            <Kicker>The boundary</Kicker>
            <h2 className="mt-5 font-display text-[clamp(40px,5vw,72px)] font-semibold leading-[.97] tracking-[-.08em]">Readiness before authority.</h2>
          </div>
          <div className="border-t border-[#102957] pt-6">
            <p className="text-[18px] leading-[1.6] text-[#30486d]">
              This framework decides whether the workflow has viable operating conditions. It does not decide how independently an agent may act.
            </p>
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <a href="/methodologies/idao" className="border border-[#cbd3e1] bg-white p-5 hover:border-[#102957]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#647491]">If it can proceed</span>
                <strong className="mt-2 block font-display text-2xl tracking-[-.05em]">Deliver through IDAO →</strong>
              </a>
              <a href="/methodologies/agent-authority-model" className="border border-[#cbd3e1] bg-white p-5 hover:border-[#102957]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#647491]">Before live handover</span>
                <strong className="mt-2 block font-display text-2xl tracking-[-.05em]">Set Agent Authority →</strong>
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="assessment" className="scroll-mt-20 px-6 py-20 md:px-[4.8vw] lg:py-28" aria-labelledby="assessment-title">
        <div className="grid gap-8 lg:grid-cols-[.72fr_1.28fr] lg:items-end">
          <div>
            <Kicker>Six operating conditions</Kicker>
            <h2 id="assessment-title" className="mt-5 font-display text-[clamp(42px,5.5vw,78px)] font-semibold leading-[.96] tracking-[-.08em]">Evidence, not optimism.</h2>
          </div>
          <p className="max-w-[700px] border-t border-[#102957] pt-6 text-[16px] leading-[1.65] text-[#405777]">
            Choose the statement that best matches current evidence. “Ready” must be demonstrable. One Stop condition stops the current scope; any Prepare condition names work to complete.
          </p>
        </div>

        <ol className="mt-14 space-y-5">
          {CONDITIONS.map((condition, index) => (
            <li key={condition.id} className="border border-[#cbd3e1] bg-white p-5 md:p-7">
              <div className="grid gap-6 lg:grid-cols-[.72fr_1.28fr]">
                <div>
                  <span className="text-[10px] font-bold tracking-[.12em] text-[hsl(var(--brand-pink))]">0{index + 1}</span>
                  <h3 className="mt-3 font-display text-[30px] font-semibold tracking-[-.06em]">{condition.title}</h3>
                  <p className="mt-3 text-sm font-semibold leading-[1.55] text-[#405777]">{condition.question}</p>
                </div>
                <div role="radiogroup" aria-label={condition.title} className="grid gap-2">
                  {(["ready", "prepare", "stop"] as const).map((answer) => {
                    const selected = answers[condition.id] === answer;
                    return (
                      <button
                        key={answer}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setAnswers((current) => ({ ...current, [condition.id]: answer }))}
                        className={`grid min-h-14 grid-cols-[82px_1fr] items-start gap-3 border p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--brand-coral))] ${
                          selected ? "border-[#102957] bg-[#102957] text-white" : "border-[#d7dde7] hover:border-[#102957]"
                        }`}
                      >
                        <strong className={`text-[10px] uppercase tracking-wider ${selected ? "text-white" : answer === "ready" ? "text-[#16805f]" : answer === "stop" ? "text-[#d34f38]" : "text-[#b5367d]"}`}>
                          {answer}
                        </strong>
                        <span className={`text-xs leading-[1.5] ${selected ? "text-white/80" : "text-[#536887]"}`}>{condition[answer]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </li>
          ))}
        </ol>

        <div className="sticky bottom-4 z-20 mt-8 border border-white/20 bg-[#071936] p-6 text-white shadow-[0_18px_60px_rgba(7,25,54,.25)] md:p-8" aria-live="polite">
          <div className="grid gap-6 lg:grid-cols-[.6fr_1.4fr] lg:items-center">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[.14em] text-white/55">Current decision · {completed}/6 answered</p>
              <p className="mt-2 font-display text-[clamp(42px,5vw,70px)] font-semibold leading-none tracking-[-.07em]" style={{ color: resultCopy.color }}>{resultCopy.label}</p>
            </div>
            <div className="border-l-2 pl-5" style={{ borderColor: resultCopy.color }}>
              <p className="font-semibold leading-[1.5]">{resultCopy.line}</p>
              <p className="mt-2 text-sm leading-[1.55] text-[#b9c7db]">{resultCopy.detail}</p>
              {completed > 0 && (
                <button type="button" onClick={() => setAnswers({})} className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-white/75 underline underline-offset-4 hover:text-white">
                  <RotateCcw size={13} /> Reset assessment
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f0effa] px-6 py-20 md:px-[4.8vw] lg:py-28" aria-labelledby="conditions-title">
        <div className="grid gap-10 lg:grid-cols-[.72fr_1.28fr] lg:gap-[8vw]">
          <div>
            <Kicker>Readiness output</Kicker>
            <h2 id="conditions-title" className="mt-5 font-display text-[clamp(40px,5vw,72px)] font-semibold leading-[.97] tracking-[-.08em]">Resolve the conditions, not the score.</h2>
            <p className="mt-6 text-sm leading-[1.65] text-[#536887]">The output is an operating-condition register. It records the gap, evidence required, accountable owner and reassessment date.</p>
          </div>
          <div className="border-t border-[#9eabc0]">
            {unresolved.map((condition) => (
              <div key={condition.id} className="grid gap-2 border-b border-[#b9c4d5] py-5 sm:grid-cols-[160px_1fr]">
                <strong className="text-sm">{condition.title}</strong>
                <p className="text-sm leading-[1.6] text-[#405777]">{condition.resolve}</p>
              </div>
            ))}
            {unresolved.length === 0 && (
              <div className="flex items-start gap-3 border-b border-[#b9c4d5] py-6">
                <Check className="mt-0.5 text-[#16805f]" size={18} />
                <p className="text-sm font-semibold leading-[1.6]">No readiness condition remains open. Preserve the evidence and carry the defined scope into delivery.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 md:px-[4.8vw] lg:py-24" aria-labelledby="basis-title">
        <div className="grid gap-10 lg:grid-cols-[.72fr_1.28fr] lg:gap-[8vw]">
          <div>
            <Kicker>Method basis</Kicker>
            <h2 id="basis-title" className="mt-5 font-display text-[clamp(38px,4.8vw,68px)] font-semibold leading-[.97] tracking-[-.08em]">Proprietary method. Public evidence.</h2>
          </div>
          <div>
            <div className="border-l-4 border-[hsl(var(--brand-pink))] bg-[#f3f5f8] p-5 text-sm leading-[1.65] text-[#405777]">
              <strong className="text-[#102957]">Cognirise proprietary content:</strong> the six-condition structure, answer definitions, blocking logic, Proceed / Prepare / Stop decisions and operating-condition register are the Cognirise Agentic Operations Readiness Framework. They are not presented as requirements of the sources below.
            </div>
            <p className="mt-6 text-xs leading-[1.6] text-[#647491]">External source review: 10 September 2026. Applicability depends on jurisdiction, sector, system classification and intended use.</p>
            <ul className="mt-5 border-t border-[#cbd3e1]">
              {SOURCES.map((source) => (
                <li key={source.href} className="border-b border-[#cbd3e1] py-5">
                  <a href={source.href} target="_blank" rel="noreferrer" className="text-sm font-bold underline underline-offset-4">{source.label}</a>
                  <p className="mt-2 text-xs leading-[1.55] text-[#647491]">{source.use}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-[#102957] px-6 py-20 text-white md:px-[4.8vw] lg:py-28">
        <Kicker inverse>From decision to delivery</Kicker>
        <h2 className="mt-6 max-w-[1000px] font-display text-[clamp(44px,6.5vw,96px)] font-semibold leading-[.92] tracking-[-.09em]">Prepare what is missing. Then earn the right to operate.</h2>
        <p className="mt-7 max-w-[680px] text-[17px] leading-[1.6] text-[#d6deed]">A readiness decision defines whether the workflow should enter delivery. IDAO builds and proves the capability; Agent Authority governs each live handover.</p>
        <div className="mt-9 flex flex-wrap gap-4">
          <BrandButton href="/methodologies/idao" variant="inverse">Explore IDAO</BrandButton>
          <BrandButton href="/methodologies/agent-authority-model" variant="inverse">Set Agent Authority</BrandButton>
        </div>
      </section>
    </article>
  );
}