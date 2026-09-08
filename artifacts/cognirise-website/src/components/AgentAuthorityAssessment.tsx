import { useEffect, useMemo, useRef, useState } from "react";
import {
  type AssessmentData,
  type HScore,
  type Oversight,
  type RScore,
  OVERSIGHT_LABELS,
  OVERSIGHT_ORDER,
  REACH_LABELS,
  REVERSIBILITY_LABELS,
  evaluateAssessment,
  getAssessmentErrors,
  getCeiling,
  getEBand,
  isRequestedAboveCeiling,
  isRoleVague,
} from "@/lib/agent-authority";

const STEP_LABELS = [
  "Handover",
  "Reversibility",
  "Reach",
  "Requested authority",
  "Owner",
  "Evidence and demotion",
];

function OptionButton({
  selected,
  title,
  detail,
  onClick,
}: {
  selected: boolean;
  title: string;
  detail?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`w-full border-2 p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[hsl(var(--brand-coral))]/40 ${
        selected
          ? "border-[#102957] bg-[#f0effa]"
          : "border-[#cbd3e1] hover:border-[hsl(var(--brand-violet))]"
      }`}
    >
      <strong className="block text-[#102957]">{title}</strong>
      {detail && <span className="mt-1 block text-[13px] leading-[1.45] text-[#536887]">{detail}</span>}
    </button>
  );
}

export function AgentAuthorityAssessment() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<AssessmentData>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [changesThing, setChangesThing] = useState<"yes" | "no">();
  const [fixesOutcome, setFixesOutcome] = useState<"yes" | "no">();
  const assessmentRef = useRef<HTMLElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);

  const eBand = data.rScore && data.hScore ? getEBand(data.rScore, data.hScore) : undefined;
  const ceiling = eBand ? getCeiling(eBand) : undefined;
  const aboveCeiling = Boolean(
    ceiling &&
    data.requestedOversight &&
    isRequestedAboveCeiling(data.requestedOversight, ceiling),
  );
  const result = step === 7 ? evaluateAssessment(data) : null;

  useEffect(() => {
    stepHeadingRef.current?.focus({ preventScroll: true });
  }, [step]);

  const update = (values: Partial<AssessmentData>) => {
    setData((current) => ({ ...current, ...values }));
    setErrors([]);
  };

  const validateStep = () => {
    const stepErrors: string[] = [];
    if (step === 1) {
      if (!data.handoverDescription?.trim()) stepErrors.push("Describe the one handover being assessed.");
      if (!data.handoverType) stepErrors.push("Answer the ordered classification questions.");
    }
    if (step === 2 && !data.rScore) stepErrors.push("Choose one reversibility answer. Blank is not an answer.");
    if (step === 3 && !data.hScore) stepErrors.push("Choose who is affected. Blank is not an answer.");
    if (step === 4) {
      if (!data.requestedOversight) {
        stepErrors.push("Choose the authority requested for this handover.");
      } else if (
        (ceiling === "on-loop" || data.requestedOversight === "on-loop") &&
        !data.interventionWindow?.trim()
      ) {
        stepErrors.push("State the intervention window for on-the-loop operation.");
      }
      if (aboveCeiling && !data.artefact?.trim()) {
        stepErrors.push("Name the approved artefact or control carrying authority above the ceiling.");
      }
    }
    if (step === 5) {
      if (!data.accountableRole?.trim()) stepErrors.push("Name the accountable owner by role.");
      else if (isRoleVague(data.accountableRole)) stepErrors.push("A team or function name is not an accountable role.");
    }
    if (step === 6) {
      if (!data.promotionEvidence?.trim()) stepErrors.push("State the evidence required before authority can climb.");
      if (!data.automaticDemotion?.trim()) stepErrors.push("State the condition that automatically demotes authority.");
    }
    setErrors(stepErrors);
    if (stepErrors.length === 0) setStep((current) => current + 1);
  };

  const reset = () => {
    setData({});
    setErrors([]);
    setChangesThing(undefined);
    setFixesOutcome(undefined);
    setStep(1);
    assessmentRef.current?.scrollIntoView({ block: "start" });
  };

  const progressText = useMemo(
    () => step < 7 ? `Question ${step} of 6: ${STEP_LABELS[step - 1]}` : "Assessment result",
    [step],
  );

  return (
    <section
      id="assessment"
      ref={assessmentRef}
      aria-labelledby="assessment-title"
      className="scroll-mt-24 bg-[#eef0f5] px-6 py-20 md:px-[4.8vw] lg:py-28"
    >
      <div className="mx-auto max-w-[940px]">
        <div className="mb-10 grid gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-end">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[hsl(var(--brand-pink))]">
              Six questions · one handover
            </p>
            <h2
              id="assessment-title"
              className="mt-4 max-w-[760px] font-display text-[clamp(38px,5vw,68px)] font-semibold leading-[0.98] tracking-[-0.075em]"
            >
              Set an authority ceiling your operation can defend.
            </h2>
          </div>
          <p className="text-[14px] leading-[1.6] text-[#536887]">
            Nothing is sent to Cognirise or saved in your browser. Assess one handover, copy the control brief,
            then restart for every other handover the same agent makes.
          </p>
        </div>

        <div className="relative border border-[#b9c4d5] bg-white p-6 shadow-[10px_12px_0_rgba(16,41,87,0.08)] md:p-10">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[hsl(var(--brand-violet))] via-[hsl(var(--brand-pink))] to-[hsl(var(--brand-coral))]" />

          {step < 7 && (
            <>
              <div className="mb-3 flex items-center justify-between gap-4 text-[11px] font-bold uppercase tracking-[0.1em] text-[#647491]">
                <span>{progressText}</span>
                <span>{step}/6</span>
              </div>
              <div className="mb-9 flex gap-2" aria-hidden="true">
                {STEP_LABELS.map((label, index) => (
                  <span
                    key={label}
                    className={`h-1.5 flex-1 ${index + 1 <= step ? "bg-[hsl(var(--brand-pink))]" : "bg-[#e2e7ef]"}`}
                  />
                ))}
              </div>
            </>
          )}

          <div aria-live="polite">
            {step === 1 && (
              <div>
                <h3 ref={stepHeadingRef} tabIndex={-1} className="font-display text-[26px] font-semibold tracking-[-0.04em]">
                  1. What is handed over?
                </h3>
                <p className="mb-6 mt-2 text-sm leading-[1.55] text-[#536887]">
                  Ask in order. First yes wins. This classifies the handover, not the agent.
                </p>
                <label className="mb-6 block text-sm font-bold">
                  Describe the exact output
                  <textarea
                    value={data.handoverDescription ?? ""}
                    onChange={(event) => update({ handoverDescription: event.target.value })}
                    placeholder="For example: Rebooks a disrupted passenger and issues a boarding pass."
                    className="mt-2 min-h-24 w-full resize-y border-2 border-[#cbd3e1] p-3 font-normal focus:border-[#102957] focus:outline-none"
                  />
                </label>
                <fieldset>
                  <legend className="mb-3 text-sm font-bold">
                    After it runs, is any record, system, or physical thing different?
                  </legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <OptionButton
                      selected={changesThing === "yes"}
                      title="Yes"
                      detail="First yes: this is an Action handover."
                      onClick={() => {
                        setChangesThing("yes");
                        setFixesOutcome(undefined);
                        update({ handoverType: "Action" });
                      }}
                    />
                    <OptionButton
                      selected={changesThing === "no"}
                      title="No"
                      detail="Continue to the next classification question."
                      onClick={() => {
                        setChangesThing("no");
                        setFixesOutcome(undefined);
                        update({ handoverType: undefined });
                      }}
                    />
                  </div>
                </fieldset>
                {changesThing === "no" && (
                  <fieldset className="mt-6 border-t border-[#dce2eb] pt-6">
                    <legend className="mb-3 text-sm font-bold">
                      Does it fix an outcome for a specific case or person that something downstream acts on?
                    </legend>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <OptionButton
                        selected={fixesOutcome === "yes"}
                        title="Yes"
                        detail="First yes: this is a Decision handover."
                        onClick={() => {
                          setFixesOutcome("yes");
                          update({ handoverType: "Decision" });
                        }}
                      />
                      <OptionButton
                        selected={fixesOutcome === "no"}
                        title="No"
                        detail="Neither condition applies: this is a Knowledge handover."
                        onClick={() => {
                          setFixesOutcome("no");
                          update({ handoverType: "Knowledge" });
                        }}
                      />
                    </div>
                  </fieldset>
                )}
                {data.handoverType && (
                  <p className="mt-6 border-l-4 border-[hsl(var(--brand-pink))] bg-[#f8f6fb] p-4 text-sm font-bold" aria-live="polite">
                    Classification: {data.handoverType} handover.
                  </p>
                )}
              </div>
            )}

            {step === 2 && (
              <div>
                <h3 ref={stepHeadingRef} tabIndex={-1} className="font-display text-[26px] font-semibold tracking-[-0.04em]">
                  2. What does it take to undo?
                </h3>
                <p className="mb-6 mt-2 text-sm leading-[1.55] text-[#536887]">
                  Imagine you discover an hour later that the handover was wrong. “None” maps to R1; blank is not an answer.
                </p>
                <div className="space-y-3">
                  {([1, 2, 3, 4] as RScore[]).map((score) => (
                    <OptionButton
                      key={score}
                      selected={data.rScore === score}
                      title={`R${score}`}
                      detail={REVERSIBILITY_LABELS[score]}
                      onClick={() => update({ rScore: score })}
                    />
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h3 ref={stepHeadingRef} tabIndex={-1} className="font-display text-[26px] font-semibold tracking-[-0.04em]">
                  3. Who is affected, or would find out?
                </h3>
                <p className="mb-6 mt-2 text-sm leading-[1.55] text-[#536887]">
                  Reach and reversibility are separate axes. The more severe result sets exposure.
                </p>
                <div className="space-y-3">
                  {([1, 2, 3, 4, 5] as HScore[]).map((score) => (
                    <OptionButton
                      key={score}
                      selected={data.hScore === score}
                      title={`H${score}`}
                      detail={REACH_LABELS[score]}
                      onClick={() => update({ hScore: score })}
                    />
                  ))}
                </div>
              </div>
            )}

            {step === 4 && ceiling && (
              <div>
                <h3 ref={stepHeadingRef} tabIndex={-1} className="font-display text-[26px] font-semibold tracking-[-0.04em]">
                  4. What authority do you want?
                </h3>
                <p className="mb-6 mt-2 text-sm leading-[1.55] text-[#536887]">
                  R{data.rScore} and H{data.hScore} produce E{eBand}. The permitted ceiling is{" "}
                  <strong className="text-[#102957]">{OVERSIGHT_LABELS[ceiling]}</strong>.
                </p>
                <div className="space-y-3">
                  {OVERSIGHT_ORDER.map((oversight) => (
                    <OptionButton
                      key={oversight}
                      selected={data.requestedOversight === oversight}
                      title={OVERSIGHT_LABELS[oversight]}
                      onClick={() => update({ requestedOversight: oversight })}
                    />
                  ))}
                </div>
                {(ceiling === "on-loop" || data.requestedOversight === "on-loop") && (
                  <label className="mt-6 block text-sm font-bold">
                    Stated intervention window
                    <input
                      value={data.interventionWindow ?? ""}
                      onChange={(event) => update({ interventionWindow: event.target.value })}
                      placeholder="For example: shorter than released-seat availability."
                      className="mt-2 w-full border-2 border-[#cbd3e1] p-3 font-normal focus:border-[#102957] focus:outline-none"
                    />
                  </label>
                )}
                {aboveCeiling && (
                  <label className="mt-6 block border-l-4 border-[hsl(var(--brand-coral))] bg-[#fff5f1] p-4 text-sm font-bold">
                    Approved artefact or control carrying the extra authority
                    <input
                      value={data.artefact ?? ""}
                      onChange={(event) => update({ artefact: event.target.value })}
                      placeholder="Template, whitelist, rule set, or blocking gate."
                      className="mt-2 w-full border-2 border-[#e7b5a9] bg-white p-3 font-normal focus:border-[#102957] focus:outline-none"
                    />
                    <span className="mt-2 block font-normal leading-[1.45] text-[#704d45]">
                      The above-ceiling design may be valid, but the approved artefact—not the model—must carry that authority.
                    </span>
                  </label>
                )}
              </div>
            )}

            {step === 5 && (
              <div>
                <h3 ref={stepHeadingRef} tabIndex={-1} className="font-display text-[26px] font-semibold tracking-[-0.04em]">
                  5. Who owns this handover?
                </h3>
                <p className="mb-6 mt-2 text-sm leading-[1.55] text-[#536887]">
                  Name the accountable role. “The operations team” is not an answer.
                </p>
                <label className="block text-sm font-bold">
                  Accountable role
                  <input
                    value={data.accountableRole ?? ""}
                    onChange={(event) => update({ accountableRole: event.target.value })}
                    placeholder="Duty Manager, Operations Control Centre"
                    className="mt-2 w-full border-2 border-[#cbd3e1] p-4 text-base font-normal focus:border-[#102957] focus:outline-none"
                  />
                </label>
              </div>
            )}

            {step === 6 && (
              <div>
                <h3 ref={stepHeadingRef} tabIndex={-1} className="font-display text-[26px] font-semibold tracking-[-0.04em]">
                  6. What earns a climb—and what demotes it?
                </h3>
                <p className="mb-6 mt-2 text-sm leading-[1.55] text-[#536887]">
                  Better model performance alone does not grant authority. Approved operational evidence does.
                </p>
                <div className="grid gap-5">
                  <label className="block text-sm font-bold">
                    Promotion evidence
                    <textarea
                      value={data.promotionEvidence ?? ""}
                      onChange={(event) => update({ promotionEvidence: event.target.value })}
                      placeholder="For example: 500 consecutive rebookings with zero disputed reversals."
                      className="mt-2 min-h-28 w-full resize-y border-2 border-[#cbd3e1] p-3 font-normal focus:border-[#102957] focus:outline-none"
                    />
                  </label>
                  <label className="block text-sm font-bold">
                    Automatic-demotion condition
                    <textarea
                      value={data.automaticDemotion ?? ""}
                      onChange={(event) => update({ automaticDemotion: event.target.value })}
                      placeholder="For example: any involuntary downgrade or caused missed connection."
                      className="mt-2 min-h-28 w-full resize-y border-2 border-[#cbd3e1] p-3 font-normal focus:border-[#102957] focus:outline-none"
                    />
                  </label>
                </div>
              </div>
            )}

            {step === 7 && result && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[hsl(var(--brand-pink))]">
                  Calculated control brief
                </p>
                <h3 ref={stepHeadingRef} tabIndex={-1} className="mt-3 font-display text-[32px] font-semibold tracking-[-0.05em]">
                  {result.handoverType} handover · E{result.eBand}
                </h3>
                <p className="mt-2 text-[16px] leading-[1.55] text-[#405777]">{result.handoverDescription}</p>

                <dl className="mt-8 grid border-t border-l border-[#cbd3e1] sm:grid-cols-2">
                  {[
                    ["Reversibility", `R${result.rScore} — ${REVERSIBILITY_LABELS[result.rScore]}`],
                    ["Reach", `H${result.hScore} — ${REACH_LABELS[result.hScore]}`],
                    ["Exposure band", `E${result.eBand}`],
                    ["Permitted ceiling", OVERSIGHT_LABELS[result.ceiling]],
                    ["Requested authority", OVERSIGHT_LABELS[result.requestedOversight]],
                    ["Comparison", result.aboveCeiling ? "Above the ceiling; approved artefact required" : "Within the permitted ceiling"],
                    ["Accountable owner", result.accountableRole],
                    ["Intervention window", result.interventionWindow ?? "Not required at this ceiling"],
                    ["Promotion evidence", result.promotionEvidence],
                    ["Automatic demotion", result.automaticDemotion],
                    ["Additional artefact/control", result.artefactRequired ? result.artefact! : "Not required for the requested authority"],
                  ].map(([term, description]) => (
                    <div key={term} className="border-b border-r border-[#cbd3e1] p-4">
                      <dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#647491]">{term}</dt>
                      <dd className="mt-2 text-sm font-semibold leading-[1.5] text-[#102957]">{description}</dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-8 border-l-4 border-[hsl(var(--brand-violet))] bg-[#f0effa] p-5 text-sm leading-[1.6] text-[#30486d]">
                  <strong className="text-[#102957]">Control instruction.</strong>{" "}
                  Permit this {result.handoverType.toLowerCase()} handover no further than{" "}
                  {OVERSIGHT_LABELS[result.ceiling].toLowerCase()}.{" "}
                  {result.aboveCeiling
                    ? `The requested authority is only valid when carried by the approved ${result.artefact}.`
                    : "The requested authority is within the calculated ceiling."}{" "}
                  The {result.accountableRole} owns promotion evidence and must demote authority automatically when:{" "}
                  {result.automaticDemotion}
                </div>

                <button
                  type="button"
                  onClick={reset}
                  className="mt-8 inline-flex min-h-12 items-center justify-center bg-[#102957] px-6 text-sm font-bold text-white transition-colors hover:bg-[hsl(var(--brand-pink))] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[hsl(var(--brand-coral))]/40"
                >
                  Assess another handover
                </button>
              </div>
            )}
          </div>

          {errors.length > 0 && (
            <div role="alert" className="mt-6 border-l-4 border-[hsl(var(--brand-coral))] bg-[#fff5f1] p-4">
              <strong className="text-sm text-[#102957]">Complete this answer before scoring.</strong>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#704d45]">
                {errors.map((error) => <li key={error}>{error}</li>)}
              </ul>
            </div>
          )}

          {step < 7 && (
            <div className="mt-8 flex items-center justify-between gap-4 border-t border-[#dce2eb] pt-5">
              <button
                type="button"
                onClick={() => {
                  setErrors([]);
                  setStep((current) => Math.max(1, current - 1));
                }}
                disabled={step === 1}
                className="min-h-11 px-2 text-sm font-bold text-[#536887] disabled:opacity-30"
              >
                Back
              </button>
              <div className="flex gap-3">
                <button type="button" onClick={reset} className="min-h-11 px-2 text-sm font-bold text-[#536887]">
                  Restart
                </button>
                <button
                  type="button"
                  onClick={validateStep}
                  className="min-h-11 bg-[#102957] px-6 text-sm font-bold text-white transition-colors hover:bg-[hsl(var(--brand-pink))] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[hsl(var(--brand-coral))]/40"
                >
                  {step === 6 ? "Calculate control brief" : "Continue"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}