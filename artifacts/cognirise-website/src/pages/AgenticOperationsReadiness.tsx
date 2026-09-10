import { ArrowRight, ArrowDown, Check, Printer, RotateCcw } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { useDynamicMetadata } from "@/lib/metadata";
import { MethodologyRelationship } from "@/components/MethodologyRelationship";
import { PulseImage } from "@/components/ui/pulse-image";
import { useEffect, useMemo, useState } from "react";
import {
import { ArrowRight, Check, Copy, Printer, RotateCcw, Save, Trash2 } from "lucide-react";
import {

type Answer = ReadinessAnswers[keyof ReadinessAnswers];

type SavedState = Pick<ReadinessAssessment, "id" | "createdAt" | "expiresAt">;
type ConditionRecord = { evidence: string; owner: string; reassessmentDate: string };

const EMPTY_CONDITION_RECORD: ConditionRecord = { evidence: "", owner: "", reassessmentDate: "" };

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
  const [answers, setAnswers] = useState<Partial<ReadinessAnswers>>({});
  const [workflowScope, setWorkflowScope] = useState("");
  const [governanceReview, setGovernanceReview] = useState("");
  const [conditionRecords, setConditionRecords] = useState<Partial<Record<(typeof CONDITIONS)[number]["id"], ConditionRecord>>>({});
  const [requestedSavedId] = useState(() => getSavedReadinessId(window.location.search));
  const [saved, setSaved] = useState<SavedState | null>(null);
  const [isLoadingSaved, setIsLoadingSaved] = useState(Boolean(requestedSavedId));
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const id = requestedSavedId;
    if (!id) return;
    const controller = new AbortController();
    getReadinessAssessment(id, { signal: controller.signal })
      .then((record) => {
        setAnswers(record.answers);
        setSaved(record);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadError(error instanceof Error ? error.message : "The saved decision could not be reopened.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingSaved(false);
      });
    return () => controller.abort();
  }, [requestedSavedId]);

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
  const assessmentComplete = completed === CONDITIONS.length;
  const completeAnswers = isCompleteReadinessAnswers(answers) ? answers : null;
  const assessmentLocked = isLoadingSaved || isSaving || isDeleting;
  const updateConditionRecord = (id: (typeof CONDITIONS)[number]["id"], field: keyof ConditionRecord, value: string) => {
    setConditionRecords((current) => ({
      ...current,
      [id]: { ...(current[id] ?? EMPTY_CONDITION_RECORD), [field]: value },
    }));
  };
  const updateAnswer = (id: (typeof CONDITIONS)[number]["id"], answer: Answer) => {
    setAnswers((current) => ({ ...current, [id]: answer }));
    if (saved) {
      setSaved(null);
      replaceReadinessUrl(null);
    }
    setStatusMessage(null);
    setLoadError(null);
  };
  const resetAssessment = () => {
    setAnswers({});
    setWorkflowScope("");
    setGovernanceReview("");
    setConditionRecords({});
    setSaved(null);
    replaceReadinessUrl(null);
    setStatusMessage(null);
    setLoadError(null);
  };
  const printReadinessRecord = () => {
    const printClass = "readiness-record-printing";
    const cleanup = () => document.body.classList.remove(printClass);
    document.body.classList.add(printClass);
    window.addEventListener("afterprint", cleanup, { once: true });
    window.requestAnimationFrame(() => window.print());
  };
  const saveAssessment = async () => {
    if (!completeAnswers || isSaving) return;
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const record = await createReadinessAssessment({ answers: completeAnswers });
      storeReadinessDeleteToken(record.id, record.deleteToken);
      setSaved(record);
      replaceReadinessUrl(record.id);
      setStatusMessage("Decision saved. Copy the link to share this fixed record.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "The decision could not be saved.");
    } finally {
      setIsSaving(false);
    }
  };
  const copyShareLink = async () => {
    if (!saved) return;
    try {
      await navigator.clipboard.writeText(readinessShareUrl(saved.id));
      setStatusMessage("Share link copied.");
    } catch {
      setStatusMessage("Copy the link from your browser address bar.");
    }
  };
  const deleteSavedAssessment = async () => {
    if (!saved || isDeleting) return;
    const deleteToken = getReadinessDeleteToken(saved.id);
    if (!deleteToken) {
      setStatusMessage("Only the browser that saved this decision can delete it before expiry.");
      return;
    }
    setIsDeleting(true);
    try {
      await deleteReadinessAssessment(saved.id, {
        headers: { "X-Delete-Token": deleteToken },
      });
      forgetReadinessDeleteToken(saved.id);
      setSaved(null);
      replaceReadinessUrl(null);
      setStatusMessage("Saved record deleted. Your selected answers remain on this page.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "The saved record could not be deleted.");
    } finally {
      setIsDeleting(false);
    }
  };
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
    <article className="readiness-page overflow-hidden bg-[#fdfcfb] font-sans text-[#102957] selection:bg-[hsl(var(--brand-pink))] selection:text-white">
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
      <section className="px-6 pb-16 md:px-[4.8vw]">
        <PulseImage
          src="/images/cognirise/method-operations-readiness-clean.jpg"
          alt="Cinematic raster composition showing a bounded operational workflow"
          className="w-full h-[55vh] object-cover rounded-sm shadow-md"
          fallbackColor="#102957"
        />
      </section>

      <MethodologyRelationship
        startHereWhen={<>You have a specific, bounded workflow and need to confirm it has the necessary stability, observability, and economic conditions before agent delivery begins.</>}
        decision={<>Is this workflow ready for agents, and what must change first?</>}
        output={<>A Proceed, Prepare or Stop decision accompanied by a register of unresolved operating conditions, their owners, and evidence gaps.</>}
        connectsToIdao={<>Produces Proceed, Prepare or Stop for one bounded workflow. Missing conditions become work within the appropriate IDAO stage, and the readiness test repeats when scope changes.</>}
        connectsToAuthority={<>Establishes whether the workflow can operate at all. Agent Authority separately determines how independently each consequential handover inside the workflow may act.</>}
        reassessWhen={<>The workflow scope changes, the underlying tool access permissions change, or unresolved conditions pass their reassessment date.</>}
        doesNotDecide={<>Which workflow is most valuable (use AI Use-Case Prioritization) or the specific rights of a human supervisor (use Human-Agent Operating Model).</>}
      />

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
            <div className="mt-10 rounded-sm border border-[#cbd3e1] bg-white p-6 shadow-sm">
              <strong className="block text-[10px] uppercase tracking-wider text-[#647491]">6 Conditions feed into:</strong>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="border-t-4 border-[#16805f] bg-[#16805f]/10 p-4">
                  <strong className="text-xs text-[#16805f]">Proceed</strong>
                  <p className="mt-2 text-[11px] text-[#405777]">Enter or update the responsible IDAO stage with the evidence recorded.</p>
                </div>
                <div className="border-t-4 border-[#b5367d] bg-[#b5367d]/10 p-4">
                  <strong className="text-xs text-[#b5367d]">Prepare</strong>
                  <p className="mt-2 text-[11px] text-[#405777]">Turn missing conditions into work at the appropriate IDAO stage, then repeat the test.</p>
                </div>
                <div className="border-t-4 border-[#d34f38] bg-[#d34f38]/10 p-4">
                  <strong className="text-xs text-[#d34f38]">Stop</strong>
                  <p className="mt-2 text-[11px] text-[#405777]">Do not enter IDAO delivery for this scope; redefine it, resolve the blocker or stop.</p>
                </div>
              </div>
              <ArrowDown className="mx-auto my-4 text-[#cbd3e1]" aria-hidden="true" />
              <div className="rounded-sm border border-[hsl(var(--brand-coral))] bg-[#fff0f2] p-4 text-center">
                <strong className="block text-[10px] uppercase tracking-wider text-[#102957]">Separate Agent Authority decision</strong>
                <p className="mt-1 text-[11px] text-[#536887]">For any selected consequential handover, set how independently it may act.</p>
              </div>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <a href="/methodologies/idao" className="border border-[#cbd3e1] bg-white p-5 hover:border-[#102957]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#647491]">If it can proceed</span>
                <strong className="mt-2 block font-display text-xl tracking-[-.05em]">Deliver through IDAO →</strong>
              </a>
              <a href="/methodologies/agent-authority-model" className="border border-[#cbd3e1] bg-white p-5 hover:border-[#102957]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#647491]">Before live handover</span>
                <strong className="mt-2 block font-display text-xl tracking-[-.05em]">Set Agent Authority →</strong>
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

        <div className="mt-12 border border-[#cbd3e1] bg-[#f3f5f8] p-5 md:p-7">
          <label htmlFor="workflow-scope" className="text-[10px] font-bold uppercase tracking-[.12em] text-[#102957]">Workflow scope</label>
          <p className="mt-2 max-w-3xl text-xs leading-[1.55] text-[#647491]">Name the bounded workflow, trigger, start and end point, business area and material exclusions. This stays in this browser session and is only included when you print.</p>
          <textarea
            id="workflow-scope"
            data-testid="input-workflow-scope"
            value={workflowScope}
            onChange={(event) => setWorkflowScope(event.target.value)}
            rows={3}
            placeholder="Example: Customer refund requests from approved intake through payment instruction; excludes suspected fraud and refunds above the delegated limit."
            className="mt-4 w-full resize-y border border-[#b9c4d5] bg-white p-3 text-sm leading-[1.55] text-[#102957] outline-none focus:border-[#102957]"
          />
        </div>

        {(isLoadingSaved || loadError || saved) && (
          <div className="mt-8 border border-[#cbd3e1] bg-[#f3f5f8] p-5" role="status">
            {isLoadingSaved && <p className="text-sm font-semibold">Reopening the saved decision…</p>}
            {loadError && (
              <>
                <p className="text-sm font-semibold text-[#b43b2b]">This saved decision is unavailable or has expired.</p>
                <p className="mt-1 text-xs leading-[1.55] text-[#647491]">You can still complete and save a new assessment below.</p>
              </>
            )}
            {saved && (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">Saved decision reopened</p>
                  <p className="mt-1 text-xs leading-[1.55] text-[#647491]">
                    This fixed record expires {new Date(saved.expiresAt).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}. It contains only the six selected answers and their derived outcome.
                  </p>
                </div>
                <button type="button" onClick={copyShareLink} className="inline-flex items-center gap-2 border border-[#102957] px-4 py-2 text-xs font-bold hover:bg-[#102957] hover:text-white">
                  <Copy size={14} /> Copy share link
                </button>
              </div>
            )}
          </div>
        )}

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
                         disabled={assessmentLocked}
                         data-readiness-answer={`${condition.id}:${answer}`}
                         onClick={() => updateAnswer(condition.id, answer)}
                         className={`grid min-h-14 grid-cols-[82px_1fr] items-start gap-3 border p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--brand-coral))] disabled:cursor-wait disabled:opacity-70 ${
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

        <div data-readiness-decision className="sticky bottom-4 z-20 mt-8 border border-white/20 bg-[#071936] p-6 text-white shadow-[0_18px_60px_rgba(7,25,54,.25)] md:p-8" aria-live="polite">
          <div className="grid gap-6 lg:grid-cols-[.6fr_1.4fr] lg:items-center">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[.14em] text-white/55">Current decision · {completed}/6 answered</p>
              <p className="mt-2 font-display text-[clamp(42px,5vw,70px)] font-semibold leading-none tracking-[-.07em]" style={{ color: resultCopy.color }}>{resultCopy.label}</p>
            </div>
            <div className="border-l-2 pl-5" style={{ borderColor: resultCopy.color }}>
              <p className="font-semibold leading-[1.5]">{resultCopy.line}</p>
              <p className="mt-2 text-sm leading-[1.55] text-[#b9c7db]">{resultCopy.detail}</p>
              {completed > 0 && (
                <button data-testid="button-reset-assessment" type="button" disabled={assessmentLocked} onClick={resetAssessment} className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-white/75 underline underline-offset-4 hover:text-white disabled:cursor-wait disabled:opacity-50">
                  <RotateCcw size={13} /> Reset assessment
                </button>
              )}
            </div>
          </div>
          <div className="mt-6 border-t border-white/15 pt-5">
            <div className="flex flex-wrap items-center gap-3">
              {!saved && (
                <button
                  type="button"
                  data-readiness-save
                  disabled={!completeAnswers || isSaving}
                  onClick={saveAssessment}
                  className="inline-flex items-center gap-2 bg-white px-4 py-2.5 text-xs font-bold text-[#102957] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Save size={14} /> {isSaving ? "Saving…" : "Save this decision"}
                </button>
              )}
              {saved && (
                <>
                  <button type="button" onClick={copyShareLink} className="inline-flex items-center gap-2 bg-white px-4 py-2.5 text-xs font-bold text-[#102957]">
                    <Copy size={14} /> Copy share link
                  </button>
                  {getReadinessDeleteToken(saved.id) && (
                    <button data-testid="button-delete-readiness-record" type="button" disabled={isDeleting} onClick={deleteSavedAssessment} className="inline-flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-white/75 underline underline-offset-4 hover:text-white disabled:opacity-50">
                      <Trash2 size={14} /> {isDeleting ? "Deleting…" : "Delete saved record"}
                    </button>
                  )}
                </>
              )}
              <p className="text-xs leading-[1.5] text-[#b9c7db]">
                {completeAnswers
                  ? "Saves fixed choices only—workflow scope, evidence notes, owners and dates stay in this browser. Records expire after 90 days."
                  : "Answer all six conditions to save a shareable decision."}
              </p>
            </div>
            {statusMessage && <p className="mt-3 text-xs font-semibold text-white" role="status">{statusMessage}</p>}
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
            {unresolved.map((condition) => {
              const record = conditionRecords[condition.id] ?? EMPTY_CONDITION_RECORD;
              return (
              <div key={condition.id} data-readiness-unresolved={condition.id} className="grid gap-4 border-b border-[#b9c4d5] py-6 sm:grid-cols-[160px_1fr]">
                <strong className="text-sm">{condition.title}</strong>
                <div>
                  <p className="text-sm leading-[1.6] text-[#405777]">{condition.resolve}</p>
                  {assessmentComplete && (
                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#536887] md:col-span-2">
                        Evidence and governance note
                        <textarea data-testid={`input-evidence-${condition.id}`} value={record.evidence} onChange={(event) => updateConditionRecord(condition.id, "evidence", event.target.value)} rows={2} className="mt-2 block w-full resize-y border border-[#b9c4d5] bg-white p-3 text-sm font-normal normal-case tracking-normal text-[#102957] outline-none focus:border-[#102957]" placeholder="Evidence held, evidence still required, and the governance review needed" />
                      </label>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#536887]">
                        Accountable owner
                        <input data-testid={`input-owner-${condition.id}`} value={record.owner} onChange={(event) => updateConditionRecord(condition.id, "owner", event.target.value)} className="mt-2 block w-full border border-[#b9c4d5] bg-white p-3 text-sm font-normal normal-case tracking-normal text-[#102957] outline-none focus:border-[#102957]" placeholder="Name or role" />
                      </label>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#536887]">
                        Reassessment date
                        <input data-testid={`input-reassessment-${condition.id}`} type="date" value={record.reassessmentDate} onChange={(event) => updateConditionRecord(condition.id, "reassessmentDate", event.target.value)} className="mt-2 block w-full border border-[#b9c4d5] bg-white p-3 text-sm font-normal normal-case tracking-normal text-[#102957] outline-none focus:border-[#102957]" />
                      </label>
                    </div>
                  )}
                </div>
              </div>
            )})}
            {unresolved.length === 0 && (
              <div className="flex items-start gap-3 border-b border-[#b9c4d5] py-6">
                <Check className="mt-0.5 text-[#16805f]" size={18} />
                <p className="text-sm font-semibold leading-[1.6]">No readiness condition remains open. Preserve the evidence and carry the defined scope into delivery.</p>
              </div>
            )}
          </div>
        </div>
        {assessmentComplete && (
          <div className="mt-10 border-t border-[#9eabc0] pt-7">
            <label htmlFor="governance-review" className="text-[10px] font-bold uppercase tracking-[.12em] text-[#102957]">Overall governance review</label>
            <textarea id="governance-review" data-testid="input-governance-review" value={governanceReview} onChange={(event) => setGovernanceReview(event.target.value)} rows={3} className="mt-3 block w-full resize-y border border-[#b9c4d5] bg-white p-3 text-sm text-[#102957] outline-none focus:border-[#102957]" placeholder="Decision forum, reviewers, evidence location, approval constraints or next review point" />
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <button data-testid="button-print-readiness-record" type="button" onClick={printReadinessRecord} className="inline-flex items-center gap-2 bg-[#102957] px-5 py-3 text-sm font-bold text-white hover:bg-[hsl(var(--brand-pink))]">
                <Printer size={16} /> Print or save record
              </button>
              <p className="max-w-xl text-xs leading-[1.55] text-[#647491]">Your browser’s print dialog can print the full record or save it as a PDF. Workflow scope, evidence notes, owners and dates remain local even when the fixed-choice decision is shared.</p>
            </div>
          </div>
        )}
      </section>

      {assessmentComplete && (
        <section className="readiness-print-record hidden" aria-label="Readiness assessment record">
          <p className="print-kicker">Cognirise · Agentic Operations Readiness Framework</p>
          <div className="print-heading">
            <div><h1>Workflow readiness record</h1><p>{workflowScope || "Workflow scope not recorded"}</p></div>
            <div className="print-decision"><span>Decision</span><strong>{resultCopy.label}</strong></div>
          </div>
          <p className="print-summary">{resultCopy.line} {resultCopy.detail}</p>
          <h2>Six operating conditions</h2>
          {CONDITIONS.map((condition, index) => {
            const answer = answers[condition.id] as Answer;
            const record = conditionRecords[condition.id] ?? EMPTY_CONDITION_RECORD;
            return (
              <div className="print-condition" key={condition.id}>
                <div><span>0{index + 1}</span><strong>{condition.title}</strong></div>
                <div><b>{answer === "ready" ? "Ready" : answer === "prepare" ? "Prepare" : "Stop"}</b><p>{condition[answer]}</p></div>
                {answer !== "ready" && <div className="print-resolution"><p><b>Unresolved condition:</b> {condition.resolve}</p><p><b>Evidence / governance note:</b> {record.evidence || "Not recorded"}</p><p><b>Accountable owner:</b> {record.owner || "Not assigned"} &nbsp; <b>Reassess:</b> {record.reassessmentDate || "Not scheduled"}</p></div>}
              </div>
            );
          })}
          <div className="print-governance"><h2>Governance review</h2><p>{governanceReview || "No overall governance review note recorded."}</p></div>
          <p className="print-links">Next methods: IDAO — {window.location.origin}/methodologies/idao &nbsp;·&nbsp; Agent Authority — {window.location.origin}/methodologies/agent-authority-model</p>
          <p className="print-privacy">Generated locally from this browser session. Free-text scope, evidence and ownership details were not submitted to Cognirise or analytics.</p>
        </section>
      )}

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
