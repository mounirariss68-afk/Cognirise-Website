import React, { useRef, useState } from "react";
import type { SetProveHoldGuardrailsContent } from "@workspace/api-zod";
import { MarkdownInline } from "./MarkdownInline";

type Action = SetProveHoldGuardrailsContent["actions"][number];
type Phase = SetProveHoldGuardrailsContent["overview"]["phases"][number];

const phaseStyle: Record<Action["phase"], { accent: string; label: string }> = {
  set: { accent: "var(--gf-accent-violet)", label: "Set" },
  prove: { accent: "var(--gf-accent)", label: "Prove" },
  hold: { accent: "var(--gf-accent-coral)", label: "Hold" },
};

export function SetProveHoldActionMap({
  phases,
  actions,
}: {
  phases: SetProveHoldGuardrailsContent["overview"]["phases"];
  actions: Action[];
}) {
  const [selectedActionId, setSelectedActionId] = useState(actions[0]?.id ?? "");
  const actionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedAction = actions.find((action) => action.id === selectedActionId) ?? actions[0];

  if (!selectedAction) return null;

  const selectByIndex = (index: number) => {
    const next = (index + actions.length) % actions.length;
    setSelectedActionId(actions[next].id);
    actionRefs.current[next]?.focus();
  };

  const onActionKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      selectByIndex(index + 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      selectByIndex(index - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      selectByIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      selectByIndex(actions.length - 1);
    }
  };

  const orderedActions = (phase: Phase) =>
    phase.actionIds
      .map((id) => actions.find((action) => action.id === id))
      .filter((action): action is Action => Boolean(action));

  return (
    <div className="space-y-12" data-guardrails-tool="action-map">
      <div className="relative grid gap-10 lg:grid-cols-3" aria-label="Set, Prove and Hold action map">
        <div className="pointer-events-none absolute left-[31%] right-[31%] top-[3rem] hidden border-t border-[var(--gf-border)] lg:block" aria-hidden="true" />
        {phases.map((phase) => {
          const phaseActions = orderedActions(phase);
          const style = phaseStyle[phase.id];
          const layoutClass = phase.mode === "pre-launch-tests"
            ? "grid grid-cols-2 gap-4"
            : "flex flex-col gap-4";

          return (
            <section
              key={phase.id}
              className="relative min-w-0"
              aria-labelledby={`guardrails-phase-${phase.id}`}
            >
              <div className="mb-8 relative z-10">
                <span
                  className="inline-block text-[11px] font-bold uppercase tracking-[0.16em] mb-4"
                  style={{ color: style.accent }}
                >
                  {phase.mode === "sequential" ? "In order" : phase.mode === "pre-launch-tests" ? "Four tests" : "In parallel"}
                </span>
                <h3 id={`guardrails-phase-${phase.id}`} className="font-display text-[32px] font-semibold tracking-tight text-[var(--gf-ink)] leading-none">
                  {phase.title}
                </h3>
                <p className="mt-3 text-[14px] font-medium text-[var(--gf-ink-muted)]">
                  {phase.caption}
                </p>
              </div>

              <div className={`relative ${layoutClass}`}>
                {phase.mode === "sequential" && (
                  <span className="pointer-events-none absolute bottom-8 left-6 top-8 border-l border-[var(--gf-border)]" aria-hidden="true" />
                )}
                {phase.mode === "concurrent" && (
                  <span className="pointer-events-none absolute bottom-8 left-6 top-8 border-l border-dotted" style={{ borderColor: style.accent }} aria-hidden="true" />
                )}
                {phaseActions.map((action) => {
                  const index = actions.findIndex((item) => item.id === action.id);
                  const selected = selectedAction.id === action.id;
                  return (
                    <button
                      key={action.id}
                      ref={(element) => { actionRefs.current[index] = element; }}
                      type="button"
                      data-guardrails-action={action.id}
                      aria-pressed={selected}
                      aria-controls="guardrails-action-detail"
                      onClick={() => setSelectedActionId(action.id)}
                      onKeyDown={(event) => onActionKeyDown(event, index)}
                      className={`group relative z-10 flex min-h-[4rem] min-w-0 ${phase.mode === "pre-launch-tests" ? "flex-col items-start gap-3" : "items-center gap-4"} p-4 text-left transition-colors duration-300 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--gf-accent)] focus-visible:outline-offset-2 overflow-hidden bg-[var(--gf-surface)]`}
                      style={{
                        backgroundColor: selected ? "var(--gf-bg)" : "var(--gf-surface)",
                        boxShadow: selected ? `inset 3px 0 0 ${style.accent}, 0 4px 20px rgba(16,41,87,0.06)` : "inset 1px 0 0 var(--gf-border)",
                      }}
                    >
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center font-display text-[14px] font-bold transition-transform duration-300"
                        style={{ color: selected ? style.accent : "var(--gf-ink-muted)" }}
                        aria-hidden="true"
                      >
                        {action.order}
                      </span>
                      <span className={`min-w-0 text-[16px] font-medium leading-snug transition-colors ${selected ? "text-[var(--gf-ink)]" : "text-[var(--gf-ink-muted)] group-hover:text-[var(--gf-ink)]"}`}>
                        <MarkdownInline text={action.title} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <section
        id="guardrails-action-detail"
        data-guardrails-action-detail={selectedAction.id}
        aria-live="polite"
        aria-labelledby="guardrails-action-detail-title"
        className="pt-10 border-t border-[var(--gf-border)] mt-12"
      >
        <div className="mb-8 flex flex-wrap items-center gap-3 relative z-10">
          <span className="text-[12px] font-bold uppercase tracking-[0.14em]" style={{ color: phaseStyle[selectedAction.phase].accent }}>
            {phaseStyle[selectedAction.phase].label}
          </span>
          <span className="text-[12px] uppercase tracking-[0.14em] text-[var(--gf-ink-muted)] border-l border-[var(--gf-border)] pl-3">Action {selectedAction.order} of 4</span>
        </div>
        <div className="grid gap-12 lg:gap-16 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0">
            <h3 id="guardrails-action-detail-title" className="font-display text-[32px] font-semibold leading-[1.1] tracking-tight text-[var(--gf-ink)] mb-6">
              <MarkdownInline text={selectedAction.title} />
            </h3>
            <p className="text-[20px] font-medium leading-[1.5] text-[var(--gf-ink)] text-balance">
              <MarkdownInline text={selectedAction.statement} />
            </p>
            <ul className="mt-8 space-y-4">
              {selectedAction.explanation.map((item) => (
                <li key={item} className="flex gap-4 text-[17px] leading-[1.6] text-[var(--gf-ink-muted)]">
                  <span className="mt-2.5 h-[5px] w-[5px] shrink-0 rounded-full" style={{ backgroundColor: phaseStyle[selectedAction.phase].accent }} aria-hidden="true" />
                  <MarkdownInline text={item} />
                </li>
              ))}
            </ul>
          </div>
          <aside className="space-y-8 pt-2">
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--gf-ink-muted)]">Owner</h4>
              <p className="mt-2 text-[16px] font-medium text-[var(--gf-ink)]"><MarkdownInline text={selectedAction.owner} /></p>
            </div>
            <div className="border-t border-[var(--gf-border)] pt-6">
              <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--gf-ink-muted)]">{selectedAction.outputOrCadence.label}</h4>
              <p className="mt-2 text-[16px] leading-[1.5] text-[var(--gf-ink)]"><MarkdownInline text={selectedAction.outputOrCadence.value} /></p>
            </div>
            <div className="border-t border-[var(--gf-border)] pt-6">
              <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--gf-accent-coral)]">Failure condition</h4>
              <p className="mt-2 text-[15px] leading-[1.6] text-[var(--gf-ink-muted)]"><MarkdownInline text={selectedAction.failureCondition} /></p>
            </div>
            <blockquote className="border-t border-[var(--gf-border)] pt-6 text-[15px] italic leading-[1.6] text-[var(--gf-ink-muted)]">
              <span className="mb-2 block text-[11px] not-italic font-bold uppercase tracking-[0.15em] text-[var(--gf-ink-muted)]">Callout</span>
              <MarkdownInline text={selectedAction.callout} />
            </blockquote>
          </aside>
        </div>
      </section>
    </div>
  );
}